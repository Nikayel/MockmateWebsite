/**
 * POST /api/spaced-repetition/complete
 *
 * Record completion of a review session and update spaced repetition state.
 *
 * Request Body:
 * - problem_id: string - The problem/scenario ID
 * - performance_score: number - 0-100 interview score (includes communication)
 * - mastery_score: number (optional) - 0-100 code-focused score for SR algorithm
 * - time_spent_minutes: number - Time spent on the problem
 * - hints_used: number - Number of hints used
 * - test_cases_passed: number (optional) - For mastery score calculation
 * - test_cases_total: number (optional) - For mastery score calculation
 * - completed_at: string (optional) - ISO date string
 *
 * Note: The spaced repetition algorithm uses mastery_score (code correctness)
 * rather than performance_score (which includes communication skills).
 * This separation ensures SR focuses on cognitive retention of patterns,
 * not interview soft skills.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth } from "@/lib/auth-helpers"
import { requireTierForUser } from "@/lib/quota-enforcement"
import { getScenarioById } from "@/lib/scenarios"
import { logger } from "@/lib/logger"
import { csrfProtection } from "@/lib/csrf"
import { apiRateLimit } from "@/lib/rate-limit"
import {
  updateProblemMastery,
  initializeProblemMasteryFromSession,
  getAllUserProblems,
  updateUserLearningStateSummary,
  getDailyGoalProgress,
  // Algorithm Router (A/B Testing)
  getUserAlgorithm,
  calculateNextReview,
  reconstructState,
  prepareStateForStorage,
  estimateRetentionForAlgorithm,
  // Research Tracking
  recordReviewEvent,
  // Mastery Score (code-focused scoring for SR)
  quickMasteryScore,
  // Quality mapping (shared with the schedulers so research logs match reality)
  mapScoreToQuality,
  mapPerformanceToFSRSRating,
} from "@/lib/spaced-repetition"
import { updateLearningStateAfterSession } from "@/lib/learning-state"
import { triggerSessionNotifications } from "@/lib/services/session-notifications"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import { resolvePatternForScenario } from "@/lib/spaced-repetition/pattern-resolution"
import type { Difficulty } from "@/lib/spaced-repetition"
import type { SpacedRepetitionMasteryLevel } from "@/lib/types"

// Every numeric here feeds mastery/streak/research state, so out-of-range values
// are rejected instead of trusted (a user could otherwise inflate their own
// mastery inputs). Ranges are deliberately generous versus real sessions.
const completeRequestSchema = z.object({
  problem_id: z.string().min(1).max(256),
  scenario_id: z.string().min(1).max(256).optional(),
  performance_score: z.number().min(0).max(100), // Interview score (includes communication)
  mastery_score: z.number().min(0).max(100).optional(), // Code-focused score for SR (calculated if not provided)
  time_spent_minutes: z.number().min(0).max(1440).default(0),
  hints_used: z.number().int().min(0).max(100).default(0),
  test_cases_passed: z.number().int().min(0).max(1000).default(0), // For mastery score calculation
  test_cases_total: z.number().int().min(0).max(1000).default(0), // For mastery score calculation
  completed_at: z.string().datetime().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (shared per-IP API limit)
    const rateLimitResponse = await apiRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

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

    // Parse + validate request body (rejects out-of-range numerics before they
    // reach mastery/streak calculations)
    const parsed = completeRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return NextResponse.json(
        {
          error: "Bad Request",
          message: issue
            ? `${issue.path.join(".") || "body"}: ${issue.message}`
            : "Invalid request body",
        },
        { status: 400 }
      )
    }

    const {
      problem_id,
      scenario_id = problem_id,
      performance_score,
      mastery_score: providedMasteryScore,
      time_spent_minutes,
      hints_used,
      test_cases_passed,
      test_cases_total,
      completed_at = new Date().toISOString(),
    } = parsed.data

    // Get scenario details
    const scenario = getScenarioById(scenario_id)
    if (!scenario) {
      return NextResponse.json(
        { error: "Not Found", message: `Scenario ${scenario_id} not found` },
        { status: 404 }
      )
    }

    // Non-DSA scenarios (system design, labs) bucket under "case-lab" —
    // they used to silently mis-tag as "arrays-hashing".
    const pattern: DSAPattern = resolvePatternForScenario(
      scenario as { type?: string; pattern?: string }
    )
    const difficulty = scenario.difficulty as Difficulty

    // Calculate mastery score for spaced repetition
    // This is separate from performance_score - it focuses on code correctness, not communication
    const masteryScore =
      providedMasteryScore ??
      quickMasteryScore({
        performanceScore: performance_score,
        testCasesPassed: test_cases_passed,
        testCasesTotal: test_cases_total,
        timeSpentMinutes: time_spent_minutes,
        hintsUsed: hints_used,
        problemDifficulty: difficulty,
      })

    logger.info("SR scoring", {
      userId,
      problemId: problem_id,
      performanceScore: performance_score, // Interview score (with communication)
      masteryScore, // Code-focused score (for SR)
      scoreDifference: performance_score - masteryScore,
    })

    // Get existing problem mastery or create new
    const problems = await getAllUserProblems(userId)
    const existingMastery = problems.find((p) => p.problem_id === problem_id)

    let updatedMastery

    // Get user's assigned algorithm (SM-2 or FSRS)
    const userAlgorithm = await getUserAlgorithm(userId)

    if (existingMastery) {
      // Calculate next interval using user's assigned algorithm
      const now = new Date()
      const lastReviewAt = new Date(existingMastery.last_reviewed_at)
      const daysSinceReview = Math.floor(
        (now.getTime() - lastReviewAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      const nextReviewAt = new Date(existingMastery.next_review_at)
      const daysOverdue =
        nextReviewAt < now
          ? Math.floor((now.getTime() - nextReviewAt.getTime()) / (1000 * 60 * 60 * 24))
          : 0
      const isEarlyReview = nextReviewAt > now

      // Get learning state for streak
      const { adminDb } = await import("@/lib/firebase-admin")
      const learningStateDoc = await adminDb.collection("user_learning_state").doc(userId).get()
      const learningState = learningStateDoc.data()
      const streakDays = learningState?.streak_days || 0

      // Reconstruct algorithm state from stored data (including scores_history for SM-2).
      // FSRS fields MUST be passed too, otherwise the card is rebuilt from defaults
      // (difficulty=5, stability=interval) and the learned difficulty/stability/lapses
      // are lost on every review, defeating FSRS.
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

      // Calculate next review using algorithm router (A/B testing)
      // Pass mastery_score for SR calculations (code-focused, excludes communication)
      const reviewResult = await calculateNextReview(userId, currentState, {
        performance_score,
        mastery_score: masteryScore, // Code-focused score for SR algorithm
        time_spent_minutes,
        hints_used,
        problem_difficulty: difficulty,
        is_early_review: isEarlyReview,
        days_overdue: daysOverdue,
        streak_days: streakDays,
      })

      // Prepare storage data (don't include review_count - it will be incremented atomically)
      const storageData = prepareStateForStorage({
        algorithm: reviewResult.algorithm,
        interval_days: reviewResult.next_interval_days,
        next_review_at: reviewResult.next_review_at,
        review_count: existingMastery.review_count + 1, // For FSRS state only
        mastery_level: reviewResult.mastery_level,
        confidence: reviewResult.confidence,
        ease_factor: reviewResult.ease_factor,
        fsrs_state: reviewResult.fsrs_state,
      })

      // Remove review_count from storageData - we'll increment it atomically
      const { review_count: _, ...storageDataWithoutCount } = storageData as Record<string, unknown>

      // Update problem mastery with atomic increment for review_count
      // Pass last_score as masteryScore so last_score reflects code-focused score (what SR uses)
      updatedMastery = await updateProblemMastery(userId, problem_id, {
        performance_score,
        last_score: masteryScore, // Code-focused score for last_score display
        time_spent_minutes,
        hints_used,
        increment_review_count: true, // Use atomic increment
        ...storageDataWithoutCount,
      })

      // Record research event for A/B testing analysis
      try {
        await recordReviewEvent({
          userId,
          problemId: problem_id,
          scenarioId: scenario_id,
          pattern,
          difficulty,
          score: performance_score,
          masteryScore: masteryScore, // Code-focused score for research comparison
          qualityRating: reviewResult.quality_rating,
          timeSpentMinutes: time_spent_minutes,
          hintsUsed: hints_used,
          preReviewState: {
            intervalDays: existingMastery.interval_days,
            daysSinceLastReview: daysSinceReview,
            daysOverdue,
            easeFactor: existingMastery.ease_factor,
            stability: currentState.fsrs_state?.stability,
            predictedRetention,
            masteryLevel: existingMastery.mastery_level as SpacedRepetitionMasteryLevel,
            // Full pre-review card so a challenge can replay this review with
            // a corrected rating (learner-model amendment).
            fsrsCard: currentState.fsrs_state ? JSON.stringify(currentState.fsrs_state) : undefined,
          },
          postReviewState: {
            newIntervalDays: reviewResult.next_interval_days,
            newEaseFactor: reviewResult.ease_factor,
            newStability: reviewResult.fsrs_state?.stability,
            masteryLevel: reviewResult.mastery_level,
            fsrsCard: reviewResult.fsrs_state ? JSON.stringify(reviewResult.fsrs_state) : undefined,
          },
          isEarlyReview,
          isFirstReview: false,
          sessionNumber: existingMastery.review_count + 1,
        })
      } catch (researchError) {
        // Don't fail the request if research tracking fails
        logger.error("Failed to record research event", { error: researchError })
      }
    } else {
      // Initialize new problem mastery
      // Pass mastery_score so last_score reflects code-focused score (what SR uses)
      updatedMastery = await initializeProblemMasteryFromSession(userId, {
        scenario_id,
        title: scenario.title,
        pattern,
        difficulty,
        performance_score,
        mastery_score: masteryScore, // Code-focused score for last_score display
        time_spent_minutes,
        hints_used,
      })

      // Record research event for first review
      try {
        // Use the same quality mapping the schedulers use, on the same
        // mastery_score they schedule from, so research logs match reality.
        // SM-2 quality (0-5): mapScoreToQuality. FSRS rating (1-4): mapPerformanceToFSRSRating.
        const expectedMinutes = difficulty === "easy" ? 10 : difficulty === "medium" ? 20 : 30
        const timeRatio = time_spent_minutes > 0 ? time_spent_minutes / expectedMinutes : 1.0
        const qualityRating =
          userAlgorithm === "fsrs"
            ? mapPerformanceToFSRSRating(masteryScore, hints_used, timeRatio)
            : mapScoreToQuality(masteryScore)

        await recordReviewEvent({
          userId,
          problemId: problem_id,
          scenarioId: scenario_id,
          pattern,
          difficulty,
          score: performance_score,
          masteryScore: masteryScore, // Code-focused score for research comparison
          qualityRating,
          timeSpentMinutes: time_spent_minutes,
          hintsUsed: hints_used,
          preReviewState: {
            intervalDays: 0,
            daysSinceLastReview: 0,
            daysOverdue: 0,
            predictedRetention: 0,
            masteryLevel: "new",
          },
          postReviewState: {
            newIntervalDays: updatedMastery.interval_days,
            newEaseFactor: updatedMastery.ease_factor,
            newStability: updatedMastery.fsrs_stability,
            masteryLevel: updatedMastery.mastery_level as SpacedRepetitionMasteryLevel,
            fsrsCard: updatedMastery.fsrs_state,
          },
          isEarlyReview: false,
          isFirstReview: true,
          sessionNumber: 1,
        })
      } catch (researchError) {
        logger.error("Failed to record research event for new problem", { error: researchError })
      }
    }

    // Update legacy learning state for backwards compatibility
    await updateLearningStateAfterSession(userId, {
      topic: scenario.title,
      scenarioId: scenario_id,
      pattern,
      performanceScore: performance_score,
      completedAt: completed_at,
    })

    // Update aggregate user learning state
    await updateUserLearningStateSummary(userId)

    // Get daily progress
    const dailyProgress = await getDailyGoalProgress(userId)

    // Get updated streak and problems count
    const { adminDb: adminDbForNotifications } = await import("@/lib/firebase-admin")
    const [learningStateDoc, problemsCountSnapshot] = await Promise.all([
      adminDbForNotifications.collection("user_learning_state").doc(userId).get(),
      adminDbForNotifications
        .collection("problem_mastery")
        .doc(userId)
        .collection("problems")
        .count()
        .get(),
    ])
    const learningState = learningStateDoc.data()
    const problemsSolvedTotal = problemsCountSnapshot.data().count

    // Trigger smart notifications (milestones, weak patterns, etc.)
    // Run async but with proper error handling and logging
    ;(async () => {
      try {
        await triggerSessionNotifications({
          userId,
          problemId: problem_id,
          scenarioId: scenario_id,
          pattern,
          performanceScore: performance_score,
          masteryScore,
          timeSpentMinutes: time_spent_minutes,
          hintsUsed: hints_used,
          streakDays: learningState?.streak_days || 0,
          problemsSolvedTotal,
          isNewProblem: !existingMastery,
        })
        logger.info("Session notifications triggered successfully", {
          userId,
          problemId: problem_id,
        })
      } catch (err) {
        // Log the full error with stack trace for debugging
        logger.error("Session notification error", {
          error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
          userId,
          problemId: problem_id,
        })
      }
    })()

    // Calculate XP earned (gamification)
    let xpEarned = 10 // Base XP
    if (performance_score >= 86)
      xpEarned += 40 // Perfect bonus
    else if (performance_score >= 70) xpEarned += 20 // Good bonus
    if (difficulty === "hard") xpEarned *= 1.5
    else if (difficulty === "medium") xpEarned *= 1.2

    return NextResponse.json({
      success: true,
      next_review_at: updatedMastery.next_review_at,
      interval_days: updatedMastery.interval_days,
      mastery_level: updatedMastery.mastery_level,
      confidence: updatedMastery.confidence,
      streak_days: learningState?.streak_days || 1,
      daily_progress: dailyProgress.daily_progress,
      daily_goal: dailyProgress.daily_goal,
      xp_earned: Math.round(xpEarned),
      achievements_unlocked: [], // TODO: Implement achievements
    })
  } catch (error) {
    logger.error("Error completing review", { error })
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to record review completion",
      },
      { status: 500 }
    )
  }
}
