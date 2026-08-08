/**
 * Admin Algorithm Research API
 *
 * GET /api/admin/algorithm-research
 * Returns the stored A/B comparison between SM-2 and FSRS. READ ONLY: it never
 * regenerates or writes the aggregate. When the stored aggregate is older than
 * AGGREGATE_MAX_AGE_MIN the response carries `comparisonStale: true` and the UI
 * offers the explicit `regenerate` action, which is permission gated and
 * audited. Requires VIEW_ANALYTICS.
 *
 * POST /api/admin/algorithm-research
 * Every mutating action. Requires MANAGE_SETTINGS.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { adminDb } from "@/lib/firebase-admin"
import { requirePermission } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { logAdminAction, AUDIT_ACTIONS } from "@/lib/admin/audit"
import {
  getAlgorithmDistribution,
  migrateExistingUsers,
  getAggregateComparison,
  generateAggregateComparison,
  getRecentEvents,
  getAlgorithmConfig,
  markAbTestEnded,
} from "@/lib/spaced-repetition"
import { migrateAllUsersToFsrs } from "@/lib/spaced-repetition/fsrs-migration"
import type { AlgorithmComparisonAggregate } from "@/lib/types"

// The end-ab-switch-fsrs sweep does per-user subcollection reads; give the
// route headroom beyond the default function timeout.
export const maxDuration = 300

/** How old the stored aggregate may be before the UI is told it is stale. */
const AGGREGATE_MAX_AGE_MIN = 60

/**
 * Audit action names for the research mutations.
 *
 * `AUDIT_ACTIONS` in lib/admin/audit.ts is the shared registry and already
 * names END_AB_SWITCH_FSRS. The names below cover research mutations it does
 * not name yet and follow the same snake_case convention, so folding them into
 * the registry later needs no data migration. They are constants rather than
 * inline strings so a typo cannot silently create a second action name.
 */
const RESEARCH_AUDIT_ACTIONS = {
  REGENERATE_AGGREGATE: "regenerate_research_aggregate",
  BACKFILL_RESEARCH: "backfill_research_data",
  MIGRATE_ASSIGNMENT: "migrate_algorithm_assignment",
  MIGRATE_NOTIFICATION_PREFERENCES: "migrate_notification_preferences",
} as const

const endAbSchema = z.object({
  action: z.literal("end-ab-switch-fsrs"),
  dryRun: z.boolean().optional().default(false),
  cursor: z.string().min(1).optional(),
})

