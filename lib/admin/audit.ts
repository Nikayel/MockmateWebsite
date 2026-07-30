/**
 * Admin Audit Logging
 *
 * Centralized audit logging for all admin actions.
 * Logs are stored in Firestore for compliance and security tracking.
 */

import { adminDb } from "../firebase-admin"
import { Timestamp } from "firebase-admin/firestore"

export interface AuditLogEntry {
  adminId: string
  action: string
  details: Record<string, any>
  timestamp: Timestamp
  ip?: string
  userAgent?: string
}

/**
 * Log an admin action for audit trail
 *
 * @param adminId - The ID of the admin performing the action
 * @param action - The action being performed (e.g., 'delete_user', 'set_budget')
 * @param details - Additional details about the action
 * @param request - Optional NextRequest to extract IP and user agent
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  details: Record<string, any>,
  request?: { headers: { get: (name: string) => string | null } }
): Promise<void> {
  if (!adminDb) {
    console.warn("[Audit] Database not available, skipping audit log")
    return
  }

  try {
    const entry: AuditLogEntry = {
      adminId,
      action,
      details,
      timestamp: Timestamp.now(),
    }

    // Extract request metadata if available
    if (request) {
      entry.ip =
        request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
      entry.userAgent = request.headers.get("user-agent") || undefined
    }

    await adminDb.collection("admin_audit_log").add(entry)
  } catch (error) {
    // Log error but don't fail the operation
    console.error("[Audit] Error logging admin action:", error)
  }
}

/**
 * Get recent audit logs
 *
 * @param limit - Maximum number of entries to return
 * @param adminId - Optional filter by admin ID
 * @param action - Optional filter by action type
 */
export async function getAuditLogs(options: {
  limit?: number
  adminId?: string
  action?: string
  startDate?: Date
  endDate?: Date
}): Promise<AuditLogEntry[]> {
  if (!adminDb) {
    return []
  }

  try {
    const query = adminDb
      .collection("admin_audit_log")
      .orderBy("timestamp", "desc")
      .limit(options.limit || 100)

    // Note: Firestore doesn't support multiple inequality filters,
    // so we filter by date range client-side if needed

    const snapshot = await query.get()

    let entries = snapshot.docs.map((doc) => doc.data() as AuditLogEntry)

    // Apply filters
    if (options.adminId) {
      entries = entries.filter((e) => e.adminId === options.adminId)
    }

    if (options.action) {
      entries = entries.filter((e) => e.action === options.action)
    }

    if (options.startDate) {
      const startTime = Timestamp.fromDate(options.startDate)
      entries = entries.filter((e) => e.timestamp >= startTime)
    }

    if (options.endDate) {
      const endTime = Timestamp.fromDate(options.endDate)
      entries = entries.filter((e) => e.timestamp <= endTime)
    }

    return entries
  } catch (error) {
    console.error("[Audit] Error fetching audit logs:", error)
    return []
  }
}

/**
 * Common audit action types
 */
export const AUDIT_ACTIONS = {
  // User management
  DELETE_USER: "delete_user",
  UPDATE_USER: "update_user",

  // Budget management
  SET_USER_BUDGET: "set_user_budget",

  // System actions
  CLEAR_CACHE: "clear_cache",
  CLEANUP_ORPHANS: "cleanup_orphans",

  // Admin management
  GRANT_ROLE: "grant_role",
  REVOKE_ROLE: "revoke_role",

  // Settings
  UPDATE_SETTINGS: "update_settings",

  // Algorithm research
  END_AB_SWITCH_FSRS: "end_ab_switch_fsrs",
} as const

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]
