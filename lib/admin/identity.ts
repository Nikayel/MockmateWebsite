/**
 * Admin identity as the browser sees it.
 *
 * This module is deliberately client-safe: it imports only types from ./rbac, so
 * nothing here drags firebase-admin into the client bundle. It exists so the admin
 * shell validates the /api/admin/me payload at the trust boundary instead of
 * casting an unknown JSON body straight into UI state.
 */

import type { AdminRole, Permission } from "./rbac"

export interface AdminIdentity {
  userId: string
  email: string | null
  role: AdminRole
  permissions: Permission[]
}

/**
 * Runtime list of the roles declared by the AdminRole union. Typed as readonly
 * AdminRole[] so adding a role to the union without adding it here is a type error.
 */
const ADMIN_ROLES: readonly AdminRole[] = ["super_admin", "admin", "analyst", "support"]

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value)
}

/**
 * Parse a /api/admin/me response body. Returns null for anything that does not
 * carry a usable identity, so the caller can show a real error state rather than
 * rendering a shell around undefined.
 */
export function parseAdminIdentity(body: unknown): AdminIdentity | null {
  if (typeof body !== "object" || body === null) return null

  const record = body as Record<string, unknown>
  if (record.success === false) return null
  if (typeof record.userId !== "string" || record.userId.length === 0) return null
  if (!isAdminRole(record.role)) return null

  const permissions = Array.isArray(record.permissions)
    ? record.permissions.filter((value): value is Permission => typeof value === "string")
    : []

  return {
    userId: record.userId,
    email: typeof record.email === "string" ? record.email : null,
    role: record.role,
    permissions,
  }
}
