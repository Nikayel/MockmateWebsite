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

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-helpers';
import { getScenarioById, scenarios } from '@/lib/scenarios';
import { logger } from '@/lib/logger';
import {
  calculateNextInterval,
  updateProblemMastery,
  getAllUserProblems,
  updateUserLearningStateSummary,
} from '@/lib/spaced-repetition';
import type { Difficulty } from '@/lib/spaced-repetition';

interface MarkReviewedRequestBody {
  problem_id: string;
  scenario_id: string;
}

const DEFAULT_MANUAL_REVIEW_SCORE = 75; // Assume decent performance for manual reviews

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.userId;

    // Parse request body
    const body: MarkReviewedRequestBody = await request.json();
    const { problem_id, scenario_id } = body;

    // Validate required fields
    if (!problem_id) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'problem_id is required' },
        { status: 400 }
      );
    }

    // Get existing problem mastery
    const problems = await getAllUserProblems(userId);
    const existingMastery = problems.find((p) => p.problem_id === problem_id);

    if (!existingMastery) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Problem mastery record not found. Complete the problem first.' },
        { status: 404 }
      );
    }

    // Try to find the scenario for canonical difficulty
    let scenario = getScenarioById(scenario_id);
    if (!scenario) {
      // Try by title
      scenario = scenarios.find(s => s.title === existingMastery.title);
    }
    const difficulty = (scenario?.difficulty || existingMastery.difficulty) as Difficulty;

    // Calculate next interval using SM-2
    const now = new Date();
    const lastReviewAt = new Date(existingMastery.last_reviewed_at);
    const daysSinceReview = Math.floor(
      (now.getTime() - lastReviewAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const nextReviewAt = new Date(existingMastery.next_review_at);
    const daysOverdue = nextReviewAt < now
      ? Math.floor((now.getTime() - nextReviewAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const isEarlyReview = nextReviewAt > now;

    const sm2Result = calculateNextInterval({
      previousInterval: existingMastery.interval_days,
      previousEaseFactor: existingMastery.ease_factor,
      performanceScore: DEFAULT_MANUAL_REVIEW_SCORE,
      reviewCount: existingMastery.review_count,
      lastReviewDate: lastReviewAt,
      problemDifficulty: difficulty,
      scoresHistory: existingMastery.scores_history,
      isEarlyReview,
      daysOverdue,
    });

    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + sm2Result.nextInterval);

    // Update problem mastery
    const updatedMastery = await updateProblemMastery(userId, problem_id, {
      performance_score: DEFAULT_MANUAL_REVIEW_SCORE,
      time_spent_minutes: 0,
      hints_used: 0,
      ease_factor: sm2Result.newEaseFactor,
      interval_days: sm2Result.nextInterval,
      review_count: existingMastery.review_count + 1,
      next_review_at: nextReview.toISOString(),
      mastery_level: sm2Result.masteryLevel,
      confidence: sm2Result.confidence,
    });

    // Update learning state summary
    await updateUserLearningStateSummary(userId);

    return NextResponse.json({
      success: true,
      message: 'Problem marked as reviewed',
      data: {
        problem_id: updatedMastery.problem_id,
        next_review_at: updatedMastery.next_review_at,
        interval_days: updatedMastery.interval_days,
        mastery_level: updatedMastery.mastery_level,
        review_count: updatedMastery.review_count,
      },
    });
  } catch (error: any) {
    logger.error('Error marking problem as reviewed', { error });
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
