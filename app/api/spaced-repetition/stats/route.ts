/**
 * GET /api/spaced-repetition/stats
 *
 * Get mastery statistics for the authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-helpers';
import { getUserMasteryStats, getDailyGoalProgress } from '@/lib/spaced-repetition';

export async function GET(request: NextRequest) {
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

    // Get mastery statistics
    const stats = await getUserMasteryStats(userId);

    // Get daily goal progress
    const dailyProgress = await getDailyGoalProgress(userId);

    return NextResponse.json({
      ...stats,
      daily_goal: dailyProgress.daily_goal,
      daily_progress: dailyProgress.daily_progress,
      problems_today: dailyProgress.problems_today,
    });
  } catch (error) {
    console.error('Error getting mastery stats:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
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
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const body = await request.json();

    if (body.daily_goal !== undefined) {
      const { setDailyGoal } = await import('@/lib/spaced-repetition');
      await setDailyGoal(userId, body.daily_goal);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating stats:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
