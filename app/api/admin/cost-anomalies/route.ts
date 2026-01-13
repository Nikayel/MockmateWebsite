/**
 * Admin Cost Anomalies API
 *
 * Endpoints for viewing and managing cost anomaly alerts.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getRecentAnomalies,
  getAnomalyStats,
  acknowledgeAnomaly,
  updateAnomalyConfig,
  checkHourlyCostAnomaly,
} from '@/lib/cost-anomaly-detection'
import {
  requirePermission,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/admin/middleware'
import { PERMISSIONS } from '@/lib/admin/rbac'
import { logAdminAction } from '@/lib/admin/audit'

/**
 * GET /api/admin/cost-anomalies
 *
 * Get cost anomaly statistics and recent alerts
 *
 * Query params:
 * - view: 'overview' | 'alerts' (default: 'overview')
 * - limit: number (default: 50)
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, PERMISSIONS.VIEW_AI_USAGE)
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error!, authResult.status || 403)
  }

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'overview'
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  try {
    switch (view) {
      case 'overview': {
        const [stats, recentAnomalies] = await Promise.all([
          getAnomalyStats(),
          getRecentAnomalies(20),
        ])

        return NextResponse.json({
          success: true,
          data: {
            stats,
            recentAnomalies,
          },
        })
      }

      case 'alerts': {
        const anomalies = await getRecentAnomalies(limit)

        return NextResponse.json({
          success: true,
          data: { anomalies },
        })
      }

      default:
        return errorResponse(`Unknown view: ${view}`, 400)
    }
  } catch (error) {
    console.error('[Admin Cost Anomalies API] Error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch anomaly data',
      500
    )
  }
}

/**
 * POST /api/admin/cost-anomalies
 *
 * Admin actions for cost anomalies
 *
 * Body:
 * - action: 'acknowledge' | 'update_config' | 'check_now'
 */
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, PERMISSIONS.MANAGE_BUDGETS)
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error!, authResult.status || 403)
  }

  const adminContext = authResult.context!

  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'acknowledge': {
        const { anomalyId } = body
        if (!anomalyId) {
          return errorResponse('anomalyId is required', 400)
        }

        await acknowledgeAnomaly(anomalyId, adminContext.userId)

        await logAdminAction(adminContext.userId, 'acknowledge_cost_anomaly', {
          anomalyId,
        })

        return NextResponse.json({
          success: true,
          message: 'Anomaly acknowledged',
        })
      }

      case 'update_config': {
        const { config } = body
        if (!config || typeof config !== 'object') {
          return errorResponse('config object is required', 400)
        }

        await updateAnomalyConfig(config)

        await logAdminAction(adminContext.userId, 'update_cost_anomaly_config', {
          config,
        })

        return NextResponse.json({
          success: true,
          message: 'Config updated',
        })
      }

      case 'check_now': {
        const anomaly = await checkHourlyCostAnomaly()

        return NextResponse.json({
          success: true,
          data: {
            anomalyDetected: !!anomaly,
            anomaly,
          },
        })
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400)
    }
  } catch (error) {
    console.error('[Admin Cost Anomalies API] Error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to perform action',
      500
    )
  }
}
