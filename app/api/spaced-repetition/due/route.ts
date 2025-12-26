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

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-helpers';
import { getDueProblems } from '@/lib/spaced-repetition';
import { logger } from '@/lib/logger';
import type { DSAPattern } from '@/lib/types/dsa-patterns';
import type { Difficulty } from '@/lib/spaced-repetition';

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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const pattern = searchParams.get('pattern') as DSAPattern | null;
    const difficulty = searchParams.get('difficulty') as Difficulty | null;

    // Get due problems
    const dueQueue = await getDueProblems(userId, {
      limit,
      pattern: pattern || undefined,
      difficulty: difficulty || undefined,
      includeUpcoming: true,
      upcomingDays: 7,
    });

    return NextResponse.json(dueQueue);
  } catch (error) {
    logger.error('Error getting due problems', { error });
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
