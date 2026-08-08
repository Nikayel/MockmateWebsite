/**
 * Role-Based Access Control (RBAC) System for Admin
 *
 * Production-ready admin authentication and authorization.
 * Supports multiple admin roles with granular permissions.
 */

import { adminDb, adminAuth } from "../firebase-admin"
import { Timestamp } from "firebase-admin/firestore"
import { logAdminAction, AUDIT_ACTIONS } from "./audit"
import { verifyIdTokenWithRevocation } from "./token-revocation"

/**
 * Admin role definitions
 * - super_admin: Full access, can manage other admins
 * - admin: Full analytics access, can manage users
 * - analyst: Read-only analytics access
 * - support: User management only (for customer support)
 */
export type AdminRole = "super_admin" | "admin" | "analyst" | "support"

/**
 * How stale lastAccess may get before getAdminRole() refreshes it. Chosen so the
 * field still answers "when was this admin last active" without charging a write
 * to every API call in a page load.
 */
const LAST_ACCESS_THROTTLE_MS = 5 * 60 * 1000

/**
 * The role could not be determined, as distinct from the caller not being an admin.
 *
 * getAdminRole used to swallow a Firestore failure and return null, which every
 * caller reads as "not an admin". A database blip therefore presented to a real
 * super_admin as Access Denied, and the admin shell's error state, which exists
 * precisely for this case, could never be reached because the API answered 403.
 * Refusing on evidence and refusing because there is no evidence are different
 * answers and must not share a return value.
 */
export class AdminRoleUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Could not determine admin role")
    this.name = "AdminRoleUnavailableError"
    this.cause = cause
  }
}

/**
 * Permission definitions
 */
export const PERMISSIONS = {
  // Analytics permissions
  VIEW_ANALYTICS: "view_analytics",
  VIEW_REVENUE: "view_revenue",
  EXPORT_DATA: "export_data",

  // User management permissions
  VIEW_USERS: "view_users",
  MANAGE_USERS: "manage_users",
  VIEW_USER_DETAILS: "view_user_details",

  // System permissions
  VIEW_ERRORS: "view_errors",
  MANAGE_SETTINGS: "manage_settings",
  MANAGE_ADMINS: "manage_admins",

  // AI/Usage permissions
  VIEW_AI_USAGE: "view_ai_usage",
  MANAGE_BUDGETS: "manage_budgets",
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/**
 * Role to permissions mapping
 */
export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: Object.values(PERMISSIONS), // All permissions

  admin: [
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_REVENUE,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_USER_DETAILS,
    PERMISSIONS.VIEW_ERRORS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.VIEW_AI_USAGE,
    PERMISSIONS.MANAGE_BUDGETS,
  ],

  analyst: [
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_REVENUE,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_ERRORS,
    PERMISSIONS.VIEW_AI_USAGE,
  ],

  support: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_USER_DETAILS,
    PERMISSIONS.VIEW_ERRORS,
  ],
}

/**
 * Admin role document stored in Firestore
 */
export interface AdminRoleDoc {
  userId: string
  email: string
  role: AdminRole
  grantedBy: string
  grantedAt: Timestamp
  lastAccess?: Timestamp
  active: boolean
}

/**
 * Get admin role for a user.
 *
 * Returns null when the user is genuinely not an admin. Throws
 * AdminRoleUnavailableError when the answer could not be established, so callers can
 * report a fault instead of denying access to someone who has it.
 */
export async function getAdminRole(userId: string): Promise<AdminRole | null> {
  // First check environment variable for super admin (bootstrap admin)
  const envAdminId = process.env.ADMIN_USER_ID
  if (envAdminId && userId === envAdminId) {
    return "super_admin"
  }

  // No database client is a fault, not evidence that this user lacks a role.
  if (!adminDb) throw new AdminRoleUnavailableError("Firestore admin client unavailable")

  try {
    const adminDoc = await adminDb.collection("admin_roles").doc(userId).get()

    if (!adminDoc.exists) return null

    const data = adminDoc.data() as AdminRoleDoc
    if (!data.active) return null

    // Stamp lastAccess only when it is meaningfully stale. A single admin page view
    // fans out to many API routes, and an unconditional write here turned every one
    // of them into a Firestore write for a field nobody reads at that resolution.
    const lastAccessMs = data.lastAccess?.toMillis() ?? 0
    if (Date.now() - lastAccessMs > LAST_ACCESS_THROTTLE_MS) {
      adminDb
        .collection("admin_roles")
        .doc(userId)
        .update({
          lastAccess: Timestamp.now(),
        })
        .catch(() => {
          /* ignore */
        })
    }

    return data.role
  } catch (error) {
    console.error("[RBAC] Error fetching admin role:", error)
    throw new AdminRoleUnavailableError(error)
  }
}

/**
 * Check if a user has a specific permission
 */
export async function hasPermission(userId: string, permission: Permission): Promise<boolean> {
  const role = await getAdminRole(userId)
  if (!role) return false

  return ROLE_PERMISSIONS[role].includes(permission)
}

