/**
 * Admin Referrals API
 *
 * Endpoints for viewing referral program statistics.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getReferralStats, getAllReferralsDetailed } from '@/lib/referrals'
import {
  requirePermission,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/admin/middleware'
import { PERMISSIONS } from '@/lib/admin/rbac'

/**
 * GET /api/admin/referrals
 *
 * Get referral statistics and detailed referral list
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, PERMISSIONS.VIEW_ANALYTICS)
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error!, authResult.status || 403)
  }

  try {
    const [stats, detailedReferrals] = await Promise.all([
      getReferralStats(),
      getAllReferralsDetailed(),
    ])

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        detailedReferrals,
      },
    })
  } catch (error) {
    console.error('[Admin Referrals API] Error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch referral data',
      500
    )
  }
}
