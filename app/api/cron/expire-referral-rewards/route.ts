/**
 * Expire Referral Rewards Cron Job
 *
 * Moves pending referral rewards past their expiresAt to "expired" and decrements
 * the referrer's pending balances, keeping the advertised growth loop's ledger
 * accurate. expireOldRewards() existed but was never invoked from anywhere.
 *
 * Trigger externally daily:
 * POST /api/cron/expire-referral-rewards
 * Authorization: Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyCronRequest } from "@/lib/cron-auth"
import { expireOldRewards } from "@/lib/referrals"
import { logger } from "@/lib/logger"

async function handleExpireReferralRewards(request: NextRequest) {
  const auth = verifyCronRequest(request)
  if (!auth.ok) {
    if (auth.status === 500) {
      logger.error("[Cron Expire Referral Rewards] CRON_SECRET not configured")
    }
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const expiredCount = await expireOldRewards()
    return NextResponse.json({ success: true, expiredCount })
  } catch (error) {
    logger.error("[Cron Expire Referral Rewards] Failed to expire rewards", { error })
    return NextResponse.json({ error: "Failed to expire referral rewards" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handleExpireReferralRewards(request)
}

export async function POST(request: NextRequest) {
  return handleExpireReferralRewards(request)
}
