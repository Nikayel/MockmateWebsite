/**
 * Admin Query Performance API
 *
 * Endpoints for viewing database query performance metrics.
 */

import { NextRequest, NextResponse } from "next/server"
import { getQueryPerformanceStats, cleanupQueryMetrics } from "@/lib/query-performance"
import { requirePermission, errorResponse, unauthorizedResponse } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { parseBoundedInt } from "@/lib/admin/query-params"
import { logAdminAction } from "@/lib/admin/audit"
import { logger } from "@/lib/logger"

/** 90 days of query metrics is more than any dashboard charts. */
const MAX_METRIC_HOURS = 24 * 90

/**
 * GET /api/admin/query-performance
 *
 * Get query performance statistics
 *
 * Query params:
 * - hours: number (default: 24) - Time window for metrics
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, PERMISSIONS.VIEW_ANALYTICS)
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error!, authResult.status || 403)
  }

  const { searchParams } = new URL(request.url)
  // hours widens a Firestore range scan; unbounded it is a full-collection read.
  const hoursParam = parseBoundedInt(searchParams.get("hours"), {
    min: 1,
    max: MAX_METRIC_HOURS,
    fallback: 24,
  })
  if (!hoursParam.ok) {
    return errorResponse(`Invalid hours: ${hoursParam.error}`, 400)
  }

  try {
    const stats = await getQueryPerformanceStats(hoursParam.value)

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    logger.error("[Admin Query Performance API] Error", { error })
    return errorResponse("Failed to fetch query performance data", 500)
  }
}

/**
 * POST /api/admin/query-performance
 *
 * Admin actions for query performance
 *
 * Body:
 * - action: 'cleanup'
 */
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, PERMISSIONS.MANAGE_USERS)
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error!, authResult.status || 403)
  }

  const adminContext = authResult.context!

  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case "cleanup": {
        // Bounded because this deletes: 0 or a negative would sweep everything.
        const daysParam = parseBoundedInt(String(body.daysToKeep ?? ""), {
          min: 1,
          max: 365,
          fallback: 3,
        })
        if (!daysParam.ok) {
          return errorResponse(`Invalid daysToKeep: ${daysParam.error}`, 400)
        }
        const daysToKeep = daysParam.value
        await cleanupQueryMetrics(daysToKeep)

        await logAdminAction(adminContext.userId, "cleanup_query_metrics", {
          daysToKeep,
        })

        return NextResponse.json({
          success: true,
          message: `Cleaned up query metrics older than ${daysToKeep} days`,
        })
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400)
    }
  } catch (error) {
    logger.error("[Admin Query Performance API] Error", { error })
    return errorResponse("Failed to perform action", 500)
  }
}