export async function GET(request: NextRequest) {
  try {
    // Verify Admin SDK is initialized
    if (!adminDb) {
      return NextResponse.json(
        {
          success: false,
          error: "Firebase Admin SDK not initialized.",
        },
        { status: 500 }
      )
    }

    // Reading the research data is an analytics view, so an analyst may do it.
    // Everything that WRITES lives in POST and requires MANAGE_SETTINGS.
    const authResult = await requirePermission(request, PERMISSIONS.VIEW_ANALYTICS)
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 403 }
      )
    }

    // Get algorithm distribution
    const distribution = await getAlgorithmDistribution()

    // Read the stored aggregate. A GET never regenerates it.
    //
    // Before, `?refresh=true` and any read of an aggregate older than an hour
    // both called generateAggregateComparison(), which scans up to 20k summary
    // documents and WRITES the result. A page load therefore mutated the very
    // document the founder was reading, two admins refreshing at once raced
    // each other, and the write happened on a path with no audit entry. The
    // aggregate is now regenerated only by the explicit `regenerate` POST
    // action, which is permission-gated and logged.
    const comparison: AlgorithmComparisonAggregate | null = await getAggregateComparison()
    const comparisonStale = !comparison || isStale(comparison.last_updated, AGGREGATE_MAX_AGE_MIN)

    // Get recent events for detailed analysis
    const recentEvents = await getRecentEvents(50)

    // Calculate additional insights
    const insights = calculateInsights(comparison)

    // A/B lifecycle status (drives the "ended" banner + button visibility)
    const abStatus = await getAlgorithmConfig()

    return NextResponse.json({
      success: true,
      data: {
        abStatus,
        distribution,
        comparison,
        /** True when the stored aggregate is older than AGGREGATE_MAX_AGE_MIN. */
        comparisonStale,
        recentEvents: recentEvents.map((event) => ({
          id: event.id || "",
          algorithm: event.algorithm || "sm2",
          score: event.score ?? 0,
          quality_rating: event.quality_rating ?? 0,
          pattern: event.pattern || "Unknown",
          difficulty: event.difficulty || "medium",
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
    console.error("Admin algorithm research API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
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
 * - action: 'end-ab-switch-fsrs' - Migrate every user to FSRS and end the A/B
 * - action: 'backfill-research' - Derive research summaries from history
 *
 * EVERY action here mutates the experiment or the data the experiment's
 * conclusion rests on, so all of them require MANAGE_SETTINGS. The route
 * previously used verifyAdminAccess(), which returns true for ANY admin role:
 * the read-only `analyst` role and the customer-support `support` role could
 * both end the A/B test and rewrite the research cohorts.
 */
export async function POST(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: "Firebase Admin SDK not initialized." },
        { status: 500 }
      )
    }

    const authResult = await requirePermission(request, PERMISSIONS.MANAGE_SETTINGS)
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 403 }
      )
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case "migrate": {
        const result = await migrateExistingUsers()
        return NextResponse.json({
          success: true,
          message: `Migrated ${result.migrated} users (SM-2: ${result.sm2_assigned}, FSRS: ${result.fsrs_assigned})`,
          data: result,
        })
      }

      case "regenerate": {
        // The only path that writes algorithm_research_aggregate/comparison.
        // It used to also run on any stale GET, so the document could change
        // under a reader with nothing in the audit trail to explain it.
        const comparison = await generateAggregateComparison()
        await logAdminAction(
          authResult.context!,
          RESEARCH_AUDIT_ACTIONS.REGENERATE_AGGREGATE,
          {
            sm2Users: comparison.sm2.total_users,
            fsrsUsers: comparison.fsrs.total_users,
            lastUpdated: comparison.last_updated,
          },
          { request, target: { type: "algorithm_research_aggregate", id: "comparison" } }
        )
        return NextResponse.json({
          success: true,
          message: "Aggregate comparison regenerated",
          data: comparison,
        })
      }

      case "migrate-notification-preferences": {
        // Backfill notification preferences for existing users
        const profiles = await adminDb.collection("profiles").get()
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

      case "end-ab-switch-fsrs": {
        const parsed = endAbSchema.safeParse(body)
        if (!parsed.success) {
          return NextResponse.json(
            { success: false, error: "Invalid request", details: parsed.error.flatten() },
            { status: 400 }
          )
        }
        const { dryRun, cursor } = parsed.data
        const adminId = authResult.context!.userId

        const result = await migrateAllUsersToFsrs({ dryRun, cursor, maxUsers: 100 })

        // Finalize only when the whole sweep is done and this wasn't a dry run:
        // the coin flip must not stop while sm2 users still hold unconverted cards.
        const finalized = !dryRun && result.nextCursor === null
        if (finalized) {
          await markAbTestEnded(adminId)
        }

        // Audit every page (dry runs included) — this is an irreversible,
        // all-users action and the trail should show the full sequence.
        await logAdminAction(
          adminId,
          AUDIT_ACTIONS.END_AB_SWITCH_FSRS,
          {
            dryRun,
            cursor: cursor ?? null,
            nextCursor: result.nextCursor,
            finalized,
            usersScanned: result.usersScanned,
            usersFlippedToFsrs: result.usersFlippedToFsrs,
            usersAlreadyFsrs: result.usersAlreadyFsrs,
            usersOverriddenSkipped: result.usersOverriddenSkipped,
            cardsConverted: result.cardsConverted,
            cardsSkipped: result.cardsSkipped,
            errorCount: result.errors.length,
          },
          request
        )

        const overriddenNote =
          result.usersOverriddenSkipped > 0
            ? ` (${result.usersOverriddenSkipped} user-overridden sm2 users kept their choice)`
            : ""
        return NextResponse.json({
          success: true,
          message: dryRun
            ? `Dry run: would flip ${result.usersFlippedToFsrs} users and convert ${result.cardsConverted} cards${overriddenNote}`
            : finalized
              ? `A/B ended: flipped ${result.usersFlippedToFsrs} users, converted ${result.cardsConverted} cards${overriddenNote}. New users now always get FSRS.`
              : `Page done: flipped ${result.usersFlippedToFsrs} users, converted ${result.cardsConverted} cards${overriddenNote}. Continue with cursor.`,
          data: result,
        })
      }

      case "backfill-research": {
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
    console.error("Admin algorithm research POST error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
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
    const profilesSnap = await adminDb.collection("profiles").get()
    const userIds = profilesSnap.docs.map((doc) => doc.id)

    for (const userId of userIds) {
      try {
        result.usersProcessed++

        // Get user's algorithm assignment
        const profileData = profilesSnap.docs.find((d) => d.id === userId)?.data()
        const algorithm = (profileData?.spaced_repetition_algorithm || "sm2") as "sm2" | "fsrs"

        // Check if research summary already exists
        const existingSummary = await adminDb
          .collection("algorithm_research_metrics")
          .doc(userId)
          .collection("summary")
          .doc("current")
          .get()

        // Get problem mastery data (unified collection)
        const masterySnap = await adminDb
          .collection("problem_mastery")
          .doc(userId)
          .collection("problems")
          .get()

        // Get session summaries
        const sessionsSnap = await adminDb
          .collection("users")
          .doc(userId)
          .collection("session_summaries")
          .orderBy("completedAt", "desc")
          .limit(100)
          .get()

        const sessions = sessionsSnap.docs.map((d) => d.data())
        const masteryDocs = masterySnap.docs.map((d) => d.data())

        // Skip if no data to backfill
        if (sessions.length === 0 && masteryDocs.length === 0) {
          continue
        }

        // Create research summary if it doesn't exist
        if (!existingSummary.exists && (sessions.length > 0 || masteryDocs.length > 0)) {
          const totalReviews = masteryDocs.reduce((sum, m) => sum + (m.review_count || 1), 0)
          const totalScore = sessions.reduce((sum, s) => sum + (s.performanceScore || 0), 0)
          const avgScore = sessions.length > 0 ? Math.round(totalScore / sessions.length) : 0
          const retainedCount = sessions.filter((s) => (s.performanceScore || 0) >= 56).length
          const retentionRate =
            sessions.length > 0 ? Math.round((retainedCount / sessions.length) * 100) : 0
          const problemsMastered = masteryDocs.filter(
            (m) => m.mastery_level === "mastered" || m.mastery_level === "reviewing"
          ).length

          const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)

          // Get first and last review dates
          const sortedSessions = [...sessions].sort(
            (a, b) =>
              new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime()
          )
          const firstReview = sortedSessions[0]?.completedAt || new Date().toISOString()
          const lastReview =
            sortedSessions[sortedSessions.length - 1]?.completedAt || new Date().toISOString()

          // Calculate average time to mastery from actual mastery data
          // Time from first review to mastery level
          const masteredProblems = masteryDocs.filter(
            (m) => m.mastery_level === "mastered" || m.mastery_level === "reviewing"
          )
          let avgTimeToMastery: number | null = null
          if (masteredProblems.length > 0) {
            const timeToMasteryDays = masteredProblems
              .filter((m) => m.first_reviewed_at && m.mastered_at)
              .map((m) => {
                const first = new Date(m.first_reviewed_at).getTime()
                const mastered = new Date(m.mastered_at).getTime()
                return Math.max(1, Math.round((mastered - first) / (1000 * 60 * 60 * 24)))
              })

            if (timeToMasteryDays.length > 0) {
              avgTimeToMastery = Math.round(
                timeToMasteryDays.reduce((sum, d) => sum + d, 0) / timeToMasteryDays.length
              )
            }
          }
          // Fallback: estimate based on total days active vs problems mastered
          if (avgTimeToMastery === null) {
            const daysActive =
              new Set(sessions.map((s) => s.completedAt?.split("T")[0]).filter(Boolean)).size || 1
            avgTimeToMastery =
              problemsMastered > 0 ? Math.round(daysActive / problemsMastered) : null
          }

          // Calculate interval accuracy from mastery data
          // Compare predicted vs actual retention (score >= 56 means retained)
          const accuratePredictions = sessions.filter((s) => {
            const predicted = (s.predicted_retention || 50) >= 50 // Predicted to retain if >= 50%
            const actual = (s.performanceScore || 0) >= 56 // Actually retained if score >= 56
            return predicted === actual
          }).length
          const intervalAccuracy =
            sessions.length > 0 ? Math.round((accuratePredictions / sessions.length) * 100) : null

          const now = new Date().toISOString()
          const daysActiveSet = new Set(
            sessions.map((s) => s.completedAt?.split("T")[0]).filter(Boolean)
          )
          const daysActiveCount = daysActiveSet.size || 1

          const researchSummary = {
            user_id: userId,
            algorithm,
            algorithm_assigned_at: profileData?.created_at || now,
            algorithm_user_overridden: false,
            total_reviews: totalReviews,
            total_problems_seen: masteryDocs.length || sessions.length,
            total_time_spent_minutes: totalMinutes,
            total_days_active: daysActiveCount,
            lifetime_average_score: avgScore,
            lifetime_retention_rate: retentionRate,
            lifetime_lapse_rate: 100 - retentionRate,
            problems_mastered: problemsMastered,
            problems_learning: masteryDocs.length - problemsMastered,
            problems_struggling: 0,
            average_time_to_mastery_days: avgTimeToMastery,
            longest_streak: profileData?.longest_streak_days || 1,
            current_streak: profileData?.streak_days || 0,
            average_daily_reviews: totalReviews / Math.max(1, daysActiveCount),
            average_session_length_minutes:
              sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0,
            weekly_averages: [],
            average_interval_accuracy: intervalAccuracy,
            interval_distribution: {
              "1-3_days": 0,
              "4-7_days": 0,
              "8-14_days": 0,
              "15-30_days": 0,
              "31-60_days": 0,
              "60+_days": 0,
            },
            first_review_at: firstReview,
            last_review_at: lastReview,
            created_at: now,
            updated_at: now,
          }

          // Populate interval distribution from mastery data
          for (const mastery of masteryDocs) {
            const interval = mastery.interval_days || 1
            if (interval <= 3) researchSummary.interval_distribution["1-3_days"]++
            else if (interval <= 7) researchSummary.interval_distribution["4-7_days"]++
            else if (interval <= 14) researchSummary.interval_distribution["8-14_days"]++
            else if (interval <= 30) researchSummary.interval_distribution["15-30_days"]++
            else if (interval <= 60) researchSummary.interval_distribution["31-60_days"]++
            else researchSummary.interval_distribution["60+_days"]++
          }

          await adminDb
            .collection("algorithm_research_metrics")
            .doc(userId)
            .collection("summary")
            .doc("current")
            .set(researchSummary)

          result.researchSummariesCreated++
        }

        // Check and update user_stats if missing or empty
        const userStatsDoc = await adminDb.collection("user_stats").doc(userId).get()
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

              const pattern = session.pattern || "unknown"
              if (!patternStats[pattern]) {
                patternStats[pattern] = {
                  sessions: 0,
                  totalScore: 0,
                  averageScore: 0,
                  bestScore: 0,
                }
              }
              patternStats[pattern].sessions++
              patternStats[pattern].totalScore += session.performanceScore || 0
              patternStats[pattern].bestScore = Math.max(
                patternStats[pattern].bestScore,
                session.performanceScore || 0
              )

              const difficulty = session.difficulty || "medium"
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

            await adminDb.collection("user_stats").doc(userId).set(userStats, { merge: true })
            result.userStatsUpdated++
          }
        }
      } catch (userError) {
        result.errors.push(
          `User ${userId}: ${userError instanceof Error ? userError.message : "Unknown error"}`
        )
      }
    }

    // Regenerate aggregate comparison with new data
    await generateAggregateComparison()
  } catch (error) {
    result.errors.push(`Global error: ${error instanceof Error ? error.message : "Unknown error"}`)
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
      summary: "Not enough data for insights yet.",
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
    recommendations.push("Continue collecting data before drawing conclusions.")
  }

  // Retention rate comparison
  if (Math.abs(comp.retention_rate_difference) >= 5) {
    const winner = comp.retention_rate_difference > 0 ? "FSRS" : "SM-2"
    const diff = Math.abs(comp.retention_rate_difference)
    const winnerRate = winner === "FSRS" ? fsrs.average_retention_rate : sm2.average_retention_rate
    const loserRate = winner === "FSRS" ? sm2.average_retention_rate : fsrs.average_retention_rate
    keyFindings.push(
      `${winner} shows ${diff}% higher retention rate (${winnerRate}% vs ${loserRate}%)`
    )
  }

  // Score comparison
  if (Math.abs(comp.average_score_difference) >= 3) {
    const winner = comp.average_score_difference > 0 ? "FSRS" : "SM-2"
    const diff = Math.abs(comp.average_score_difference)
    keyFindings.push(`${winner} users score ${diff} points higher on average`)
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
    const winner = comp.engagement_difference > 0 ? "FSRS" : "SM-2"
    keyFindings.push(
      `${winner} users complete ${Math.abs(comp.engagement_difference).toFixed(1)} more reviews per day`
    )
  }

  // Churn analysis
  if (sm2.churn_rate_30d > fsrs.churn_rate_30d + 10) {
    keyFindings.push(
      `SM-2 has ${sm2.churn_rate_30d - fsrs.churn_rate_30d}% higher 30-day churn rate`
    )
    recommendations.push("Consider switching new users to FSRS to reduce churn.")
  } else if (fsrs.churn_rate_30d > sm2.churn_rate_30d + 10) {
    keyFindings.push(
      `FSRS has ${fsrs.churn_rate_30d - sm2.churn_rate_30d}% higher 30-day churn rate`
    )
  }

  // Overall winner
  let summary = "Results are inconclusive. Need more data."
  if (comp.overall_winner && comp.confidence_level) {
    summary = `${comp.overall_winner.toUpperCase()} appears to be the better algorithm with ${comp.confidence_level}% confidence.`

    if (comp.overall_winner === "fsrs") {
      recommendations.push("Consider migrating all new users to FSRS algorithm.")
      recommendations.push("Prepare migration plan for existing SM-2 users.")
    } else {
      recommendations.push("Keep SM-2 as the default algorithm.")
      recommendations.push("Investigate why FSRS is underperforming - may need parameter tuning.")
    }
  }

  return {
    summary,
    keyFindings,
    recommendations,
  }
}
