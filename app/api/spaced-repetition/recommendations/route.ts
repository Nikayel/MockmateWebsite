/**
 * GET /api/spaced-repetition/recommendations
 *
 * Get smart practice recommendations using RAG.
 *
 * Query Parameters:
 * - limit: Maximum number of recommendations (default: 5)
 * - pattern: Filter by specific pattern
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-helpers';
import {
  getSmartRecommendations,
  getPatternRecommendations,
} from '@/lib/spaced-repetition';
import type { DSAPattern } from '@/lib/types/dsa-patterns';

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
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const pattern = searchParams.get('pattern') as DSAPattern | null;

    let recommendations;

    if (pattern) {
      // Get pattern-specific recommendations
      recommendations = await getPatternRecommendations(userId, pattern, limit);
    } else {
      // Get smart recommendations across all patterns
      recommendations = await getSmartRecommendations(userId, limit);
    }

    return NextResponse.json({
      recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
