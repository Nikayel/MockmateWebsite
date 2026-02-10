/**
 * GET/PATCH /api/spaced-repetition/settings
 *
 * Manage user's spaced repetition practice settings.
 *
 * GET Response:
 * - daily_goal: number (1-20, default 5)
 * - max_daily_reviews: number (5-30, default 10)
 *
 * PATCH Request Body:
 * - daily_goal?: number
 * - max_daily_reviews?: number
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { requireTier } from "@/lib/quota-enforcement"
import { getPracticeSettings, setDailyGoal, setMaxDailyReviews } from "@/lib/spaced-repetition"
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

    // Server-side tier gate: spaced repetition is a Pro feature
    const tierCheck = await requireTier(request, "pro")
    if (tierCheck.response) return tierCheck.response

    const userId = authResult.userId
    const settings = await getPracticeSettings(userId)

    return NextResponse.json(settings)
  } catch (error) {
    logger.error("Error fetching practice settings", { error })

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

interface SettingsUpdateBody {
  daily_goal?: number
  max_daily_reviews?: number
}

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

    // Server-side tier gate: spaced repetition is a Pro feature
    const tierCheck = await requireTier(request, "pro")
    if (tierCheck.response) return tierCheck.response

    const userId = authResult.userId
    const body: SettingsUpdateBody = await request.json()
    const { daily_goal, max_daily_reviews } = body

    // Update settings that were provided
    if (daily_goal !== undefined) {
      await setDailyGoal(userId, daily_goal)
    }

    if (max_daily_reviews !== undefined) {
      await setMaxDailyReviews(userId, max_daily_reviews)
    }

    // Return updated settings
    const settings = await getPracticeSettings(userId)

    logger.info("Practice settings updated", {
      userId,
      settings,
    })

    return NextResponse.json({
      success: true,
      ...settings,
    })
  } catch (error) {
    logger.error("Error updating practice settings", { error })

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
