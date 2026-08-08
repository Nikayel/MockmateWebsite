/**
 * System Health API
 *
 * Monitor system health, performance metrics, and alerts
 */

import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { withPermission } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { Timestamp } from "firebase-admin/firestore"

export const dynamic = "force-dynamic"

/**
 * Reading system health is VIEW_ERRORS, which every admin role holds. The
 * hand-rolled preamble this replaces gated on `if (!role)`, which is not a
 * permission check at all: it passed anyone the role lookup returned truthy for.
 */
export const GET = withPermission(PERMISSIONS.VIEW_ERRORS, async () => {
  try {
    const startTime = Date.now()

    // Service health checks
    type HealthStatus = "healthy" | "degraded" | "unhealthy"
    const services: Record<string, { status: HealthStatus; latency: number; message: string }> = {
      database: { status: "healthy", latency: 0, message: "" },
      api: { status: "healthy", latency: 0, message: "" },
      auth: { status: "healthy", latency: 0, message: "" },
      storage: { status: "healthy", latency: 0, message: "" },
    }

    // Check database health
    try {
      const dbStart = Date.now()
      if (adminDb) {
        await adminDb.collection("profiles").limit(1).get()
        services.database.latency = Date.now() - dbStart
        services.database.status = services.database.latency < 500 ? "healthy" : "degraded"
      } else {
        services.database.status = "unhealthy"
        services.database.message = "Database not initialized"
      }
    } catch (e) {
      services.database.status = "unhealthy"
      services.database.message = "Database connection failed"
    }

    // API is healthy if we got here
    services.api.latency = Date.now() - startTime
    services.api.status = services.api.latency < 1000 ? "healthy" : "degraded"

    // Auth is healthy since token was verified
    services.auth.status = "healthy"
    services.auth.latency = 50

    // Get error counts from last 24h
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    let errorCount = 0
    const warningCount = 0

    if (adminDb) {
      try {
        const errorsSnapshot = await adminDb
          .collection("analytics_events")
          .where("event_name", "==", "error")
          .where("timestamp", ">=", Timestamp.fromDate(last24h))
          .get()
        errorCount = errorsSnapshot.size
      } catch (e) {
        // Ignore
      }
    }

    // Uptime is deliberately absent. It was a hardcoded 99.9 that no measurement could ever
    // move, which is the worst kind of health indicator: it reads as a hard-won SLO and is a
    // literal. Real uptime needs an external prober recording availability over time, since a
    // process cannot observe the windows in which it was not running.

    // V8 heap of the instance serving this request. The previous 256/512 literal was justified
    // by a comment claiming memory is unavailable in serverless, which is not true of the Node
    // runtime. This is per-instance rather than platform-wide, and labelled as such in the UI,
    // but it is measured: a leak shows up here as a heap that climbs and does not come back.
    const heap = process.memoryUsage()
    const usedMb = Math.round(heap.heapUsed / 1024 / 1024)
    const totalMb = Math.round(heap.heapTotal / 1024 / 1024)
    const memoryUsage = {
      used: usedMb,
      total: totalMb,
      percentage: totalMb > 0 ? Math.round((usedMb / totalMb) * 100) : 0,
    }

    // Active alerts
    const alerts: Array<{
      id: string
      type: "error" | "warning" | "info"
      title: string
      message: string
      timestamp: string
      acknowledged: boolean
    }> = []

    if (errorCount > 10) {
      alerts.push({
        id: "high-error-rate",
        type: "error",
        title: "High Error Rate",
        message: `${errorCount} errors in the last 24 hours`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      })
    }

    if (services.database.status === "degraded") {
      alerts.push({
        id: "db-latency",
        type: "warning",
        title: "Database Latency High",
        message: `Database response time: ${services.database.latency}ms`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      })
    }

    // Get request volume (last 24h)
    let requestVolume = 0
    if (adminDb) {
      try {
        const eventsSnapshot = await adminDb
          .collection("analytics_events")
          .where("timestamp", ">=", Timestamp.fromDate(last24h))
          .get()
        requestVolume = eventsSnapshot.size
      } catch (e) {
        // Ignore
      }
    }

    // Overall health status
    const overallStatus = alerts.some((a) => a.type === "error")
      ? "unhealthy"
      : alerts.some((a) => a.type === "warning")
        ? "degraded"
        : "healthy"

    return NextResponse.json({
      success: true,
      health: {
        status: overallStatus,
        lastChecked: new Date().toISOString(),
        services,
        metrics: {
          errorCount,
          warningCount,
          requestVolume,
        },
        memory: memoryUsage,
        alerts,
      },
    })
  } catch (error) {
    console.error("[Health API] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch health data" },
      { status: 500 }
    )
  }
})

/**
 * POST - Acknowledge alert. The hard-coded ["super_admin", "admin"] list is the
 * same set as MANAGE_SETTINGS, so this states the permission instead of the
 * roles and stays correct if the role table changes.
 */
export const POST = withPermission(PERMISSIONS.MANAGE_SETTINGS, async (request) => {
  try {
    const body = await request.json()
    const { alertId, acknowledged } = body

    // In production, store acknowledged state in database
    // For now, just return success

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Health API] POST Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to acknowledge alert" },
      { status: 500 }
    )
  }
})
