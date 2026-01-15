/**
 * Referral API
 *
 * User-facing endpoint for getting referral code and stats.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-helpers'
import { getUserReferralCode, getUserReferralStats, recordReferral } from '@/lib/referrals'
import { promoCodeRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/referral
 *
 * Get user's referral code and stats
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request)
  if (!authResult.authenticated || !authResult.userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const stats = await getUserReferralStats(authResult.userId)

    // Generate shareable URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mockmate.dev'
    const shareUrl = `${baseUrl}?ref=${stats.referralCode}`

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        shareUrl,
      },
    })
  } catch (error) {
    console.error('[Referral API] Error getting referral stats:', error)
    return NextResponse.json(
      { error: 'Failed to get referral data' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/referral
 *
 * Record a referral (called during signup with referral code)
 *
 * Body:
 * - referralCode: string
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting to prevent brute-force attacks on referral codes
  const rateLimitResponse = await promoCodeRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const authResult = await verifyAuth(request)
  if (!authResult.authenticated || !authResult.userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { referralCode } = body

    if (!referralCode || typeof referralCode !== 'string') {
      return NextResponse.json(
        { error: 'referralCode is required' },
        { status: 400 }
      )
    }

    const success = await recordReferral(authResult.userId, referralCode)

    if (!success) {
      return NextResponse.json(
        { error: 'Invalid or already used referral code' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Referral recorded',
    })
  } catch (error) {
    console.error('[Referral API] Error recording referral:', error)
    return NextResponse.json(
      { error: 'Failed to record referral' },
      { status: 500 }
    )
  }
}
