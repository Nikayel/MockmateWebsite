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
          id: event.id || '',
          algorithm: event.algorithm || 'sm2',
          score: event.score ?? 0,
          quality_rating: event.quality_rating ?? 0,
          pattern: event.pattern || 'Unknown',
          difficulty: event.difficulty || 'medium',
          pre_retention: event.pre_review?.predicted_retention ?? 0,
          actual_retention: event.actual_retention ?? false,
          retention_as_predicted: event.retention_as_predicted ?? false,
          interval_days: event.post_review?.new_interval_days ?? 0,
          timestamp: event.timestamp || new Date().toISOString(),
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

      case 'migrate-notification-preferences': {
        // Backfill notification preferences for existing users
        const profiles = await adminDb.collection('profiles').get()
        let migrated = 0
        const batch = adminDb.batch()

        profiles.docs.forEach((doc) => {
          const data = doc.data()
          if (!data.notification_preferences) {
            batch.update(doc.ref, {
              notification_preferences: {
                email_notifications_enabled: true,
                inactivity_reminders: true,
                spaced_repetition_reminders: true,
                milestone_celebrations: true,
                marketing_emails: false,
              },
            })
            migrated++
          }
        })

        if (migrated > 0) {
          await batch.commit()
        }

        return NextResponse.json({
          success: true,
          message: `Added notification preferences to ${migrated} users`,
          data: { migrated },
        })
      }

      case 'backfill-research': {
        // Backfill research data from existing problem mastery and session summaries
        // This populates algorithm_research_metrics for users who practiced before tracking was added
        const result = await backfillResearchData()
        return NextResponse.json({
          success: true,
          message: `Backfilled research data for ${result.usersProcessed} users (${result.researchSummariesCreated} research summaries, ${result.userStatsUpdated} user_stats)`,
          data: result,
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
 * Backfill research data from existing problem mastery and session summaries
 * This creates algorithm_research_metrics/summary documents for users who practiced
 * before research tracking was added, and updates user_stats if missing
 */
async function backfillResearchData(): Promise<{
  usersProcessed: number
  researchSummariesCreated: number
  userStatsUpdated: number
  errors: string[]
}> {
  const result = {
    usersProcessed: 0,
    researchSummariesCreated: 0,
    userStatsUpdated: 0,
    errors: [] as string[],
  }

  try {
    // Get all user profiles
    const profilesSnap = await adminDb.collection('profiles').get()
    const userIds = profilesSnap.docs.map(doc => doc.id)

    for (const userId of userIds) {
      try {
        result.usersProcessed++

        // Get user's algorithm assignment
        const profileData = profilesSnap.docs.find(d => d.id === userId)?.data()
        const algorithm = (profileData?.spaced_repetition_algorithm || 'sm2') as 'sm2' | 'fsrs'

        // Check if research summary already exists
        const existingSummary = await adminDb
          .collection('algorithm_research_metrics')
          .doc(userId)
          .collection('summary')
          .doc('current')
          .get()

        // Get problem mastery data
        const masterySnap = await adminDb
          .collection('user_problem_mastery')
          .doc(userId)
          .collection('problems')
          .get()

        // Get session summaries
        const sessionsSnap = await adminDb
          .collection('users')
          .doc(userId)
          .collection('session_summaries')
          .orderBy('completedAt', 'desc')
          .limit(100)
          .get()

        const sessions = sessionsSnap.docs.map(d => d.data())
        const masteryDocs = masterySnap.docs.map(d => d.data())

        // Skip if no data to backfill
        if (sessions.length === 0 && masteryDocs.length === 0) {
          continue
        }

        // Create research summary if it doesn't exist
        if (!existingSummary.exists && (sessions.length > 0 || masteryDocs.length > 0)) {
          const totalReviews = masteryDocs.reduce((sum, m) => sum + (m.review_count || 1), 0)
          const totalScore = sessions.reduce((sum, s) => sum + (s.performanceScore || 0), 0)
          const avgScore = sessions.length > 0 ? Math.round(totalScore / sessions.length) : 0
          const retainedCount = sessions.filter(s => (s.performanceScore || 0) >= 56).length
          const retentionRate = sessions.length > 0 ? Math.round((retainedCount / sessions.length) * 100) : 0
          const problemsMastered = masteryDocs.filter(m =>
            m.mastery_level === 'mastered' || m.mastery_level === 'reviewing'
          ).length

          const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)

          // Get first and last review dates
          const sortedSessions = [...sessions].sort((a, b) =>
            new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime()
          )
          const firstReview = sortedSessions[0]?.completedAt || new Date().toISOString()
          const lastReview = sortedSessions[sortedSessions.length - 1]?.completedAt || new Date().toISOString()

          const now = new Date().toISOString()
          const researchSummary = {
            user_id: userId,
            algorithm,
            algorithm_assigned_at: profileData?.created_at || now,
            algorithm_user_overridden: false,
            total_reviews: totalReviews,
            total_problems_seen: masteryDocs.length || sessions.length,
            total_time_spent_minutes: totalMinutes,
            total_days_active: new Set(sessions.map(s =>
              s.completedAt?.split('T')[0]
            ).filter(Boolean)).size || 1,
            lifetime_average_score: avgScore,
            lifetime_retention_rate: retentionRate,
            lifetime_lapse_rate: 100 - retentionRate,
            problems_mastered: problemsMastered,
            problems_learning: masteryDocs.length - problemsMastered,
            problems_struggling: 0,
            average_time_to_mastery_days: 7, // Default estimate
            longest_streak: profileData?.longest_streak_days || 1,
            current_streak: profileData?.streak_days || 0,
            average_daily_reviews: totalReviews / Math.max(1, new Set(sessions.map(s =>
              s.completedAt?.split('T')[0]
            ).filter(Boolean)).size),
            average_session_length_minutes: sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0,
            weekly_averages: [],
            average_interval_accuracy: 50, // Default estimate
            interval_distribution: {
              '1-3_days': 0,
              '4-7_days': 0,
              '8-14_days': 0,
              '15-30_days': 0,
              '31-60_days': 0,
              '60+_days': 0,
            },
            first_review_at: firstReview,
            last_review_at: lastReview,
            created_at: now,
            updated_at: now,
          }

          // Populate interval distribution from mastery data
          for (const mastery of masteryDocs) {
            const interval = mastery.interval_days || 1
            if (interval <= 3) researchSummary.interval_distribution['1-3_days']++
            else if (interval <= 7) researchSummary.interval_distribution['4-7_days']++
            else if (interval <= 14) researchSummary.interval_distribution['8-14_days']++
            else if (interval <= 30) researchSummary.interval_distribution['15-30_days']++
            else if (interval <= 60) researchSummary.interval_distribution['31-60_days']++
            else researchSummary.interval_distribution['60+_days']++
          }

          await adminDb
            .collection('algorithm_research_metrics')
            .doc(userId)
            .collection('summary')
            .doc('current')
            .set(researchSummary)

          result.researchSummariesCreated++
        }

        // Check and update user_stats if missing or empty
        const userStatsDoc = await adminDb.collection('user_stats').doc(userId).get()
        const existingStats = userStatsDoc.data()

        if (!userStatsDoc.exists || (existingStats?.totalSessions || 0) === 0) {
          if (sessions.length > 0) {
            // Rebuild user_stats from session summaries
            const patternStats: Record<string, any> = {}
            const difficultyStats: Record<string, any> = {}
            let totalMinutes = 0
            let totalScore = 0

            for (const session of sessions) {
              totalMinutes += session.durationMinutes || 0
              totalScore += session.performanceScore || 0

              const pattern = session.pattern || 'unknown'
              if (!patternStats[pattern]) {
                patternStats[pattern] = { sessions: 0, totalScore: 0, averageScore: 0, bestScore: 0 }
              }
              patternStats[pattern].sessions++
              patternStats[pattern].totalScore += session.performanceScore || 0
              patternStats[pattern].bestScore = Math.max(
                patternStats[pattern].bestScore,
                session.performanceScore || 0
              )

              const difficulty = session.difficulty || 'medium'
              if (!difficultyStats[difficulty]) {
                difficultyStats[difficulty] = { sessions: 0, totalScore: 0, averageScore: 0 }
              }
              difficultyStats[difficulty].sessions++
              difficultyStats[difficulty].totalScore += session.performanceScore || 0
            }

            // Calculate averages
            for (const p of Object.values(patternStats) as any[]) {
              p.averageScore = p.sessions > 0 ? Math.round(p.totalScore / p.sessions) : 0
            }
            for (const d of Object.values(difficultyStats) as any[]) {
              d.averageScore = d.sessions > 0 ? Math.round(d.totalScore / d.sessions) : 0
            }

            const userStats = {
              userId,
              totalSessions: sessions.length,
              totalPracticeMinutes: totalMinutes,
              totalScore,
              averageScore: sessions.length > 0 ? Math.round(totalScore / sessions.length) : 0,
              patternStats,
              difficultyStats,
              lastSessionAt: sessions[0]?.completedAt,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            await adminDb.collection('user_stats').doc(userId).set(userStats, { merge: true })
            result.userStatsUpdated++
          }
        }
      } catch (userError) {
        result.errors.push(`User ${userId}: ${userError instanceof Error ? userError.message : 'Unknown error'}`)
      }
    }

    // Regenerate aggregate comparison with new data
    await generateAggregateComparison()

  } catch (error) {
    result.errors.push(`Global error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return result
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
    const winnerRate = winner === 'FSRS' ? fsrs.average_retention_rate : sm2.average_retention_rate
    const loserRate = winner === 'FSRS' ? sm2.average_retention_rate : fsrs.average_retention_rate
    keyFindings.push(
      `${winner} shows ${diff}% higher retention rate (${winnerRate}% vs ${loserRate}%)`
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
