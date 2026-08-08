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

/**
 * Where derived (reconstructed) research summaries go.
 *
 * A FLAT collection, deliberately. Anything written to a subcollection named
 * `summary` is picked up by `collectionGroup("summary")`, which is how the A/B
 * cohort statistics and the CSV export both gather their rows, so a
 * "quarantine" path of the form `.../{uid}/summary/current` would quarantine
 * nothing at all.
 */
const BACKFILL_COLLECTION = "algorithm_research_backfill"

/** Typed by the operator to turn a preview into a write. */
const BACKFILL_CONFIRM_TOKEN = "BACKFILL"

/**
 * `dryRun` defaults to TRUE. A destructive action whose safe mode is opt-in is
 * only safe for the people who remember to opt in.
 */
const backfillSchema = z.object({
  action: z.literal("backfill-research"),
  dryRun: z.boolean().optional().default(true),
  confirm: z.string().optional(),
})

interface BackfillResult {
  dryRun: boolean
  usersScanned: number
  usersWithHistory: number
  /** Users with no algorithm assignment. Skipped, never defaulted to SM-2. */
  usersSkippedUnassigned: number
  usersSkippedNoHistory: number
  backfillDocsWritten: number
  userStatsWritten: number
  /** Dry run only: user_stats documents a live run would rebuild. */
  userStatsWouldWrite: number
  errors: string[]
}

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
        await logAdminAction(
          authResult.context!,
          RESEARCH_AUDIT_ACTIONS.MIGRATE_ASSIGNMENT,
          {
            migrated: result.migrated,
            sm2Assigned: result.sm2_assigned,
            fsrsAssigned: result.fsrs_assigned,
          },
          { request }
        )
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
        // Backfill notification preferences for existing users.
        //
        // This used to stage every profile into ONE WriteBatch. Firestore caps
        // a batch at 500 writes, so the commit threw INVALID_ARGUMENT the
        // moment 501 profiles needed the field, and it threw AFTER the whole
        // collection had been read: the action could never succeed again once
        // the user base crossed that line, and it failed all-or-nothing with a
        // message that named neither the cap nor the count.
        const profiles = await adminDb.collection("profiles").get()
        const needsPreferences = profiles.docs.filter((doc) => !doc.data().notification_preferences)

        const result = await commitInChunks(needsPreferences, (batch, doc) => {
          batch.update(doc.ref, {
            notification_preferences: {
              email_notifications_enabled: true,
              inactivity_reminders: true,
              spaced_repetition_reminders: true,
              milestone_celebrations: true,
              marketing_emails: false,
            },
          })
        })

        await logAdminAction(
          authResult.context!,
          RESEARCH_AUDIT_ACTIONS.MIGRATE_NOTIFICATION_PREFERENCES,
          { profilesScanned: profiles.size, migrated: result.written, batches: result.batches },
          { request }
        )

        return NextResponse.json({
          success: true,
          message: `Added notification preferences to ${result.written} users in ${result.batches} batches`,
          data: { migrated: result.written, batches: result.batches },
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
        const parsed = backfillSchema.safeParse(body)
        if (!parsed.success) {
          return NextResponse.json(
            { success: false, error: "Invalid request", details: parsed.error.flatten() },
            { status: 400 }
          )
        }
        const { dryRun, confirm } = parsed.data

        // A real run needs the typed confirmation. Defaulting dryRun to true
        // means an old client, a replayed request or a mistaken curl produces a
        // preview instead of a write.
        if (!dryRun && confirm !== BACKFILL_CONFIRM_TOKEN) {
          return NextResponse.json(
            {
              success: false,
              error: `A live backfill requires confirm: "${BACKFILL_CONFIRM_TOKEN}". Run it with dryRun first and read the counts.`,
            },
            { status: 400 }
          )
        }

        const result = await backfillResearchData({ dryRun })

        await logAdminAction(
          authResult.context!,
          RESEARCH_AUDIT_ACTIONS.BACKFILL_RESEARCH,
          {
            dryRun,
            usersScanned: result.usersScanned,
            usersWithHistory: result.usersWithHistory,
            usersSkippedUnassigned: result.usersSkippedUnassigned,
            backfillDocsWritten: result.backfillDocsWritten,
            userStatsWritten: result.userStatsWritten,
            destination: BACKFILL_COLLECTION,
            errorCount: result.errors.length,
          },
          { request }
        )

        return NextResponse.json({
          success: true,
          message: dryRun
            ? `Dry run: would write ${result.usersWithHistory} derived summaries to ${BACKFILL_COLLECTION} and rebuild ${result.userStatsWouldWrite} user_stats documents. Nothing was written. ${result.usersSkippedUnassigned} users have no algorithm assignment and were skipped.`
            : `Backfill complete: ${result.backfillDocsWritten} derived summaries written to ${BACKFILL_COLLECTION} (quarantined, not part of the A/B cohorts) and ${result.userStatsWritten} user_stats rebuilt.`,
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
 * Derive research summaries for users who practiced before event tracking
 * existed.
 *
 * WHY THIS WRITES SOMEWHERE ELSE NOW
 *
 * This function used to write its output to
 * `algorithm_research_metrics/{uid}/summary/current`, which is exactly the
 * collection group `generateAggregateComparison()` reads to build the SM-2 vs
 * FSRS cohort statistics. Its output is not measurement, it is reconstruction:
 * interval accuracy inferred from a default `predicted_retention` of 50 when
 * the session never recorded one, time to mastery estimated as days active
 * divided by problems mastered when no mastery timestamps exist, a longest
 * streak defaulted to 1. Those rows then sat in the cohorts indistinguishable
 * from measured ones, and the founder's decision rested on the mixture.
 *
 * Worse, users with no `spaced_repetition_algorithm` were filed as "sm2",
 * inventing an SM-2 cohort out of people the experiment never randomized.
 *
 * So: derived rows go to their own top-level collection, tagged with their
 * provenance. Note the collection is FLAT, one document per user, precisely
 * because a subcollection named `summary` would be swept up by the
 * `collectionGroup("summary")` query no matter which parent it hung under.
 * Unassigned users are skipped rather than defaulted, and every estimated
 * field is either omitted or listed in `estimated_fields`.
 */
async function backfillResearchData(options: { dryRun: boolean }): Promise<BackfillResult> {
  const result: BackfillResult = {
    dryRun: options.dryRun,
    usersScanned: 0,
    usersWithHistory: 0,
    usersSkippedUnassigned: 0,
    usersSkippedNoHistory: 0,
    backfillDocsWritten: 0,
    userStatsWritten: 0,
    userStatsWouldWrite: 0,
    errors: [] as string[],
  }

  try {
    const profilesSnap = await adminDb.collection("profiles").get()

    for (const profileDoc of profilesSnap.docs) {
      const userId = profileDoc.id
      try {
        result.usersScanned++
        const profileData = profileDoc.data()

        // Never invent an arm. A user with no assignment was not randomized,
        // and guessing "sm2" both fabricates a cohort member and skews the
        // sample ratio check that is supposed to catch exactly this.
        const algorithm = profileData?.spaced_repetition_algorithm
        if (algorithm !== "sm2" && algorithm !== "fsrs") {
          result.usersSkippedUnassigned++
          continue
        }

        const [masterySnap, sessionsSnap] = await Promise.all([
          adminDb.collection("problem_mastery").doc(userId).collection("problems").get(),
          adminDb
            .collection("users")
            .doc(userId)
            .collection("session_summaries")
            .orderBy("completedAt", "desc")
            .limit(100)
            .get(),
        ])

        const sessions = sessionsSnap.docs.map((d) => d.data())
        const masteryDocs = masterySnap.docs.map((d) => d.data())

        if (sessions.length === 0 && masteryDocs.length === 0) {
          result.usersSkippedNoHistory++
          continue
        }

        result.usersWithHistory++

        const summary = buildDerivedSummary(userId, algorithm, profileData, sessions, masteryDocs)

        if (!options.dryRun) {
          await adminDb.collection(BACKFILL_COLLECTION).doc(userId).set(summary)
          result.backfillDocsWritten++
        }

        // user_stats is a product aggregate rebuilt from real sessions rather
        // than a research cohort, but it is still a live write, so it obeys the
        // same dry run and confirmation.
        const userStatsDoc = await adminDb.collection("user_stats").doc(userId).get()
        const existingStats = userStatsDoc.data()
        const needsStats =
          sessions.length > 0 && (!userStatsDoc.exists || (existingStats?.totalSessions || 0) === 0)

        if (needsStats) {
          if (options.dryRun) {
            result.userStatsWouldWrite++
          } else {
            await adminDb
              .collection("user_stats")
              .doc(userId)
              .set(buildUserStats(userId, sessions), { merge: true })
            result.userStatsWritten++
          }
        }
      } catch (userError) {
        result.errors.push(
          `User ${userId}: ${userError instanceof Error ? userError.message : "Unknown error"}`
        )
      }
    }
  } catch (error) {
    result.errors.push(`Global error: ${error instanceof Error ? error.message : "Unknown error"}`)
  }

  return result
}

/**
 * Reconstruct one user's history into a derived summary.
 *
 * Every value that cannot be measured from the stored history is `null` and
 * named in `estimated_fields`, rather than being filled with a plausible
 * default. A null says "we never recorded this"; a default says "we measured
 * this", and only one of those is true.
 */
function buildDerivedSummary(
  userId: string,
  algorithm: "sm2" | "fsrs",
  profileData: FirebaseFirestore.DocumentData | undefined,
  sessions: FirebaseFirestore.DocumentData[],
  masteryDocs: FirebaseFirestore.DocumentData[]
): Record<string, unknown> {
  const now = new Date().toISOString()
  const estimatedFields: string[] = []

  const totalReviews = masteryDocs.reduce((sum, m) => sum + (m.review_count || 1), 0)
  const scoredSessions = sessions.filter((s) => typeof s.performanceScore === "number")
  const avgScore =
    scoredSessions.length > 0
      ? Math.round(
          scoredSessions.reduce((sum, s) => sum + s.performanceScore, 0) / scoredSessions.length
        )
      : null
  const retainedCount = scoredSessions.filter((s) => s.performanceScore >= 56).length
  const retentionRate =
    scoredSessions.length > 0 ? Math.round((retainedCount / scoredSessions.length) * 100) : null

  const problemsMastered = masteryDocs.filter(
    (m) => m.mastery_level === "mastered" || m.mastery_level === "reviewing"
  ).length
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime()
  )
  const firstReview = sortedSessions[0]?.completedAt ?? null
  const lastReview = sortedSessions[sortedSessions.length - 1]?.completedAt ?? null

  // Time to mastery only from problems that actually carry both timestamps.
  // The old fallback (days active divided by problems mastered) was a number
  // with the shape of a measurement and none of the meaning.
  const timeToMasteryDays = masteryDocs
    .filter((m) => m.first_reviewed_at && m.mastered_at)
    .map((m) =>
      Math.max(
        1,
        Math.round(
          (new Date(m.mastered_at).getTime() - new Date(m.first_reviewed_at).getTime()) / 86_400_000
        )
      )
    )
  const avgTimeToMastery =
    timeToMasteryDays.length > 0
      ? Math.round(timeToMasteryDays.reduce((sum, d) => sum + d, 0) / timeToMasteryDays.length)
      : null
  if (avgTimeToMastery === null) estimatedFields.push("average_time_to_mastery_days")

  // Interval accuracy only over sessions that recorded a prediction. Defaulting
  // the prediction to 50 made every unpredicted session count as a hit whenever
  // the user happened to pass.
  const predictedSessions = sessions.filter(
    (s) => typeof s.predicted_retention === "number" && typeof s.performanceScore === "number"
  )
  const accuratePredictions = predictedSessions.filter(
    (s) => s.predicted_retention >= 50 === s.performanceScore >= 56
  ).length
  const intervalAccuracy =
    predictedSessions.length > 0
      ? Math.round((accuratePredictions / predictedSessions.length) * 100)
      : null
  if (intervalAccuracy === null) estimatedFields.push("average_interval_accuracy")

  const daysActiveCount =
    new Set(sessions.map((s) => s.completedAt?.split("T")[0]).filter(Boolean)).size || 0

  const intervalDistribution = {
    "1-3_days": 0,
    "4-7_days": 0,
    "8-14_days": 0,
    "15-30_days": 0,
    "31-60_days": 0,
    "60+_days": 0,
  }
  for (const mastery of masteryDocs) {
    const interval = mastery.interval_days || 1
    if (interval <= 3) intervalDistribution["1-3_days"]++
    else if (interval <= 7) intervalDistribution["4-7_days"]++
    else if (interval <= 14) intervalDistribution["8-14_days"]++
    else if (interval <= 30) intervalDistribution["15-30_days"]++
    else if (interval <= 60) intervalDistribution["31-60_days"]++
    else intervalDistribution["60+_days"]++
  }

  return {
    user_id: userId,
    algorithm,
    // Provenance, so no later reader can mistake this for a measured row.
    data_source: "backfill_derived",
    derived_at: now,
    derived_from: { sessions: sessions.length, mastery_documents: masteryDocs.length },
    estimated_fields: estimatedFields,
    algorithm_assigned_at: profileData?.algorithm_assigned_at ?? null,
    algorithm_user_overridden: profileData?.algorithm_user_overridden === true,
    total_reviews: totalReviews,
    total_problems_seen: masteryDocs.length || sessions.length,
    total_time_spent_minutes: totalMinutes,
    total_days_active: daysActiveCount,
    lifetime_average_score: avgScore,
    lifetime_retention_rate: retentionRate,
    lifetime_lapse_rate: retentionRate === null ? null : 100 - retentionRate,
    problems_mastered: problemsMastered,
    problems_learning: Math.max(0, masteryDocs.length - problemsMastered),
    average_time_to_mastery_days: avgTimeToMastery,
    longest_streak: profileData?.longest_streak_days ?? null,
    current_streak: profileData?.streak_days ?? null,
    average_daily_reviews: daysActiveCount > 0 ? totalReviews / daysActiveCount : null,
    average_session_length_minutes:
      sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : null,
    average_interval_accuracy: intervalAccuracy,
    interval_distribution: intervalDistribution,
    first_review_at: firstReview,
    last_review_at: lastReview,
  }
}

/** Rebuild user_stats from the user's real session summaries. */
function buildUserStats(
  userId: string,
  sessions: FirebaseFirestore.DocumentData[]
): Record<string, unknown> {
  const patternStats: Record<
    string,
    { sessions: number; totalScore: number; averageScore: number; bestScore: number }
  > = {}
  const difficultyStats: Record<
    string,
    { sessions: number; totalScore: number; averageScore: number }
  > = {}
  let totalMinutes = 0
  let totalScore = 0

  for (const session of sessions) {
    totalMinutes += session.durationMinutes || 0
    totalScore += session.performanceScore || 0

    const pattern = session.pattern || "unknown"
    patternStats[pattern] ??= { sessions: 0, totalScore: 0, averageScore: 0, bestScore: 0 }
    patternStats[pattern].sessions++
    patternStats[pattern].totalScore += session.performanceScore || 0
    patternStats[pattern].bestScore = Math.max(
      patternStats[pattern].bestScore,
      session.performanceScore || 0
    )

    const difficulty = session.difficulty || "medium"
    difficultyStats[difficulty] ??= { sessions: 0, totalScore: 0, averageScore: 0 }
    difficultyStats[difficulty].sessions++
    difficultyStats[difficulty].totalScore += session.performanceScore || 0
  }

  for (const stats of Object.values(patternStats)) {
    stats.averageScore = stats.sessions > 0 ? Math.round(stats.totalScore / stats.sessions) : 0
  }
  for (const stats of Object.values(difficultyStats)) {
    stats.averageScore = stats.sessions > 0 ? Math.round(stats.totalScore / stats.sessions) : 0
  }

  return {
    userId,
    totalSessions: sessions.length,
    totalPracticeMinutes: totalMinutes,
    totalScore,
    averageScore: sessions.length > 0 ? Math.round(totalScore / sessions.length) : 0,
    patternStats,
    difficultyStats,
    lastSessionAt: sessions[0]?.completedAt ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Firestore rejects a WriteBatch with more than 500 operations. Staying under
 * it with room to spare keeps a single chunk safe even if a future caller adds
 * a second write per document.
 */
const MAX_WRITES_PER_BATCH = 450

/**
 * Apply one write per item, committing in chunks that respect Firestore's
 * batch limit. Chunks commit sequentially so a failure part way through leaves
 * the earlier chunks applied and reports how far it got, rather than throwing
 * away the whole run.
 */
async function commitInChunks<T>(
  items: T[],
  stage: (batch: FirebaseFirestore.WriteBatch, item: T) => void
): Promise<{ written: number; batches: number }> {
  let written = 0
  let batches = 0

  for (let start = 0; start < items.length; start += MAX_WRITES_PER_BATCH) {
    const chunk = items.slice(start, start + MAX_WRITES_PER_BATCH)
    const batch = adminDb.batch()
    for (const item of chunk) stage(batch, item)
    await batch.commit()
    written += chunk.length
    batches++
  }

  return { written, batches }
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
 * Descriptive read of the stored cohort averages.
 *
 * Everything returned here is descriptive only. No sentence produced by this
 * function may declare a winner or attach a confidence to one: differences
 * between two cohort averages say nothing about whether the difference is
 * larger than the noise. The tested verdict lives in
 * `lib/research/experiment-readout.ts` and is surfaced by
 * /api/admin/research/enhanced.
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

  // Summary.
  //
  // This used to read "{winner} appears to be the better algorithm with
  // {confidence_level}% confidence", where confidence_level was produced by
  // `Math.min(95, 60 + wins * 7)`: a count of how many of five cohort averages
  // one arm happened to lead on, rescaled to look like a percentage. Nothing in
  // that number came from the spread of the data or the size of the sample, and
  // it was the single sentence the founder read first.
  //
  // The findings above are DESCRIPTIVE cohort averages and stay that way. The
  // one place a winner may be declared is the tested readout, which runs at the
  // user level with an interval, a correction and an SRM check.
  const leader =
    comp.fsrs_wins_count > comp.sm2_wins_count
      ? "FSRS"
      : comp.sm2_wins_count > comp.fsrs_wins_count
        ? "SM-2"
        : null

  const summary = leader
    ? `${leader} leads on ${Math.max(comp.fsrs_wins_count, comp.sm2_wins_count)} of 5 cohort averages. Leading on an average is not a result: see the tested verdict at the top of the page for whether the difference survives a significance test.`
    : "The two cohorts split the five averages evenly. See the tested verdict at the top of the page for the statistical read."

  if (!comp.sufficient_sample_size) {
    recommendations.push(
      "Do not act on the averages above until both arms clear the minimum users per arm."
    )
  }

  return {
    summary,
    keyFindings,
    recommendations,
  }
}
