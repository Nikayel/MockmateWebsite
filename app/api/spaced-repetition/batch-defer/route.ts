/**
 * POST /api/spaced-repetition/batch-defer
 *
 * Batch defer low-priority problems to reduce review overload.
 * Integrates with both SM-2 and FSRS algorithms properly.
 *
 * Request Body:
 * - target_limit?: number - How many items to keep (default: user's max_daily_reviews)
 *
 * Response:
 * - deferred_count: number
 * - deferred_problem_ids: string[]
 * - remaining_due_count: number
 * - spread_days: number
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { batchDeferProblems, getMaxDailyReviews } from "@/lib/spaced-repetition"
import { logger } from "@/lib/logger"
import { csrfProtection } from "@/lib/csrf"

interface BatchDeferRequestBody {
  target_limit?: number
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: CSRF protection for state-changing operation
    const csrfResult = csrfProtection(request)
    if (csrfResult) {
      return csrfResult
    }

    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: authResult.error },
        { status: 401 }
      )
    }

    const userId = authResult.userId

    // Parse request body
    const body: BatchDeferRequestBody = await request.json()
    let { target_limit } = body

    // Use user's max_daily_reviews if no target specified
    if (!target_limit) {
      target_limit = await getMaxDailyReviews(userId)
    }

    // Validate target_limit range
    target_limit = Math.max(1, Math.min(50, target_limit))

    // Perform batch deferral
    const result = await batchDeferProblems(userId, target_limit)

    logger.info("Batch defer completed", {
      userId,
      targetLimit: target_limit,
      deferredCount: result.deferred_count,
      spreadDays: result.spread_days,
    })

    return NextResponse.json({
      success: true,
      ...result,
      message:
        result.deferred_count > 0
          ? `Deferred ${result.deferred_count} items across ${result.spread_days} days. They'll be treated as "struggled" reviews.`
          : "No items needed to be deferred.",
    })
  } catch (error) {
    logger.error("Error in batch defer", { error })

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
