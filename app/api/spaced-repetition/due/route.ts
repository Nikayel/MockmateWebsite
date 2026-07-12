/**
 * GET /api/spaced-repetition/due
 *
 * Get problems due for review for the authenticated user.
 *
 * Query Parameters:
 * - limit: Maximum number of problems per category (default: 10)
 * - pattern: Filter by DSA pattern
 * - difficulty: Filter by difficulty (easy, medium, hard)
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { requireTierForUser } from "@/lib/quota-enforcement"
import { getDueProblems, getMaxDailyReviews } from "@/lib/spaced-repetition"
import { logger } from "@/lib/logger"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type { Difficulty } from "@/lib/spaced-repetition"

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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "10", 10)
    const pattern = searchParams.get("pattern") as DSAPattern | null
    const difficulty = searchParams.get("difficulty") as Difficulty | null

    // Get due problems - show ALL upcoming, not just 7 days
    // Users should see their full review queue regardless of when it's due
    const dueQueue = await getDueProblems(userId, {
      limit: limit * 3, // Increase limit for full view
      pattern: pattern || undefined,
      difficulty: difficulty || undefined,
      includeUpcoming: true,
      upcomingDays: 365, // Show all problems due within a year
    })

    // Get user's max_daily_reviews setting to determine if overwhelmed
    const maxDailyReviews = await getMaxDailyReviews(userId)
    const totalDue = dueQueue.stats.total_due
    const isOverwhelmed = totalDue > maxDailyReviews

    return NextResponse.json({
      ...dueQueue,
      settings: {
        max_daily_reviews: maxDailyReviews,
        is_overwhelmed: isOverwhelmed,
        defer_count: isOverwhelmed ? totalDue - maxDailyReviews : 0,
      },
    })
  } catch (error) {
    logger.error("Error getting due problems", { error })
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
