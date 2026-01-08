/**
 * Admin Audit Log API
 *
 * Provides access to admin action audit logs with filtering, pagination, and export
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyToken, getAdminRole, PERMISSIONS, hasPermission } from "@/lib/admin/rbac"

export const dynamic = "force-dynamic"

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

export async function GET(request: NextRequest) {
  try {
    // Verify auth
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const auth = await verifyToken(token)
    if (!auth.valid || !auth.userId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    // Check admin role (only admins and super_admins can view audit logs)
    const role = await getAdminRole(auth.userId)
    if (!role || !["super_admin", "admin"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)
    const cursor = searchParams.get("cursor")
    const action = searchParams.get("action")
    const adminId = searchParams.get("adminId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Build query
    let query = adminDb.collection("admin_audit_log").orderBy("timestamp", "desc")

    // Apply filters
    if (action) {
      query = query.where("action", "==", action)
    }
    if (adminId) {
      query = query.where("adminId", "==", adminId)
    }

    // Date range filtering
    if (startDate) {
      query = query.where("timestamp", ">=", new Date(startDate))
    }
    if (endDate) {
      query = query.where("timestamp", "<=", new Date(endDate))
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
}

// Export audit logs as CSV
export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const auth = await verifyToken(token)
    if (!auth.valid || !auth.userId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    // Only super_admin can export audit logs
    const role = await getAdminRole(auth.userId)
    if (role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Only super admins can export audit logs" },
        { status: 403 }
      )
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
    }

    const body = await request.json()
    const { startDate, endDate, format = "csv" } = body

    // Build query
    let query = adminDb.collection("admin_audit_log").orderBy("timestamp", "desc")

    if (startDate) {
      query = query.where("timestamp", ">=", new Date(startDate))
    }
    if (endDate) {
      query = query.where("timestamp", "<=", new Date(endDate))
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
}
