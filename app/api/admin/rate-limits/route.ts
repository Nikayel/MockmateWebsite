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
import { logAdminAction } from '@/lib/admin/audit'

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
  const hours = parseInt(searchParams.get('hours') || '24', 10)

  try {
    const metrics = await getRateLimitMetrics(hours)

    return NextResponse.json({
      success: true,
      data: metrics,
    })
  } catch (error) {
    console.error('[Admin Rate Limits API] Error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch rate limit data',
      500
    )
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
        const daysToKeep = body.daysToKeep || 7
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
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to perform action',
      500
    )
  }
}
