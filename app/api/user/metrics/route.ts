/**
 * User Metrics API
 *
 * Provides comprehensive metrics data for the user dashboard including:
 * - Overall statistics
 * - Pattern-based performance
 * - Performance trends
 * - Session history
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { getUserStats, getRecentSessions, getPerformanceTrends } from '@/lib/session-metrics'
import { getUserUsageSummary } from '@/lib/usage-tracking'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Get time range from query params
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30', 10)

    // Fetch all metrics in parallel
    const [stats, recentSessions, trends, usageSummary] = await Promise.all([
      getUserStats(userId),
      getRecentSessions(userId, 10),
      getPerformanceTrends(userId, days),
      getUserUsageSummary(userId),
    ])

    // Build response
    const response = {
      success: true,
      data: {
        overview: {
          totalSessions: stats?.totalSessions || 0,
          totalPracticeMinutes: stats?.totalPracticeMinutes || 0,
          totalPracticeHours: Math.round((stats?.totalPracticeMinutes || 0) / 6) / 10, // 1 decimal place
          averageScore: stats?.averageScore || 0,
          lastSessionAt: stats?.lastSessionAt || null,
        },
        patterns: Object.entries(stats?.patternStats || {}).map(([pattern, data]) => ({
          pattern,
          displayName: formatPatternName(pattern),
          sessions: data.sessions,
          averageScore: data.averageScore,
          bestScore: data.bestScore,
          proficiency: getProficiencyLevel(data.averageScore),
        })).sort((a, b) => b.sessions - a.sessions),
        difficulty: Object.entries(stats?.difficultyStats || {}).map(([difficulty, data]) => ({
          difficulty,
          sessions: data.sessions,
          averageScore: data.averageScore,
        })),
        trends: {
          daily: trends.daily,
          weeklyAverage: trends.weeklyAverage,
          trend: trends.trend,
          trendDescription: getTrendDescription(trends.trend),
        },
        recentSessions: recentSessions.map(session => ({
          id: session.sessionId,
          scenarioId: session.scenarioId,
          pattern: session.pattern,
          difficulty: session.difficulty,
          performanceScore: session.performanceScore,
          durationMinutes: session.durationMinutes,
          completedAt: session.completedAt,
          feedback: session.feedback?.level || 'average',
        })),
        usage: usageSummary ? {
          totalCost: usageSummary.totalCost,
          totalRequests: usageSummary.totalRequests,
          budgetUsedPercent: usageSummary.budgetUsedPercent,
          budgetRemaining: usageSummary.budgetRemaining,
        } : null,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[User Metrics API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}

// Helper functions
function formatPatternName(pattern: string): string {
  const names: Record<string, string> = {
    'arrays-hashing': 'Arrays & Hashing',
    'two-pointers': 'Two Pointers',
    'sliding-window': 'Sliding Window',
    'stack': 'Stack',
    'binary-search': 'Binary Search',
    'linked-list': 'Linked List',
    'trees': 'Trees',
    'heap': 'Heap / Priority Queue',
    'backtracking': 'Backtracking',
    'graphs': 'Graphs',
    'dp-1d': '1D Dynamic Programming',
    'dp-2d': '2D Dynamic Programming',
    'greedy': 'Greedy',
    'intervals': 'Intervals',
    'bit-manipulation': 'Bit Manipulation',
    'trie': 'Trie',
    'union-find': 'Union Find',
    'advanced-graphs': 'Advanced Graphs',
    'math-geometry': 'Math & Geometry',
  }
  return names[pattern] || pattern.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function getProficiencyLevel(score: number): 'novice' | 'learning' | 'practicing' | 'proficient' | 'expert' {
  if (score >= 90) return 'expert'
  if (score >= 75) return 'proficient'
  if (score >= 55) return 'practicing'
  if (score >= 35) return 'learning'
  return 'novice'
}

function getTrendDescription(trend: 'improving' | 'stable' | 'declining'): string {
  switch (trend) {
    case 'improving':
      return "You're making great progress! Keep up the momentum."
    case 'stable':
      return "Consistent performance. Try tackling harder problems to level up."
    case 'declining':
      return "Your scores have dipped. Consider reviewing fundamentals."
  }
}
