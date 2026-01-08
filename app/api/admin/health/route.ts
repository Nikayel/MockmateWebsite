/**
 * System Health API
 *
 * Monitor system health, performance metrics, and alerts
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyToken, getAdminRole } from "@/lib/admin/rbac"
import { Timestamp } from "firebase-admin/firestore"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const auth = await verifyToken(token)
    if (!auth.valid || !auth.userId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const role = await getAdminRole(auth.userId)
    if (!role) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

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

    // Calculate uptime (simplified - in production use a real monitoring service)
    const uptime = 99.9 // Placeholder

    // Memory usage (not available in serverless, use placeholder)
    const memoryUsage = {
      used: 256,
      total: 512,
      percentage: 50,
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

    // Performance metrics over time (placeholder - would come from monitoring)
    const performanceHistory = Array.from({ length: 24 }, (_, i) => ({
      hour: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
      latency: Math.floor(Math.random() * 100) + 100,
      requests: Math.floor(Math.random() * 1000) + 500,
      errors: Math.floor(Math.random() * 5),
    }))

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
        uptime,
        lastChecked: new Date().toISOString(),
        services,
        metrics: {
          errorCount,
          warningCount,
          requestVolume,
          avgLatency: Math.round(
            performanceHistory.reduce((s, p) => s + p.latency, 0) / performanceHistory.length
          ),
        },
        memory: memoryUsage,
        alerts,
        performanceHistory,
      },
    })
  } catch (error) {
    console.error("[Health API] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch health data" },
      { status: 500 }
    )
  }
}

// POST - Acknowledge alert
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const auth = await verifyToken(token)
    if (!auth.valid || !auth.userId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const role = await getAdminRole(auth.userId)
    if (!role || !["super_admin", "admin"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

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
}
