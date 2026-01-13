/**
 * Admin Query Performance API
 *
 * Endpoints for viewing database query performance metrics.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getQueryPerformanceStats, cleanupQueryMetrics } from '@/lib/query-performance'
import {
  requirePermission,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/admin/middleware'
import { PERMISSIONS } from '@/lib/admin/rbac'
import { logAdminAction } from '@/lib/admin/audit'

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
  const hours = parseInt(searchParams.get('hours') || '24', 10)

  try {
    const stats = await getQueryPerformanceStats(hours)

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('[Admin Query Performance API] Error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch query performance data',
      500
    )
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
      case 'cleanup': {
        const daysToKeep = body.daysToKeep || 3
        await cleanupQueryMetrics(daysToKeep)

        await logAdminAction(adminContext.userId, 'cleanup_query_metrics', {
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
    console.error('[Admin Query Performance API] Error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to perform action',
      500
    )
  }
}
