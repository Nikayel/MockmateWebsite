/**
 * Admin Algorithm Research API
 *
 * GET /api/admin/algorithm-research
 * Returns comprehensive A/B testing comparison between SM-2 and FSRS algorithms
 *
 * Query params:
 * - refresh: boolean - Force regenerate aggregate comparison
 *
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAdminAccess } from '@/lib/admin/middleware'
import {
  getAlgorithmDistribution,
  migrateExistingUsers,
  getAggregateComparison,
  generateAggregateComparison,
  getRecentEvents,
} from '@/lib/spaced-repetition'
import type { AlgorithmComparisonAggregate } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    // Verify Admin SDK is initialized
    if (!adminDb) {
      return NextResponse.json(
        {
          success: false,
          error: 'Firebase Admin SDK not initialized.',
        },
        { status: 500 }
      )
    }

    // Verify admin access
    const authResult = await verifyAdminAccess(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 403 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'

    // Get algorithm distribution
    const distribution = await getAlgorithmDistribution()

    // Get or generate aggregate comparison
    let comparison: AlgorithmComparisonAggregate | null = null

    if (forceRefresh) {
      comparison = await generateAggregateComparison()
    } else {
      comparison = await getAggregateComparison()

      // If no comparison exists or it's older than 1 hour, regenerate
      if (!comparison || isStale(comparison.last_updated, 60)) {
        comparison = await generateAggregateComparison()
      }
    }

    // Get recent events for detailed analysis
    const recentEvents = await getRecentEvents(50)

    // Calculate additional insights
    const insights = calculateInsights(comparison)

    return NextResponse.json({
      success: true,
      data: {
        distribution,
        comparison,
        recentEvents: recentEvents.map((event) => ({
          id: event.id,
          algorithm: event.algorithm,
          score: event.score,
          quality_rating: event.quality_rating,
          pattern: event.pattern,
          difficulty: event.difficulty,
          pre_retention: event.pre_review.predicted_retention,
          actual_retention: event.actual_retention,
          retention_as_predicted: event.retention_as_predicted,
          interval_days: event.post_review.new_interval_days,
          timestamp: event.timestamp,
        })),
        insights,
        lastUpdated: comparison?.last_updated || new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Admin algorithm research API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/algorithm-research
 *
 * Actions:
 * - action: 'migrate' - Assign algorithms to users without one
 * - action: 'regenerate' - Force regenerate aggregate comparison
 */
export async function POST(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: 'Firebase Admin SDK not initialized.' },
        { status: 500 }
      )
    }

    const authResult = await verifyAdminAccess(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 403 }
      )
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'migrate': {
        const result = await migrateExistingUsers()
        return NextResponse.json({
          success: true,
          message: `Migrated ${result.migrated} users (SM-2: ${result.sm2_assigned}, FSRS: ${result.fsrs_assigned})`,
          data: result,
        })
      }

      case 'regenerate': {
        const comparison = await generateAggregateComparison()
        return NextResponse.json({
          success: true,
          message: 'Aggregate comparison regenerated',
          data: comparison,
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Admin algorithm research POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Check if timestamp is older than N minutes
 */
function isStale(timestamp: string, minutes: number): boolean {
  const then = new Date(timestamp).getTime()
  const now = Date.now()
  return now - then > minutes * 60 * 1000
}

/**
 * Calculate additional insights from the comparison data
 */
function calculateInsights(comparison: AlgorithmComparisonAggregate | null) {
  if (!comparison) {
    return {
      summary: 'Not enough data for insights yet.',
      recommendations: [],
      keyFindings: [],
    }
  }

  const { sm2, fsrs } = comparison
  const { comparison: comp } = comparison

  const keyFindings: string[] = []
  const recommendations: string[] = []

  // Sample size check
  if (!comp.sufficient_sample_size) {
    keyFindings.push(
      `Sample size insufficient: SM-2 has ${sm2.total_users} users, FSRS has ${fsrs.total_users} users. Need 30+ each for valid comparison.`
    )
    recommendations.push('Continue collecting data before drawing conclusions.')
  }

  // Retention rate comparison
  if (Math.abs(comp.retention_rate_difference) >= 5) {
    const winner = comp.retention_rate_difference > 0 ? 'FSRS' : 'SM-2'
    const diff = Math.abs(comp.retention_rate_difference)
    keyFindings.push(
      `${winner} shows ${diff}% higher retention rate (${winner === 'FSRS' ? fsrs : sm2}.average_retention_rate% vs ${winner === 'FSRS' ? sm2 : fsrs}.average_retention_rate%)`
    )
  }

  // Score comparison
  if (Math.abs(comp.average_score_difference) >= 3) {
    const winner = comp.average_score_difference > 0 ? 'FSRS' : 'SM-2'
    const diff = Math.abs(comp.average_score_difference)
    keyFindings.push(
      `${winner} users score ${diff} points higher on average`
    )
  }

  // Time to mastery
  if (comp.time_to_mastery_difference_days > 2) {
    keyFindings.push(
      `FSRS users master problems ${comp.time_to_mastery_difference_days} days faster on average`
    )
  } else if (comp.time_to_mastery_difference_days < -2) {
    keyFindings.push(
      `SM-2 users master problems ${Math.abs(comp.time_to_mastery_difference_days)} days faster on average`
    )
  }

  // Engagement
  if (Math.abs(comp.engagement_difference) >= 0.5) {
    const winner = comp.engagement_difference > 0 ? 'FSRS' : 'SM-2'
    keyFindings.push(
      `${winner} users complete ${Math.abs(comp.engagement_difference).toFixed(1)} more reviews per day`
    )
  }

  // Churn analysis
  if (sm2.churn_rate_30d > fsrs.churn_rate_30d + 10) {
    keyFindings.push(
      `SM-2 has ${sm2.churn_rate_30d - fsrs.churn_rate_30d}% higher 30-day churn rate`
    )
    recommendations.push('Consider switching new users to FSRS to reduce churn.')
  } else if (fsrs.churn_rate_30d > sm2.churn_rate_30d + 10) {
    keyFindings.push(
      `FSRS has ${fsrs.churn_rate_30d - sm2.churn_rate_30d}% higher 30-day churn rate`
    )
  }

  // Overall winner
  let summary = 'Results are inconclusive. Need more data.'
  if (comp.overall_winner && comp.confidence_level) {
    summary = `${comp.overall_winner.toUpperCase()} appears to be the better algorithm with ${comp.confidence_level}% confidence.`

    if (comp.overall_winner === 'fsrs') {
      recommendations.push(
        'Consider migrating all new users to FSRS algorithm.'
      )
      recommendations.push(
        'Prepare migration plan for existing SM-2 users.'
      )
    } else {
      recommendations.push(
        'Keep SM-2 as the default algorithm.'
      )
      recommendations.push(
        'Investigate why FSRS is underperforming - may need parameter tuning.'
      )
    }
  }

  return {
    summary,
    keyFindings,
    recommendations,
  }
}
