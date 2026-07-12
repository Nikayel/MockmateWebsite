/**
 * GET /api/spaced-repetition/stats
 *
 * Get mastery statistics for the authenticated user.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { requireTierForUser } from "@/lib/quota-enforcement"
import {
  getUserMasteryStats,
  getDailyGoalProgress,
  buildLearningStatsContext,
} from "@/lib/spaced-repetition"
import { logger } from "@/lib/logger"

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: authResult.error },
        { status: 401 }
      )
    }

    const userId = authResult.userId

    // Server-side tier gate: spaced repetition is a Pro feature
    // (token already verified by verifyAuth above)
    const tierCheck = await requireTierForUser(userId, "pro")
    if (tierCheck.response) return tierCheck.response

    // Read the shared learning-state doc + timezone ONCE, then run the two
    // aggregate reads in parallel (each still reads problem_mastery on its own).
    const context = await buildLearningStatsContext(userId)
    const [stats, dailyProgress] = await Promise.all([
      getUserMasteryStats(userId, context),
      getDailyGoalProgress(userId, context),
    ])

    return NextResponse.json({
      ...stats,
      daily_goal: dailyProgress.daily_goal,
      daily_progress: dailyProgress.daily_progress,
      problems_today: dailyProgress.problems_today,
    })
  } catch (error) {
    logger.error("Error getting mastery stats", { error })
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/spaced-repetition/stats
 *
 * Update user settings like daily goal.
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: authResult.error },
        { status: 401 }
      )
    }

    const userId = authResult.userId

    // Server-side tier gate: spaced repetition is a Pro feature
    // (token already verified by verifyAuth above)
    const tierCheck = await requireTierForUser(userId, "pro")
    if (tierCheck.response) return tierCheck.response
    const body = await request.json()

    if (body.daily_goal !== undefined) {
      const { setDailyGoal } = await import("@/lib/spaced-repetition")
      await setDailyGoal(userId, body.daily_goal)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Error updating stats", { error })
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
