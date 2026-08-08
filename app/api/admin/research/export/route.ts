/**
 * Research Data Export API
 *
 * GET /api/admin/research/export
 * Exports research data in CSV or JSON format
 *
 * Query params:
 * - format: 'csv' | 'json' (default: 'csv')
 * - type: 'events' | 'summary' | 'comparison' (default: 'events')
 * - range: '7d' | '30d' | '90d' | 'all' (default: '30d')
 * - algorithm: 'sm2' | 'fsrs' | 'all' (default: 'all')
 *
 * Requires EXPORT_DATA. Three things were wrong with this route:
 *
 *  - it accepted any admin role, skipping the EXPORT_DATA permission that
 *    exists precisely to gate bulk data leaving the system,
 *  - it wrote no audit entry, so a full dump of every user's practice history
 *    left no trace at all, and
 *  - it emitted the raw Firebase uid on every row. An export is the copy of
 *    the data that ends up in a spreadsheet, an email or a shared drive, and a
 *    raw uid there is a join key back to the live user record.
 *
 * Rows now carry a stable pseudonymous `user_key` instead: the same user always
 * hashes to the same key, so longitudinal analysis across exports still works,
 * but the file no longer carries account identifiers.
 */

import { createHash } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { requirePermission } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { logAdminAction } from "@/lib/admin/audit"
import { analyzeResearchData } from "@/lib/research/analyzer"
import type { ExperimentReadout } from "@/lib/research/experiment-readout"
import type { AlgorithmResearchEvent } from "@/lib/types"

/** See AUDIT_ACTIONS in lib/admin/audit.ts; this route's action is not there yet. */
const EXPORT_RESEARCH_AUDIT_ACTION = "export_research_data"

/**
 * Domain separation string, so a research `user_key` cannot be matched against
 * a hash of the same uid produced anywhere else in the system.
 */
const USER_KEY_NAMESPACE = "codesparring:research-export:v1"

/**
 * Stable pseudonym for a user id. Deterministic (the same uid always maps to
 * the same key, so two exports can be joined) and not reversible by reading
 * the file.
 */
function pseudonymize(userId: string | undefined | null): string {
  if (!userId) return ""
  return createHash("sha256").update(`${USER_KEY_NAMESPACE}:${userId}`).digest("hex").slice(0, 16)
}

