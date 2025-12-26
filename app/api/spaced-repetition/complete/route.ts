/**
 * POST /api/spaced-repetition/complete
 *
 * Record completion of a review session and update spaced repetition state.
 *
 * Request Body:
 * - problem_id: string - The problem/scenario ID
 * - performance_score: number - 0-100 score
 * - time_spent_minutes: number - Time spent on the problem
 * - hints_used: number - Number of hints used
 * - completed_at: string (optional) - ISO date string
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-helpers';
import { getScenarioById } from '@/lib/scenarios';
import { logger } from '@/lib/logger';
import {
  calculateNextInterval,
  updateProblemMastery,
  initializeProblemMasteryFromSession,
  getAllUserProblems,
  updateUserLearningStateSummary,
  getDailyGoalProgress,
} from '@/lib/spaced-repetition';
import { updateLearningStateAfterSession } from '@/lib/learning-state';
import type { DSAPattern } from '@/lib/types/dsa-patterns';
import type { Difficulty } from '@/lib/spaced-repetition';

interface CompleteRequestBody {
  problem_id: string;
  scenario_id?: string;
  performance_score: number;
  time_spent_minutes?: number;
  hints_used?: number;
  completed_at?: string;
}

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
    const body: CompleteRequestBody = await request.json();

    const {
      problem_id,
      scenario_id = problem_id,
      performance_score,
      time_spent_minutes = 0,
      hints_used = 0,
      completed_at = new Date().toISOString(),
    } = body;

    // Validate required fields
    if (!problem_id || performance_score === undefined) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'problem_id and performance_score are required' },
        { status: 400 }
      );
    }

    if (performance_score < 0 || performance_score > 100) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'performance_score must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Get scenario details
    const scenario = getScenarioById(scenario_id);
    if (!scenario) {
      return NextResponse.json(
        { error: 'Not Found', message: `Scenario ${scenario_id} not found` },
        { status: 404 }
      );
    }

    const pattern = (scenario as any).pattern as DSAPattern || 'arrays-hashing';
    const difficulty = scenario.difficulty as Difficulty;

    // Get existing problem mastery or create new
    const problems = await getAllUserProblems(userId);
    const existingMastery = problems.find((p) => p.problem_id === problem_id);

    let updatedMastery;

    if (existingMastery) {
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

      // Get learning state for streak
      const { adminDb } = await import('@/lib/firebase-admin');
      const learningStateDoc = await adminDb.collection('user_learning_state').doc(userId).get();
      const learningState = learningStateDoc.data();
      const streakDays = learningState?.streak_days || 0;

      const sm2Result = calculateNextInterval({
        previousInterval: existingMastery.interval_days,
        previousEaseFactor: existingMastery.ease_factor,
        performanceScore: performance_score,
        reviewCount: existingMastery.review_count,
        lastReviewDate: lastReviewAt,
        problemDifficulty: difficulty,
        streakDays,
        scoresHistory: existingMastery.scores_history,
        isEarlyReview,
        daysOverdue,
      });

      // Calculate next review date
      const nextReview = new Date(now);
      nextReview.setDate(nextReview.getDate() + sm2Result.nextInterval);

      // Update problem mastery
      updatedMastery = await updateProblemMastery(userId, problem_id, {
        performance_score,
        time_spent_minutes,
        hints_used,
        ease_factor: sm2Result.newEaseFactor,
        interval_days: sm2Result.nextInterval,
        review_count: existingMastery.review_count + 1,
        next_review_at: nextReview.toISOString(),
        mastery_level: sm2Result.masteryLevel,
        confidence: sm2Result.confidence,
      });
    } else {
      // Initialize new problem mastery
      updatedMastery = await initializeProblemMasteryFromSession(userId, {
        scenario_id,
        title: scenario.title,
        pattern,
        difficulty,
        performance_score,
        time_spent_minutes,
        hints_used,
      });
    }

    // Update legacy learning state for backwards compatibility
    await updateLearningStateAfterSession(userId, {
      topic: scenario.title,
      scenarioId: scenario_id,
      pattern,
      performanceScore: performance_score,
      completedAt: completed_at,
    });

    // Update aggregate user learning state
    await updateUserLearningStateSummary(userId);

    // Get daily progress
    const dailyProgress = await getDailyGoalProgress(userId);

    // Get updated streak
    const { adminDb } = await import('@/lib/firebase-admin');
    const learningStateDoc = await adminDb.collection('user_learning_state').doc(userId).get();
    const learningState = learningStateDoc.data();

    // Calculate XP earned (gamification)
    let xpEarned = 10; // Base XP
    if (performance_score >= 86) xpEarned += 40; // Perfect bonus
    else if (performance_score >= 70) xpEarned += 20; // Good bonus
    if (difficulty === 'hard') xpEarned *= 1.5;
    else if (difficulty === 'medium') xpEarned *= 1.2;

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
    });
  } catch (error) {
    logger.error('Error completing review', { error });
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
