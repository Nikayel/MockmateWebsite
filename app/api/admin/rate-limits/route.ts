/**
 * Admin Rate Limits API
 *
 * Endpoints for viewing rate limiting metrics and abuse detection.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRateLimitMetrics, cleanupRateLimitData } from '@/lib/rate-limit-metrics'
import {
  requirePermission,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/admin/middleware'
import { PERMISSIONS } from '@/lib/admin/rbac'
import { parseBoundedInt } from '@/lib/admin/query-params'
import { logAdminAction } from '@/lib/admin/audit'

/** 90 days of hourly rate-limit metrics is more than any dashboard charts. */
const MAX_METRIC_HOURS = 24 * 90

/**
 * GET /api/admin/rate-limits
 *
 * Get rate limiting statistics
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
  // hours widens a Firestore range scan, so ?hours=1000000 is a bill, not a chart.
  const hoursParam = parseBoundedInt(searchParams.get('hours'), {
    min: 1,
    max: MAX_METRIC_HOURS,
    fallback: 24,
  })
  if (!hoursParam.ok) {
    return errorResponse(`Invalid hours: ${hoursParam.error}`, 400)
  }

  try {
    const metrics = await getRateLimitMetrics(hoursParam.value)

    return NextResponse.json({
      success: true,
      data: metrics,
    })
  } catch (error) {
    console.error('[Admin Rate Limits API] Error:', error)
    return errorResponse('Failed to fetch rate limit data', 500)
  }
}

/**
 * POST /api/admin/rate-limits
 *
 * Admin actions for rate limiting
 *
 * Body:
 * - action: 'cleanup' | 'block_ip'
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
        // Bounded because this deletes: daysToKeep: 0 or a negative would sweep
        // the whole collection, and a non-numeric one reached the query as NaN.
        const daysParam = parseBoundedInt(String(body.daysToKeep ?? ''), {
          min: 1,
          max: 365,
          fallback: 7,
        })
        if (!daysParam.ok) {
          return errorResponse(`Invalid daysToKeep: ${daysParam.error}`, 400)
        }
        const daysToKeep = daysParam.value
        await cleanupRateLimitData(daysToKeep)

        await logAdminAction(adminContext.userId, 'cleanup_rate_limit_data', {
          daysToKeep,
        })

        return NextResponse.json({
          success: true,
          message: `Cleaned up rate limit data older than ${daysToKeep} days`,
        })
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400)
    }
  } catch (error) {
    console.error('[Admin Rate Limits API] Error:', error)
    return errorResponse('Failed to perform action', 500)
  }
}