/**
 * Check if a user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  permissions: Permission[]
): Promise<boolean> {
  const role = await getAdminRole(userId)
  if (!role) return false

  const userPermissions = ROLE_PERMISSIONS[role]
  return permissions.some((p) => userPermissions.includes(p))
}

/**
 * Check if a user has all of the specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  permissions: Permission[]
): Promise<boolean> {
  const role = await getAdminRole(userId)
  if (!role) return false

  const userPermissions = ROLE_PERMISSIONS[role]
  return permissions.every((p) => userPermissions.includes(p))
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const role = await getAdminRole(userId)
  if (!role) return []

  return ROLE_PERMISSIONS[role]
}

/**
 * Grant admin role to a user (requires super_admin)
 */
export async function grantAdminRole(
  granterId: string,
  targetUserId: string,
  targetEmail: string,
  role: AdminRole
): Promise<{ success: boolean; error?: string }> {
  // Verify granter is super_admin
  const granterRole = await getAdminRole(granterId)
  if (granterRole !== "super_admin") {
    return { success: false, error: "Only super admins can grant admin roles" }
  }

  // Cannot grant super_admin role
  if (role === "super_admin") {
    return { success: false, error: "Super admin role cannot be granted through API" }
  }

  if (!adminDb) {
    return { success: false, error: "Database not available" }
  }

  try {
    await adminDb.collection("admin_roles").doc(targetUserId).set({
      userId: targetUserId,
      email: targetEmail,
      role,
      grantedBy: granterId,
      grantedAt: Timestamp.now(),
      active: true,
    })

    // Log admin action through the shared audit writer so this row carries the
    // same fields as every other. granterId is all the caller gives us, so the
    // granter's own email is recorded as explicitly absent rather than omitted.
    await logAdminAction(
      granterId,
      AUDIT_ACTIONS.GRANT_ROLE,
      { targetUserId, targetEmail, role },
      {
        target: { type: "admin_roles", id: targetUserId, label: targetEmail },
        // The prior document is not read before the set(), so the previous
        // state is genuinely unknown. Recording a guessed "before" would be
        // worse than recording none.
        before: null,
        after: { role, active: true },
      }
    )

    return { success: true }
  } catch (error) {
    console.error("[RBAC] Error granting admin role:", error)
    return { success: false, error: "Failed to grant admin role" }
  }
}

/**
 * Revoke admin role from a user (requires super_admin)
 */
export async function revokeAdminRole(
  revokerId: string,
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  const revokerRole = await getAdminRole(revokerId)
  if (revokerRole !== "super_admin") {
    return { success: false, error: "Only super admins can revoke admin roles" }
  }

  // Cannot revoke env-based super admin
  if (targetUserId === process.env.ADMIN_USER_ID) {
    return { success: false, error: "Cannot revoke environment-configured super admin" }
  }

  if (!adminDb) {
    return { success: false, error: "Database not available" }
  }

  try {
    await adminDb.collection("admin_roles").doc(targetUserId).update({
      active: false,
    })

    await logAdminAction(
      revokerId,
      AUDIT_ACTIONS.REVOKE_ROLE,
      { targetUserId },
      {
        target: { type: "admin_roles", id: targetUserId },
        before: { active: true },
        after: { active: false },
      }
    )

    return { success: true }
  } catch (error) {
    console.error("[RBAC] Error revoking admin role:", error)
    return { success: false, error: "Failed to revoke admin role" }
  }
}

/**
 * List all admins
 */
export async function listAdmins(): Promise<AdminRoleDoc[]> {
  if (!adminDb) return []

  try {
    const snapshot = await adminDb.collection("admin_roles").where("active", "==", true).get()

    const admins = snapshot.docs.map((doc) => doc.data() as AdminRoleDoc)

    // Add env-based super admin if set
    const envAdminId = process.env.ADMIN_USER_ID
    if (envAdminId) {
      // Check if already in list
      if (!admins.find((a) => a.userId === envAdminId)) {
        admins.unshift({
          userId: envAdminId,
          email: "Environment Admin",
          role: "super_admin",
          grantedBy: "system",
          grantedAt: Timestamp.now(),
          active: true,
        })
      }
    }

    return admins
  } catch (error) {
    console.error("[RBAC] Error listing admins:", error)
    return []
  }
}

/**
 * Verify Firebase ID token and return user info.
 *
 * `checkRevoked` is opt-in because this function also serves ordinary
 * signed-in user routes, where the extra Auth round trip buys little. Admin
 * callers pass it: see lib/admin/token-revocation.ts for why the check is
 * rate-limited rather than run on every request.
 */
export async function verifyToken(
  token: string,
  options: { checkRevoked?: boolean } = {}
): Promise<{
  valid: boolean
  userId?: string
  email?: string
  error?: string
}> {
  if (!adminAuth) {
    return { valid: false, error: "Auth not initialized" }
  }

  try {
    const decodedToken = options.checkRevoked
      ? await verifyIdTokenWithRevocation(token)
      : await adminAuth.verifyIdToken(token)
    return {
      valid: true,
      userId: decodedToken.uid,
      email: decodedToken.email,
    }
  } catch (error) {
    return { valid: false, error: "Invalid token" }
  }
}
