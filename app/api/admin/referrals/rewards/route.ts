/**
 * Admin Referral Rewards API
 *
 * Endpoints for managing referral rewards (payouts and credits).
 */

import { NextRequest, NextResponse } from "next/server"
import { getPendingRewards, markRewardPaid } from "@/lib/referrals"
import { requirePermission, errorResponse, unauthorizedResponse } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"

/**
 * GET /api/admin/referrals/rewards
 *
 * Get pending rewards for admin to process
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, PERMISSIONS.VIEW_ANALYTICS)
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error!, authResult.status || 403)
  }

  try {
    const rewards = await getPendingRewards()

    return NextResponse.json({
      success: true,
      data: rewards,
    })
  } catch (error) {
    console.error("[Admin Rewards API] Error:", error)
    return errorResponse(error instanceof Error ? error.message : "Failed to fetch rewards", 500)
  }
}

/**
 * POST /api/admin/referrals/rewards
 *
 * Mark a reward as paid/credited
 *
 * Body:
 * - rewardId: string
 * - notes?: string
 */
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, PERMISSIONS.MANAGE_USERS)
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error!, authResult.status || 403)
  }

  try {
    const body = await request.json()
    const { rewardId, notes } = body

    if (!rewardId) {
      return errorResponse("rewardId is required", 400)
    }

    const success = await markRewardPaid(rewardId, authResult.context!.userId, notes)

    if (!success) {
      return errorResponse("Failed to process reward - may already be processed", 400)
    }

    return NextResponse.json({
      success: true,
      message: "Reward processed successfully",
    })
  } catch (error) {
    console.error("[Admin Rewards API] Error processing reward:", error)
    return errorResponse(error instanceof Error ? error.message : "Failed to process reward", 500)
  }
}
