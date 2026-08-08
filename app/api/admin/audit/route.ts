/**
 * Admin Audit Log API
 *
 * Provides access to admin action audit logs with filtering, pagination, and export
 */

import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { withPermission } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { parseBoundedInt } from "@/lib/admin/query-params"
import { resolveAuditDateRange } from "@/lib/admin/audit"

export const dynamic = "force-dynamic"

/**
 * Read a date bound off the untyped export body.
 *
 * A non-string bound is a client bug, not a date. Coercing it would invent a
 * range the operator never asked for, so it is rejected by name instead.
 */
function readBodyDate(
  value: unknown,
  field: "startDate" | "endDate"
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null }
  }
  if (typeof value !== "string") {
    return { ok: false, message: `${field} must be a date string` }
  }
  return { ok: true, value }
}

interface AuditLogEntry {
  id: string
  adminId: string
  adminEmail?: string
  action: string
  details: Record<string, any>
  timestamp: string
  ip?: string
  userAgent?: string
}

/**
 * Reading the audit log stays with super_admin and admin, the same two roles the
 * hand-rolled `["super_admin", "admin"].includes(role)` list allowed. That set is
 * exactly the MANAGE_SETTINGS holders, so the check now names the permission and
 * survives a change to the role table.
 */
export const GET = withPermission(PERMISSIONS.MANAGE_SETTINGS, async (request) => {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    // Parse query params. Math.min(parseInt("abc"), 200) is NaN, which reached
    // query.limit() as an unbounded page size.
    const { searchParams } = new URL(request.url)
    const limitParam = parseBoundedInt(searchParams.get("limit"), {
      min: 1,
      max: 200,
      fallback: 50,
    })
    if (!limitParam.ok) {
      return NextResponse.json(
        { success: false, error: `Invalid limit: ${limitParam.error}` },
        { status: 400 }
      )
    }
    const limit = limitParam.value
    const cursor = searchParams.get("cursor")
    const action = searchParams.get("action")
    const adminId = searchParams.get("adminId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // The filter UI sends YYYY-MM-DD from an <input type="date">, which parses
    // to midnight. Applied here as an inclusive `<=` upper bound it excluded
    // every entry from the final day the operator actually asked for, and an
    // unparseable value reached Firestore as an Invalid Date and surfaced as an
    // opaque 500. resolveAuditDateRange resolves both.
    const dateRange = resolveAuditDateRange(startDate, endDate)
    if (!dateRange.ok) {
      return NextResponse.json(
        { success: false, error: dateRange.message, field: dateRange.field },
        { status: 400 }
      )
    }
    const { from, until } = dateRange.range

    // Build query
    let query = adminDb.collection("admin_audit_log").orderBy("timestamp", "desc")

    // Apply filters
    if (action) {
      query = query.where("action", "==", action)
    }
    if (adminId) {
      query = query.where("adminId", "==", adminId)
    }

    // Half-open range: `from` inclusive, `until` exclusive.
    if (from) {
      query = query.where("timestamp", ">=", from)
    }
    if (until) {
      query = query.where("timestamp", "<", until)
    }

    // Pagination
    if (cursor) {
      const cursorDoc = await adminDb.collection("admin_audit_log").doc(cursor).get()
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc)
      }
    }

    query = query.limit(limit + 1) // Get one extra to check for more pages

    const snapshot = await query.get()
    const hasMore = snapshot.docs.length > limit
    const docs = hasMore ? snapshot.docs.slice(0, -1) : snapshot.docs

    const logs: AuditLogEntry[] = docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        adminId: data.adminId,
        adminEmail: data.adminEmail,
        action: data.action,
        details: data.details || {},
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
        ip: data.ip,
        userAgent: data.userAgent,
      }
    })

    // Get unique actions for filter dropdown
    const actionsSnapshot = await adminDb
      .collection("admin_audit_log")
      .orderBy("timestamp", "desc")
      .limit(500)
      .get()

    const uniqueActions = [...new Set(actionsSnapshot.docs.map((d) => d.data().action as string))]

    // Get summary stats
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const stats24hSnapshot = await adminDb
      .collection("admin_audit_log")
      .where("timestamp", ">=", last24h)
      .get()

    const stats7dSnapshot = await adminDb
      .collection("admin_audit_log")
      .where("timestamp", ">=", last7d)
      .get()

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        hasMore,
        nextCursor: hasMore && docs.length > 0 ? docs[docs.length - 1].id : null,
      },
      filters: {
        actions: uniqueActions,
      },
      stats: {
        last24h: stats24hSnapshot.size,
        last7d: stats7dSnapshot.size,
        total: snapshot.size,
      },
    })
  } catch (error) {
    console.error("[Admin Audit API] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch audit logs" },
      { status: 500 }
    )
  }
})

/**
 * Export audit logs as CSV. Deliberately NOT EXPORT_DATA, which analyst and
 * admin both hold: exporting who did what to the platform is an
 * admin-governance act, and the previous `role !== "super_admin"` check is
 * preserved exactly by MANAGE_ADMINS, which only super_admin has.
 */
export const POST = withPermission(PERMISSIONS.MANAGE_ADMINS, async (request) => {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const body = await request.json()
    const { format = "csv" } = body

    // Same half-open range as the filtered view above. An export that silently
    // omits the final day is the worse of the two failures: the CSV leaves the
    // building and is read as the complete record for the period.
    const startDate = readBodyDate(body.startDate, "startDate")
    if (!startDate.ok) {
      return NextResponse.json({ success: false, error: startDate.message }, { status: 400 })
    }
    const endDate = readBodyDate(body.endDate, "endDate")
    if (!endDate.ok) {
      return NextResponse.json({ success: false, error: endDate.message }, { status: 400 })
    }

    const dateRange = resolveAuditDateRange(startDate.value, endDate.value)
    if (!dateRange.ok) {
      return NextResponse.json(
        { success: false, error: dateRange.message, field: dateRange.field },
        { status: 400 }
      )
    }
    const { from, until } = dateRange.range

    // Build query
    let query = adminDb.collection("admin_audit_log").orderBy("timestamp", "desc")

    if (from) {
      query = query.where("timestamp", ">=", from)
    }
    if (until) {
      query = query.where("timestamp", "<", until)
    }

    // Limit export to 10000 records
    query = query.limit(10000)

    const snapshot = await query.get()

    const logs = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        adminId: data.adminId,
        adminEmail: data.adminEmail || "",
        action: data.action,
        details: JSON.stringify(data.details || {}),
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
        ip: data.ip || "",
      }
    })

    if (format === "csv") {
      // Generate CSV
      const headers = ["ID", "Timestamp", "Admin ID", "Admin Email", "Action", "Details", "IP"]
      const rows = logs.map((log) => [
        log.id,
        log.timestamp,
        log.adminId,
        log.adminEmail,
        log.action,
        log.details,
        log.ip,
      ])

      const csv = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n")

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      logs,
      exportedAt: new Date().toISOString(),
      count: logs.length,
    })
  } catch (error) {
    console.error("[Admin Audit Export API] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to export audit logs" },
      { status: 500 }
    )
  }
})
