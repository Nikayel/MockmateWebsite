/**
 * POST /api/spaced-repetition/skip
 *
 * Skip a problem with a small penalty to ease factor.
 *
 * Request Body:
 * - problem_id: string - The problem/scenario ID to skip
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-helpers';
import { skipProblem } from '@/lib/spaced-repetition';
import { logger } from '@/lib/logger';

interface SkipRequestBody {
  problem_id: string;
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
    const body: SkipRequestBody = await request.json();
    const { problem_id } = body;

    // Validate required fields
    if (!problem_id) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'problem_id is required' },
        { status: 400 }
      );
    }

    // Skip the problem
    await skipProblem(userId, problem_id);

    return NextResponse.json({
      success: true,
      message: 'Problem skipped. It will appear again tomorrow with a slight penalty.',
    });
  } catch (error) {
    logger.error('Error skipping problem', { error });

    // Handle case where problem mastery doesn't exist
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Not Found', message: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