export async function GET(request: NextRequest) {
  try {
    // Verify Admin SDK is initialized
    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: "Firebase Admin SDK not initialized." },
        { status: 500 }
      )
    }

    // Bulk data leaving the system is exactly what EXPORT_DATA gates.
    const authResult = await requirePermission(request, PERMISSIONS.EXPORT_DATA)
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 403 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "csv"
    const type = searchParams.get("type") || "events"
    const range = searchParams.get("range") || "30d"
    const algorithmFilter = searchParams.get("algorithm") || "all"

    // Calculate date range
    const now = new Date()
    let startDate: Date | null = null
    if (range === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (range === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    } else if (range === "90d") {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    }

    let data: any
    let filename: string

    switch (type) {
      case "events":
        data = await exportEvents(startDate, algorithmFilter)
        filename = `research-events-${range}-${new Date().toISOString().split("T")[0]}`
        break

      case "summary":
        data = await exportUserSummaries(algorithmFilter)
        filename = `research-summaries-${new Date().toISOString().split("T")[0]}`
        break

      case "comparison":
        data = await exportComparison()
        filename = `algorithm-comparison-${new Date().toISOString().split("T")[0]}`
        break

      default:
        return NextResponse.json(
          { success: false, error: `Unknown export type: ${type}` },
          { status: 400 }
        )
    }

    // Record the export BEFORE the bytes leave. The trail has to show what was
    // taken, by whom, and how much of it.
    await logAdminAction(
      authResult.context!,
      EXPORT_RESEARCH_AUDIT_ACTION,
      {
        type,
        format,
        range,
        algorithm: algorithmFilter,
        rowCount: Array.isArray(data) ? data.length : 1,
        pseudonymized: type !== "comparison",
      },
      { request }
    )

    if (format === "json") {
      return NextResponse.json(data, {
        headers: {
          "Content-Disposition": `attachment; filename="${filename}.json"`,
        },
      })
    }

    // Convert to CSV
    const csv = convertToCSV(data, type)
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    })
  } catch (error) {
    console.error("Research export error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

async function exportEvents(startDate: Date | null, algorithmFilter: string): Promise<any[]> {
  let query = adminDb
    .collection("algorithm_research_events")
    .orderBy("timestamp", "desc")
    .limit(10000)

  if (startDate) {
    query = adminDb
      .collection("algorithm_research_events")
      .where("timestamp", ">=", startDate.toISOString())
      .orderBy("timestamp", "desc")
      .limit(10000)
  }

  const snapshot = await query.get()
  let events = snapshot.docs.map((doc) => doc.data() as AlgorithmResearchEvent)

  // Filter by algorithm if specified
  if (algorithmFilter !== "all") {
    events = events.filter((e) => e.algorithm === algorithmFilter)
  }

  // Flatten for export
  return events.map((e) => ({
    id: e.id,
    user_key: pseudonymize(e.user_id),
    algorithm: e.algorithm,
    timestamp: e.timestamp,
    problem_id: e.problem_id,
    scenario_id: e.scenario_id,
    pattern: e.pattern,
    difficulty: e.difficulty,
    score: e.score,
    mastery_score: e.mastery_score,
    quality_rating: e.quality_rating,
    time_spent_minutes: e.time_spent_minutes,
    hints_used: e.hints_used,
    pre_interval_days: e.pre_review?.interval_days,
    pre_days_since_review: e.pre_review?.days_since_last_review,
    pre_days_overdue: e.pre_review?.days_overdue,
    pre_predicted_retention: e.pre_review?.predicted_retention,
    pre_stability: e.pre_review?.stability,
    pre_ease_factor: e.pre_review?.ease_factor,
    post_interval_days: e.post_review?.new_interval_days,
    post_stability: e.post_review?.new_stability,
    post_ease_factor: e.post_review?.new_ease_factor,
    post_mastery_level: e.post_review?.mastery_level,
    mastery_level_changed: e.post_review?.mastery_level_changed,
    actual_retention: e.actual_retention,
    retention_as_predicted: e.retention_as_predicted,
    session_number: e.session_number,
    is_early_review: e.is_early_review,
    is_first_review: e.is_first_review,
  }))
}

async function exportUserSummaries(algorithmFilter: string): Promise<any[]> {
  const summaries: any[] = []

  // Query all user summaries
  const snapshot = await adminDb.collectionGroup("summary").get()

  for (const doc of snapshot.docs) {
    const data = doc.data()

    // Filter by algorithm if specified
    if (algorithmFilter !== "all" && data.algorithm !== algorithmFilter) {
      continue
    }

    summaries.push({
      user_key: pseudonymize(data.user_id),
      algorithm: data.algorithm,
      algorithm_assigned_at: data.algorithm_assigned_at,
      algorithm_user_overridden: data.algorithm_user_overridden,
      total_reviews: data.total_reviews,
      total_problems_seen: data.total_problems_seen,
      total_time_spent_minutes: data.total_time_spent_minutes,
      total_days_active: data.total_days_active,
      lifetime_average_score: data.lifetime_average_score,
      lifetime_retention_rate: data.lifetime_retention_rate,
      lifetime_lapse_rate: data.lifetime_lapse_rate,
      problems_mastered: data.problems_mastered,
      problems_learning: data.problems_learning,
      problems_struggling: data.problems_struggling,
      average_time_to_mastery_days: data.average_time_to_mastery_days,
      longest_streak: data.longest_streak,
      current_streak: data.current_streak,
      average_daily_reviews: data.average_daily_reviews,
      average_session_length_minutes: data.average_session_length_minutes,
      average_interval_accuracy: data.average_interval_accuracy,
      first_review_at: data.first_review_at,
      last_review_at: data.last_review_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    })
  }

  return summaries
}

/**
 * The tested half of the comparison export.
 *
 * A CSV outlives the dashboard that produced it, so it has to carry enough for
 * the reader to judge the claim on their own: the effect with its interval, the
 * n behind it, the correction applied, and the sample ratio check that decides
 * whether any of it is valid. Where the sample cannot support a test the
 * columns are EMPTY rather than zero, and `experiment_verdict` says why. A blank
 * cell reads as "no answer"; a zero reads as "no effect", and those are
 * different claims.
 */
function flattenExperimentReadout(readout: ExperimentReadout): Record<string, unknown> {
  const { primary, sampleRatio, sample, design, window } = readout
  const test = primary.test

  return {
    experiment_id: design.experimentId,
    experiment_verdict: readout.verdict,
    experiment_headline: readout.headline,
    experiment_detail: readout.detail,

    // Analysis window. The tested numbers cover this range, which is NOT the
    // lifetime range the descriptive block above is built from.
    analysis_window_start: window.start,
    analysis_window_end: window.end,
    analysis_events_analyzed: window.eventsAnalyzed,
    analysis_window_truncated: window.truncated,

    // Primary metric, declared in advance so the decision is not made by
    // whichever of the three metrics happens to look best today.
    primary_metric: primary.key,
    primary_metric_label: primary.label,
    primary_n_users_sm2: primary.nControl,
    primary_n_users_fsrs: primary.nTreatment,
    primary_mean_sm2: test ? test.meanControl : null,
    primary_mean_fsrs: test ? test.meanTreatment : null,
    primary_mean_difference_fsrs_minus_sm2: test ? test.meanDifference : null,
    primary_difference_ci95_lower: test ? test.differenceInterval.lower : null,
    primary_difference_ci95_upper: test ? test.differenceInterval.upper : null,
    primary_t_statistic: test ? test.tStatistic : null,
    primary_degrees_of_freedom: test ? test.degreesOfFreedom : null,
    primary_p_value: test ? test.pValue : null,
    primary_p_value_holm_adjusted: primary.adjustedPValue,
    primary_significant_after_correction: test ? primary.significant : null,
    primary_effect_size_cohens_d: test ? test.effectSize.d : null,
    primary_effect_size_ci95_lower: test ? test.effectSize.interval.lower : null,
    primary_effect_size_ci95_upper: test ? test.effectSize.interval.upper : null,
    primary_effect_size_label: test ? test.effectSize.label : null,
    primary_unavailable_reason: primary.unavailableReason,
    multiple_comparison_correction: design.multipleComparisonCorrection,
    metrics_in_family: design.familyMetrics.length,
    alpha: design.alpha,

    // Sample ratio mismatch. Checked first: a broken split makes every
    // comparison above a comparison of two different populations.
    srm_assigned_users_sm2: sampleRatio.nControl,
    srm_assigned_users_fsrs: sampleRatio.nTreatment,
    srm_expected_sm2_share: sampleRatio.expectedControlShare,
    srm_observed_sm2_share: sampleRatio.observedControlShare,
    srm_chi_square: sampleRatio.chiSquare,
    srm_p_value: sampleRatio.pValue,
    srm_alarm_threshold: sampleRatio.threshold,
    srm_mismatch: sampleRatio.mismatch,

    // How much sample the design wanted, and how small an effect this sample
    // could have caught. Without these a null result cannot be told apart from
    // no data.
    users_needed_per_arm_for_target_effect: sample.usersNeededPerArm,
    target_effect_size_cohens_d: design.targetEffectSize,
    minimum_detectable_effect_cohens_d: sample.minimumDetectableEffect,
    power: design.power,
    users_with_mixed_assignment: sample.usersWithMixedAssignment,
    stopping_rule: design.stoppingRule,
  }
}

async function exportComparison(): Promise<any> {
  // One analysis pass gives both halves of this export: the stored descriptive
  // aggregate and the tested readout built from user-level observations.
  const analysis = await analyzeResearchData()
  const comparison = analysis.comparison

  if (!comparison) {
    return {
      message: "No comparison data available",
      ...flattenExperimentReadout(analysis.experiment),
    }
  }

  // Flatten for easier consumption
  return {
    last_updated: comparison.last_updated,
    data_range_start: comparison.data_range.start_date,
    data_range_end: comparison.data_range.end_date,

    // SM-2 stats
    sm2_total_users: comparison.sm2.total_users,
    sm2_active_users_7d: comparison.sm2.active_users_7d,
    sm2_active_users_30d: comparison.sm2.active_users_30d,
    sm2_average_retention_rate: comparison.sm2.average_retention_rate,
    sm2_median_retention_rate: comparison.sm2.median_retention_rate,
    sm2_average_score: comparison.sm2.average_score,
    sm2_median_score: comparison.sm2.median_score,
    sm2_total_problems_mastered: comparison.sm2.total_problems_mastered,
    sm2_average_time_to_mastery_days: comparison.sm2.average_time_to_mastery_days,
    sm2_average_daily_reviews: comparison.sm2.average_daily_reviews,
    sm2_churn_rate_7d: comparison.sm2.churn_rate_7d,
    sm2_churn_rate_30d: comparison.sm2.churn_rate_30d,
    sm2_average_lapse_rate: comparison.sm2.average_lapse_rate,
    sm2_interval_accuracy: comparison.sm2.interval_accuracy,

    // FSRS stats
    fsrs_total_users: comparison.fsrs.total_users,
    fsrs_active_users_7d: comparison.fsrs.active_users_7d,
    fsrs_active_users_30d: comparison.fsrs.active_users_30d,
    fsrs_average_retention_rate: comparison.fsrs.average_retention_rate,
    fsrs_median_retention_rate: comparison.fsrs.median_retention_rate,
    fsrs_average_score: comparison.fsrs.average_score,
    fsrs_median_score: comparison.fsrs.median_score,
    fsrs_total_problems_mastered: comparison.fsrs.total_problems_mastered,
    fsrs_average_time_to_mastery_days: comparison.fsrs.average_time_to_mastery_days,
    fsrs_average_daily_reviews: comparison.fsrs.average_daily_reviews,
    fsrs_churn_rate_7d: comparison.fsrs.churn_rate_7d,
    fsrs_churn_rate_30d: comparison.fsrs.churn_rate_30d,
    fsrs_average_lapse_rate: comparison.fsrs.average_lapse_rate,
    fsrs_interval_accuracy: comparison.fsrs.interval_accuracy,

    // Descriptive differences between the two cohort averages.
    //
    // The export used to end with `overall_winner` and `confidence_level`, the
    // latter computed as `60 + wins * 7`. A spreadsheet outlives the dashboard
    // that produced it, so an invented confidence in a CSV column keeps being
    // quoted long after the screen has been fixed. Both columns are gone, and
    // the wins counts are renamed to say what they actually count.
    retention_rate_difference: comparison.comparison.retention_rate_difference,
    average_score_difference: comparison.comparison.average_score_difference,
    time_to_mastery_difference_days: comparison.comparison.time_to_mastery_difference_days,
    engagement_difference: comparison.comparison.engagement_difference,
    interval_efficiency_difference: comparison.comparison.interval_efficiency_difference,
    sufficient_sample_size: comparison.comparison.sufficient_sample_size,
    fsrs_cohort_averages_led: comparison.comparison.fsrs_wins_count,
    sm2_cohort_averages_led: comparison.comparison.sm2_wins_count,
    analysis_note:
      "Every column above this line is a descriptive cohort average. Leading on an average is not a result. The tested columns below are the ones to quote.",

    ...flattenExperimentReadout(analysis.experiment),
  }
}

function convertToCSV(data: any, type: string): string {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return "No data available"
  }

  if (type === "comparison") {
    // Single object - convert to key-value pairs.
    //
    // An absent value writes an EMPTY cell, not the string "null". A metric
    // that could not be tested has no number, and printing "null" beside a
    // p-value column invites the reader to treat it as a zero.
    const lines = ["metric,value"]
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        lines.push(`${key},`)
        continue
      }
      lines.push(`${key},"${String(value).replace(/"/g, '""')}"`)
    }
    return lines.join("\n")
  }

  // Array of objects
  const array = Array.isArray(data) ? data : [data]
  if (array.length === 0) return "No data available"

  const headers = Object.keys(array[0])
  const lines = [headers.join(",")]

  for (const row of array) {
    const values = headers.map((h) => {
      const val = row[h]
      if (val === null || val === undefined) return ""
      if (
        typeof val === "string" &&
        (val.includes(",") || val.includes('"') || val.includes("\n"))
      ) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return String(val)
    })
    lines.push(values.join(","))
  }

  return lines.join("\n")
}
