/**
 * POST /api/spaced-repetition/mark-reviewed
 *
 * Mark a problem as manually reviewed (practiced elsewhere, e.g., LeetCode).
 * Uses a default score of 75% to continue the learning progression.
 *
 * Request Body:
 * - problem_id: string - The problem ID
 * - scenario_id: string - The scenario ID
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { requireTier } from "@/lib/quota-enforcement"
import { getScenarioById, scenarios } from "@/lib/scenarios"
import { logger } from "@/lib/logger"
import { csrfProtection } from "@/lib/csrf"
import {
  updateProblemMastery,
  getAllUserProblems,
  updateUserLearningStateSummary,
  // Algorithm Router (A/B Testing)
  getUserAlgorithm,
  calculateNextReview,
  reconstructState,
  prepareStateForStorage,
  estimateRetentionForAlgorithm,
  // Research Tracking
  recordReviewEvent,
} from "@/lib/spaced-repetition"
import type { Difficulty } from "@/lib/spaced-repetition"
import type { SpacedRepetitionMasteryLevel } from "@/lib/types"

interface MarkReviewedRequestBody {
  problem_id: string
  scenario_id: string
}

const DEFAULT_MANUAL_REVIEW_SCORE = 75 // Assume decent performance for manual reviews

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
    const tierCheck = await requireTier(request, "pro")
    if (tierCheck.response) return tierCheck.response

    const userId = authResult.userId

    // Parse request body
    const body: MarkReviewedRequestBody = await request.json()
    const { problem_id, scenario_id } = body

    // Validate required fields
    if (!problem_id) {
      return NextResponse.json(
        { error: "Bad Request", message: "problem_id is required" },
        { status: 400 }
      )
    }

    // Get existing problem mastery
    const problems = await getAllUserProblems(userId)
    const existingMastery = problems.find((p) => p.problem_id === problem_id)

    if (!existingMastery) {
      return NextResponse.json(
        {
          error: "Not Found",
          message: "Problem mastery record not found. Complete the problem first.",
        },
        { status: 404 }
      )
    }

    // Try to find the scenario for canonical difficulty
    let scenario = getScenarioById(scenario_id)
    if (!scenario) {
      // Try by title
      scenario = scenarios.find((s) => s.title === existingMastery.title)
    }
    const difficulty = (scenario?.difficulty || existingMastery.difficulty) as Difficulty

    // Get user's assigned algorithm
    const userAlgorithm = await getUserAlgorithm(userId)

    // Calculate next interval using user's assigned algorithm
    const now = new Date()
    const lastReviewAt = new Date(existingMastery.last_reviewed_at)
    const daysSinceReview = Math.floor(
      (now.getTime() - lastReviewAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    const nextReviewAtDate = new Date(existingMastery.next_review_at)
    const daysOverdue =
      nextReviewAtDate < now
        ? Math.floor((now.getTime() - nextReviewAtDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0
    const isEarlyReview = nextReviewAtDate > now

    // Reconstruct algorithm state
    // Include scores_history for consecutive perfect score detection in SM-2.
    // FSRS fields MUST be passed too, otherwise the card is rebuilt from defaults
    // (difficulty=5, stability=interval) and the learned state is lost each review.
    const currentState = reconstructState(userAlgorithm, {
      interval_days: existingMastery.interval_days,
      next_review_at: existingMastery.next_review_at,
      review_count: existingMastery.review_count,
      mastery_level: existingMastery.mastery_level as SpacedRepetitionMasteryLevel,
      confidence: existingMastery.confidence,
      ease_factor: existingMastery.ease_factor,
      last_reviewed_at: existingMastery.last_reviewed_at,
      scores_history: existingMastery.scores_history,
      fsrs_difficulty: existingMastery.fsrs_difficulty,
      fsrs_stability: existingMastery.fsrs_stability,
      fsrs_state: existingMastery.fsrs_state,
      fsrs_lapses: existingMastery.fsrs_lapses,
    })

    // Estimate pre-review retention
    const predictedRetention = estimateRetentionForAlgorithm(
      userAlgorithm,
      currentState,
      daysSinceReview
    )

    // Calculate next review using algorithm router
    const reviewResult = await calculateNextReview(userId, currentState, {
      performance_score: DEFAULT_MANUAL_REVIEW_SCORE,
      mastery_score: DEFAULT_MANUAL_REVIEW_SCORE, // Same for manual reviews (no detailed metrics)
      time_spent_minutes: 0,
      hints_used: 0,
      problem_difficulty: difficulty,
      is_early_review: isEarlyReview,
      days_overdue: daysOverdue,
    })

    // Prepare storage data
    const storageData = prepareStateForStorage({
      algorithm: reviewResult.algorithm,
      interval_days: reviewResult.next_interval_days,
      next_review_at: reviewResult.next_review_at,
      review_count: existingMastery.review_count + 1,
      mastery_level: reviewResult.mastery_level,
      confidence: reviewResult.confidence,
      ease_factor: reviewResult.ease_factor,
      fsrs_state: reviewResult.fsrs_state,
    })

    // Update problem mastery
    // NOTE: Use increment_review_count for atomic increment to prevent race conditions
    const updatedMastery = await updateProblemMastery(userId, problem_id, {
      performance_score: DEFAULT_MANUAL_REVIEW_SCORE,
      time_spent_minutes: 0,
      hints_used: 0,
      ...storageData,
      increment_review_count: true, // Atomic increment prevents race conditions
    })

    // Record research event
    try {
      await recordReviewEvent({
        userId,
        problemId: problem_id,
        scenarioId: scenario_id,
        pattern: existingMastery.pattern,
        difficulty,
        score: DEFAULT_MANUAL_REVIEW_SCORE,
        masteryScore: DEFAULT_MANUAL_REVIEW_SCORE, // Same as score for manual reviews (no detailed metrics)
        qualityRating: reviewResult.quality_rating,
        timeSpentMinutes: 0,
        hintsUsed: 0,
        preReviewState: {
          intervalDays: existingMastery.interval_days,
          daysSinceLastReview: daysSinceReview,
          daysOverdue,
          easeFactor: existingMastery.ease_factor,
          stability: currentState.fsrs_state?.stability,
          predictedRetention,
          masteryLevel: existingMastery.mastery_level as SpacedRepetitionMasteryLevel,
        },
        postReviewState: {
          newIntervalDays: reviewResult.next_interval_days,
          newEaseFactor: reviewResult.ease_factor,
          newStability: reviewResult.fsrs_state?.stability,
          masteryLevel: reviewResult.mastery_level,
        },
        isEarlyReview,
        isFirstReview: false,
        sessionNumber: existingMastery.review_count + 1,
      })
    } catch (researchError) {
      logger.error("Failed to record research event for manual review", { error: researchError })
    }

    // Update learning state summary
    await updateUserLearningStateSummary(userId)

    return NextResponse.json({
      success: true,
      message: "Problem marked as reviewed",
      data: {
        problem_id: updatedMastery.problem_id,
        next_review_at: updatedMastery.next_review_at,
        interval_days: updatedMastery.interval_days,
        mastery_level: updatedMastery.mastery_level,
        review_count: updatedMastery.review_count,
      },
    })
  } catch (error: any) {
    logger.error("Error marking problem as reviewed", { error })
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    )
  }
}
