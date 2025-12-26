/**
 * User Usage API
 *
 * Returns usage data for the authenticated user.
 * Shows tokens used, costs, and breakdown by service.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import '@/lib/firebase-admin' // Initialize Firebase Admin
import {
  getUserUsageSummary,
  getUserServiceBreakdown,
  BUDGET_CAPS,
} from '@/lib/usage-tracking'

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    // Get user's usage summary
    const summary = await getUserUsageSummary(userId)
    const serviceBreakdown = await getUserServiceBreakdown(userId)

    if (!summary) {
      // No usage yet - return empty data
      return NextResponse.json({
        success: true,
        data: {
          period: {
            start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
            end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
          },
          budget: {
            cap: BUDGET_CAPS.free,
            used: 0,
            remaining: BUDGET_CAPS.free,
            usedPercent: 0,
          },
          totals: {
            requests: 0,
            tokens: 0,
            cost: 0,
          },
          services: {
            llm: { requests: 0, tokens: 0, cost: 0 },
            voice: { requests: 0, durationSeconds: 0, cost: 0 },
            embeddings: { requests: 0, characterCount: 0, cost: 0 },
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        period: {
          start: summary.periodStart,
          end: summary.periodEnd,
        },
        budget: {
          cap: summary.budgetCap,
          used: summary.totalCost,
          remaining: summary.budgetRemaining,
          usedPercent: summary.budgetUsedPercent,
        },
        totals: {
          requests: summary.totalRequests,
          tokens: summary.totalTokens,
          cost: summary.totalCost,
        },
        services: serviceBreakdown,
        cacheStats: {
          hits: summary.cacheHits,
          misses: summary.cacheMisses,
          hitRate: summary.cacheHits + summary.cacheMisses > 0
            ? (summary.cacheHits / (summary.cacheHits + summary.cacheMisses)) * 100
            : 0,
        },
      },
    })

  } catch (error) {
    console.error('[User Usage API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    )
  }
}
