/**
 * POST /api/spaced-repetition/skip
 *
 * Skip a problem with a small penalty to ease factor.
 * Records the skip in research tracking for A/B analysis.
 *
 * Request Body:
 * - problem_id: string - The problem/scenario ID to skip
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { requireTierForUser } from "@/lib/quota-enforcement"
import { skipProblem, recordSkippedReview } from "@/lib/spaced-repetition"
import { logger } from "@/lib/logger"
import { csrfProtection } from "@/lib/csrf"

interface SkipRequestBody {
  problem_id: string
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

    // Server-side tier gate: spaced repetition is a Pro feature
    const tierCheck = await requireTierForUser(authResult.userId, "pro")
    if (tierCheck.response) return tierCheck.response

    const userId = authResult.userId

    // Parse request body
    const body: SkipRequestBody = await request.json()
    const { problem_id } = body

    // Validate required fields
    if (!problem_id) {
      return NextResponse.json(
        { error: "Bad Request", message: "problem_id is required" },
        { status: 400 }
      )
    }

    // Skip the problem
    await skipProblem(userId, problem_id)

    // Record skip in research tracking for A/B analysis
    try {
      await recordSkippedReview(userId)
    } catch (researchError) {
      // Don't fail the skip if research tracking fails
      logger.error("Failed to record skipped review in research tracking", { error: researchError })
    }

    return NextResponse.json({
      success: true,
      message: "Problem skipped. It will appear again tomorrow with a slight penalty.",
    })
  } catch (error) {
    logger.error("Error skipping problem", { error })

    // Handle case where problem mastery doesn't exist
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { error: "Not Found", message: "Problem not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to skip problem" },
      { status: 500 }
    )
  }
}
