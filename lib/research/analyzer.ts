/**
 * Research Data Analyzer
 *
 * Aggregates and analyzes research data from Firestore collections
 * Provides production-grade statistical analysis for A/B testing
 */

import { adminDb } from "../firebase-admin"
import type {
  AlgorithmComparisonAggregate,
  AlgorithmResearchEvent,
  AlgorithmDailyMetrics,
} from "../types"
import {
  tTest,
  TTestResult,
  calculatePredictionMetrics,
  PredictionMetrics,
  analyzeSampleSize,
  SampleSizeAnalysis,
  analyzeTrend,
  TrendAnalysis,
  mean,
  meanConfidenceInterval,
  ConfidenceInterval,
} from "./statistics"
import {
  aggregateEventsByUser,
  metricValues,
  type UserObservation,
  type UserObservationSet,
} from "./user-observations"
import {
  buildExperimentReadout,
  EXPERIMENT_DESIGN,
  type ExperimentReadout,
} from "./experiment-readout"
import { getAggregateComparison } from "../spaced-repetition/research-tracker"

// ============================================
// Types
// ============================================

/** How far back the analysis looks. A time range, not "the last N events". */
export const ANALYSIS_WINDOW_DAYS = 30

/**
 * Hard cap on documents read in one analysis, purely to bound cost. The window
 * above is what defines the sample; if this cap is ever hit the readout says so
 * rather than quietly analysing an arbitrary slice.
 */
const MAX_EVENTS_PER_ANALYSIS = 20000

export interface EnhancedResearchAnalysis {
  // Basic comparison data
  comparison: AlgorithmComparisonAggregate | null

  /**
   * The answer to "which algorithm is winning": user-level tests, a declared
   * primary metric, an SRM check and an explicit not-enough-data state. This is
   * the field the UI should read for any claim about a winner.
   */
  experiment: ExperimentReadout

  // Statistical significance tests
  significanceTests: {
    retention: TTestResult | null
    score: TTestResult | null
    timeToMastery: TTestResult | null
    dailyReviews: TTestResult | null
    intervalAccuracy: TTestResult | null
  }

  // Prediction accuracy by algorithm
  predictionAccuracy: {
    sm2: PredictionMetrics
    fsrs: PredictionMetrics
    comparison: {
      logLossDifference: number
      winner: "sm2" | "fsrs" | "equal"
      improvement: number // Percentage improvement
    }
  }

  // Sample size analysis
  sampleAnalysis: SampleSizeAnalysis

  // Trend analysis (last 30 days)
  trends: {
    sm2Retention: TrendAnalysis
    fsrsRetention: TrendAnalysis
    sm2Score: TrendAnalysis
    fsrsScore: TrendAnalysis
    overallEngagement: TrendAnalysis
  }

  // Confidence intervals for key metrics
  confidenceIntervals: {
    sm2Retention: ConfidenceInterval
    fsrsRetention: ConfidenceInterval
    sm2Score: ConfidenceInterval
    fsrsScore: ConfidenceInterval
  }

  // Research quality score (0-100)
  qualityScore: {
    overall: number
    sampleSize: number // 0-25
    statisticalPower: number // 0-25
    dataQuality: number // 0-25
    consistency: number // 0-25
    interpretation: string
  }

  // Actionable recommendations
  recommendations: ResearchRecommendation[]

  // Metadata
  metadata: {
    analysisTimestamp: string
    dataRange: { start: string; end: string }
    totalEventsAnalyzed: number
    totalUsersAnalyzed: number
    /** True when the cost cap truncated the window. */
    windowTruncated: boolean
    /** Users assigned to each arm, the denominator of the SRM check. */
    assignedUsers: { sm2: number; fsrs: number; unassigned: number }
  }
}

export interface ResearchRecommendation {
  priority: "high" | "medium" | "low"
  category: "sample_size" | "algorithm" | "data_quality" | "action"
  title: string
  description: string
  action?: string
}

// ============================================
// Main Analyzer Function
// ============================================

/**
 * Default values for when data is unavailable
 */
const DEFAULT_SIGNIFICANCE_TESTS: EnhancedResearchAnalysis["significanceTests"] = {
  retention: null,
  score: null,
  timeToMastery: null,
  dailyReviews: null,
  intervalAccuracy: null,
}

const DEFAULT_PREDICTION_ACCURACY: EnhancedResearchAnalysis["predictionAccuracy"] = {
  sm2: { logLoss: 0, rmse: 0, mae: 0, accuracy: 0, calibration: [], brierScore: 0, aucRoc: 0.5 },
  fsrs: { logLoss: 0, rmse: 0, mae: 0, accuracy: 0, calibration: [], brierScore: 0, aucRoc: 0.5 },
  comparison: { logLossDifference: 0, winner: "equal", improvement: 0 },
}

const DEFAULT_TRENDS: EnhancedResearchAnalysis["trends"] = {
  sm2Retention: { direction: "stable", slope: 0, r2: 0, forecast7d: 0, forecast30d: 0 },
  fsrsRetention: { direction: "stable", slope: 0, r2: 0, forecast7d: 0, forecast30d: 0 },
  sm2Score: { direction: "stable", slope: 0, r2: 0, forecast7d: 0, forecast30d: 0 },
  fsrsScore: { direction: "stable", slope: 0, r2: 0, forecast7d: 0, forecast30d: 0 },
  overallEngagement: { direction: "stable", slope: 0, r2: 0, forecast7d: 0, forecast30d: 0 },
}

const DEFAULT_CONFIDENCE_INTERVALS: EnhancedResearchAnalysis["confidenceIntervals"] = {
  sm2Retention: { lower: 0, upper: 1, point: 0.5, confidenceLevel: 0.95 },
  fsrsRetention: { lower: 0, upper: 1, point: 0.5, confidenceLevel: 0.95 },
  sm2Score: { lower: 0, upper: 100, point: 50, confidenceLevel: 0.95 },
  fsrsScore: { lower: 0, upper: 100, point: 50, confidenceLevel: 0.95 },
}

/**
 * Perform comprehensive research analysis
 * Returns safe defaults when data is unavailable
 */
export async function analyzeResearchData(): Promise<EnhancedResearchAnalysis> {
  const now = new Date()
  const windowStart = new Date(now)
  windowStart.setDate(windowStart.getDate() - ANALYSIS_WINDOW_DAYS)

  // Check if adminDb is initialized
  if (!adminDb) {
    console.warn("Research analyzer: adminDb not initialized, returning defaults")
    return createDefaultAnalysis(now, windowStart)
  }

  let comparison: AlgorithmComparisonAggregate | null = null
  let events: AlgorithmResearchEvent[] = []
  let sm2Events: AlgorithmResearchEvent[] = []
  let fsrsEvents: AlgorithmResearchEvent[] = []

  // Fetch comparison data with error handling.
  //
  // Through getAggregateComparison rather than reading the document directly:
  // that function projects the stored shape, which is what keeps a legacy
  // `confidence_level` written by an older build from riding out to the client
  // inside `comparison`.
  try {
    comparison = await getAggregateComparison()
  } catch (error) {
    console.error("Research analyzer: Failed to fetch comparison data:", error)
    // Continue with null comparison
  }

  // Fetch the events INSIDE THE WINDOW.
  //
  // This used to be "the most recent 5000 events" with no time bound. With one
  // arm reviewing more than the other, the busier arm consumed most of those
  // 5000 slots and the quieter arm was silently squeezed out of its own
  // experiment, so the comparison covered two different date ranges. A fixed
  // time range gives both arms the same window by construction.
  try {
    const eventsSnapshot = await adminDb
      .collection("algorithm_research_events")
      .where("timestamp", ">=", windowStart.toISOString())
      .orderBy("timestamp", "desc")
      .limit(MAX_EVENTS_PER_ANALYSIS)
      .get()

    events = eventsSnapshot.docs.map((doc) => doc.data() as AlgorithmResearchEvent)
    sm2Events = events.filter((e) => e.algorithm === "sm2")
    fsrsEvents = events.filter((e) => e.algorithm === "fsrs")
  } catch (error) {
    console.error("Research analyzer: Failed to fetch events:", error)
    // Continue with empty events
  }

  const windowTruncated = events.length >= MAX_EVENTS_PER_ANALYSIS

  // Collapse to one observation per user: the unit the experiment randomizes.
  const observations = aggregateEventsByUser(events)

  // Assignment counts drive the SRM check, so they come from the profiles
  // collection rather than from the (possibly stale) aggregate document.
  const assignedUsers = await fetchAssignmentCounts()

  const experiment = buildExperimentReadout({
    observations,
    assignedControl: assignedUsers.sm2,
    assignedTreatment: assignedUsers.fsrs,
    window: {
      start: windowStart.toISOString(),
      end: now.toISOString(),
      eventsAnalyzed: events.length,
      truncated: windowTruncated,
    },
  })

  // Calculate significance tests (safe with empty arrays)
  const significanceTests = calculateSignificanceTests(observations)

  // Calculate prediction accuracy (safe with empty arrays)
  const predictionAccuracy = calculatePredictionAccuracyComparison(sm2Events, fsrsEvents)

  // Sample size analysis. The denominator is USERS in each arm, not events.
  const sampleAnalysis = analyzeSampleSize(
    assignedUsers.sm2,
    assignedUsers.fsrs,
    estimateDailyNewUsers(events),
    EXPERIMENT_DESIGN.targetEffectSize
  )

  // Trend analysis with error handling
  let trends: EnhancedResearchAnalysis["trends"]
  try {
    trends = await calculateTrends(windowStart)
  } catch (error) {
    console.error("Research analyzer: Failed to calculate trends:", error)
    trends = DEFAULT_TRENDS
  }

  // Confidence intervals (safe with empty arrays)
  const confidenceIntervals = calculateConfidenceIntervals(observations)

  // Calculate quality score
  const qualityScore = calculateResearchQualityScore(
    sampleAnalysis,
    significanceTests,
    predictionAccuracy,
    events.length
  )

  // Generate recommendations
  const recommendations = generateRecommendations(
    experiment,
    sampleAnalysis,
    predictionAccuracy,
    qualityScore
  )

  return {
    comparison,
    experiment,
    significanceTests,
    predictionAccuracy,
    sampleAnalysis,
    trends,
    confidenceIntervals,
    qualityScore,
    recommendations,
    metadata: {
      analysisTimestamp: now.toISOString(),
      dataRange: {
        start: windowStart.toISOString(),
        end: now.toISOString(),
      },
      totalEventsAnalyzed: events.length,
      totalUsersAnalyzed: observations.sm2.length + observations.fsrs.length,
      windowTruncated,
      assignedUsers,
    },
  }
}

/**
 * Users assigned to each arm, plus the ones with no assignment at all.
 *
 * Unassigned users are counted separately and NOT folded into SM-2. They were
 * never randomized, so counting them as control both fakes an SM-2 majority and
 * makes the sample ratio check fire on a problem that does not exist.
 */
async function fetchAssignmentCounts(): Promise<{
  sm2: number
  fsrs: number
  unassigned: number
}> {
  const empty = { sm2: 0, fsrs: 0, unassigned: 0 }
  if (!adminDb) return empty

  try {
    const profiles = adminDb.collection("profiles")
    const [total, sm2, fsrs] = await Promise.all([
      profiles.count().get(),
      profiles.where("spaced_repetition_algorithm", "==", "sm2").count().get(),
      profiles.where("spaced_repetition_algorithm", "==", "fsrs").count().get(),
    ])

    const sm2Count = sm2.data().count
    const fsrsCount = fsrs.data().count
    return {
      sm2: sm2Count,
      fsrs: fsrsCount,
      unassigned: Math.max(0, total.data().count - sm2Count - fsrsCount),
    }
  } catch (error) {
    console.error("Research analyzer: Failed to count algorithm assignments:", error)
    return empty
  }
}

/**
 * Create a default analysis response when data is unavailable
 */
function createDefaultAnalysis(now: Date, windowStart: Date): EnhancedResearchAnalysis {
  const defaultSampleAnalysis: SampleSizeAnalysis = {
    currentSampleSm2: 0,
    currentSampleFsrs: 0,
    totalSample: 0,
    isSufficient: false,
    minimumRequired: 30,
    recommendedForPower80: 100,
    recommendedForPower95: 200,
    estimatedDaysToSufficient: null,
    powerWithCurrentSample: 0,
  }

  return {
    comparison: null,
    // With no database there is no experiment to read, so the readout is built
    // from empty arms and lands on "not enough data" rather than inventing one.
    experiment: buildExperimentReadout({
      observations: {
        sm2: [],
        fsrs: [],
        eventsUsed: 0,
        usersWithMixedAssignment: 0,
        eventsDiscarded: 0,
      },
      assignedControl: 0,
      assignedTreatment: 0,
      window: {
        start: windowStart.toISOString(),
        end: now.toISOString(),
        eventsAnalyzed: 0,
        truncated: false,
      },
    }),
    significanceTests: DEFAULT_SIGNIFICANCE_TESTS,
    predictionAccuracy: DEFAULT_PREDICTION_ACCURACY,
    sampleAnalysis: defaultSampleAnalysis,
    trends: DEFAULT_TRENDS,
    confidenceIntervals: DEFAULT_CONFIDENCE_INTERVALS,
    qualityScore: {
      overall: 0,
      sampleSize: 0,
      statisticalPower: 0,
      dataQuality: 0,
      consistency: 0,
      interpretation: "No data available - research tracking needs to be set up",
    },
    recommendations: [
      {
        priority: "high",
        category: "data_quality",
        title: "Start Collecting Data",
        description: "No research events have been recorded yet. Begin tracking user interactions.",
        action: "Ensure research tracking is enabled and users are being assigned algorithms.",
      },
    ],
    metadata: {
      analysisTimestamp: now.toISOString(),
      dataRange: {
        start: windowStart.toISOString(),
        end: now.toISOString(),
      },
      totalEventsAnalyzed: 0,
      totalUsersAnalyzed: 0,
      windowTruncated: false,
      assignedUsers: { sm2: 0, fsrs: 0, unassigned: 0 },
    },
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Significance tests for the Statistics tab, computed at the USER level.
 *
 * Every array below holds one number per user. The previous version built these
 * arrays from raw review events, so a single user practising daily contributed
 * dozens of rows, n was reported in the thousands when the experiment had
 * hundreds of users, and the resulting p-values were far too small to believe.
 *
 * The minimum of `minUsersPerArm` per arm is the same bar the verdict uses, so
 * the tab and the banner cannot tell different stories.
 */
function calculateSignificanceTests(
  observations: UserObservationSet
): EnhancedResearchAnalysis["significanceTests"] {
  const minimum = EXPERIMENT_DESIGN.minUsersPerArm

  const testMetric = (
    metric: "retentionRate" | "meanScore" | "intervalAccuracy"
  ): TTestResult | null => {
    const control = metricValues(observations.sm2, metric)
    const treatment = metricValues(observations.fsrs, metric)
    if (control.length < minimum || treatment.length < minimum) return null
    // Argument order matches the rest of the dashboard: SM-2 first, FSRS second,
    // so a positive mean difference always reads as "FSRS higher".
    return tTest(treatment, control)
  }

  return {
    retention: testMetric("retentionRate"),
    score: testMetric("meanScore"),
    timeToMastery: null, // Needs mastery timestamps, which events do not carry
    dailyReviews: null, // Needs a per-user-day aggregation
    intervalAccuracy: testMetric("intervalAccuracy"),
  }
}

/**
 * Prediction quality (log loss, Brier, calibration) is deliberately computed
 * per REVIEW, not per user: each review carries its own retention prediction,
 * so the review is the thing being scored. No significance claim is attached to
 * these numbers for exactly that reason. Anything that compares the two ARMS
 * goes through the user-level path instead.
 */
function calculatePredictionAccuracyComparison(
  sm2Events: AlgorithmResearchEvent[],
  fsrsEvents: AlgorithmResearchEvent[]
): EnhancedResearchAnalysis["predictionAccuracy"] {
  // Extract predictions and actuals
  const sm2Predictions = sm2Events
    .filter((e) => e.pre_review?.predicted_retention !== undefined)
    .map((e) => (e.pre_review?.predicted_retention || 50) / 100)
  const sm2Actuals = sm2Events
    .filter((e) => e.pre_review?.predicted_retention !== undefined)
    .map((e) => e.actual_retention === true)

  const fsrsPredictions = fsrsEvents
    .filter((e) => e.pre_review?.predicted_retention !== undefined)
    .map((e) => (e.pre_review?.predicted_retention || 50) / 100)
  const fsrsActuals = fsrsEvents
    .filter((e) => e.pre_review?.predicted_retention !== undefined)
    .map((e) => e.actual_retention === true)

  const sm2Metrics = calculatePredictionMetrics(sm2Predictions, sm2Actuals)
  const fsrsMetrics = calculatePredictionMetrics(fsrsPredictions, fsrsActuals)

  const logLossDiff = sm2Metrics.logLoss - fsrsMetrics.logLoss
  const winner = Math.abs(logLossDiff) < 0.01 ? "equal" : logLossDiff > 0 ? "fsrs" : "sm2"
  const improvement =
    sm2Metrics.logLoss > 0
      ? ((sm2Metrics.logLoss - fsrsMetrics.logLoss) / sm2Metrics.logLoss) * 100
      : 0

  return {
    sm2: sm2Metrics,
    fsrs: fsrsMetrics,
    comparison: {
      logLossDifference: logLossDiff,
      winner,
      improvement: Math.abs(improvement),
    },
  }
}

function estimateDailyNewUsers(events: AlgorithmResearchEvent[]): number {
  if (events.length === 0) return 0

  // Get unique user-first-event dates
  const userFirstEvents = new Map<string, string>()
  for (const event of events) {
    if (
      !userFirstEvents.has(event.user_id) ||
      event.timestamp < userFirstEvents.get(event.user_id)!
    ) {
      userFirstEvents.set(event.user_id, event.timestamp)
    }
  }

  // Count users per day
  const usersByDay = new Map<string, number>()
  for (const [, timestamp] of userFirstEvents) {
    const day = timestamp.split("T")[0]
    usersByDay.set(day, (usersByDay.get(day) || 0) + 1)
  }

  // Average users per day
  const values = Array.from(usersByDay.values())
  return values.length > 0 ? mean(values) : 0
}

async function calculateTrends(startDate: Date): Promise<EnhancedResearchAnalysis["trends"]> {
  // Return defaults if adminDb not initialized
  if (!adminDb) {
    return DEFAULT_TRENDS
  }

  // Fetch daily metrics for trend analysis
  let dailyMetrics: AlgorithmDailyMetrics[] = []
  try {
    const dailyMetricsSnapshot = await adminDb
      .collectionGroup("daily")
      .where("date", ">=", startDate.toISOString().split("T")[0])
      .orderBy("date", "asc")
      .get()

    dailyMetrics = dailyMetricsSnapshot.docs.map((doc) => doc.data() as AlgorithmDailyMetrics)
  } catch (error) {
    console.error("Research analyzer: Failed to fetch daily metrics:", error)
    return DEFAULT_TRENDS
  }

  // Return defaults if no daily metrics
  if (dailyMetrics.length === 0) {
    return DEFAULT_TRENDS
  }

  // Aggregate by date and algorithm
  const byDateAlgorithm = new Map<
    string,
    { sm2: AlgorithmDailyMetrics[]; fsrs: AlgorithmDailyMetrics[] }
  >()

  for (const metric of dailyMetrics) {
    const key = metric.date
    const current = byDateAlgorithm.get(key) || { sm2: [], fsrs: [] }
    if (metric.algorithm === "sm2") {
      current.sm2.push(metric)
    } else {
      current.fsrs.push(metric)
    }
    byDateAlgorithm.set(key, current)
  }

  // Extract time series
  const dates = Array.from(byDateAlgorithm.keys()).sort()

  const sm2RetentionSeries: number[] = []
  const fsrsRetentionSeries: number[] = []
  const sm2ScoreSeries: number[] = []
  const fsrsScoreSeries: number[] = []
  const engagementSeries: number[] = []

  for (const date of dates) {
    const data = byDateAlgorithm.get(date)!

    // SM-2 daily averages
    if (data.sm2.length > 0) {
      sm2RetentionSeries.push(mean(data.sm2.map((m) => m.retention_rate || 0)))
      sm2ScoreSeries.push(mean(data.sm2.map((m) => m.average_score || 0)))
    }

    // FSRS daily averages
    if (data.fsrs.length > 0) {
      fsrsRetentionSeries.push(mean(data.fsrs.map((m) => m.retention_rate || 0)))
      fsrsScoreSeries.push(mean(data.fsrs.map((m) => m.average_score || 0)))
    }

    // Overall engagement
    const totalReviews = [...data.sm2, ...data.fsrs].reduce(
      (sum, m) => sum + (m.reviews_completed || 0),
      0
    )
    engagementSeries.push(totalReviews)
  }

  return {
    sm2Retention: analyzeTrend(sm2RetentionSeries),
    fsrsRetention: analyzeTrend(fsrsRetentionSeries),
    sm2Score: analyzeTrend(sm2ScoreSeries),
    fsrsScore: analyzeTrend(fsrsScoreSeries),
    overallEngagement: analyzeTrend(engagementSeries),
  }
}

/**
 * Intervals around each arm's mean, at the user level.
 *
 * The retention interval used to be a proportion interval over EVENTS
 * (successes / total reviews), which is an interval for "the next review",
 * not for "the average user", and it was roughly sqrt(reviews per user) times
 * too narrow for the question the page asks. Each arm's interval is now the
 * interval around the mean of its per-user rates.
 */
function calculateConfidenceIntervals(
  observations: UserObservationSet
): EnhancedResearchAnalysis["confidenceIntervals"] {
  const interval = (arm: UserObservation[], metric: "retentionRate" | "meanScore") =>
    meanConfidenceInterval(metricValues(arm, metric))

  return {
    sm2Retention: interval(observations.sm2, "retentionRate"),
    fsrsRetention: interval(observations.fsrs, "retentionRate"),
    sm2Score: interval(observations.sm2, "meanScore"),
    fsrsScore: interval(observations.fsrs, "meanScore"),
  }
}

function calculateResearchQualityScore(
  sampleAnalysis: SampleSizeAnalysis,
  significanceTests: EnhancedResearchAnalysis["significanceTests"],
  predictionAccuracy: EnhancedResearchAnalysis["predictionAccuracy"],
  totalEvents: number
): EnhancedResearchAnalysis["qualityScore"] {
  // Sample size score (0-25)
  let sampleScore = 0
  if (sampleAnalysis.isSufficient) sampleScore += 15
  if (sampleAnalysis.totalSample >= 100) sampleScore += 5
  if (sampleAnalysis.totalSample >= 500) sampleScore += 5

  // Statistical power score (0-25)
  let powerScore = 0
  if (sampleAnalysis.powerWithCurrentSample >= 0.8) powerScore += 25
  else if (sampleAnalysis.powerWithCurrentSample >= 0.6) powerScore += 15
  else if (sampleAnalysis.powerWithCurrentSample >= 0.4) powerScore += 10
  else powerScore += 5

  // Data quality score (0-25)
  let dataQualityScore = 0
  if (totalEvents >= 100) dataQualityScore += 10
  if (totalEvents >= 500) dataQualityScore += 5
  if (totalEvents >= 1000) dataQualityScore += 5
  // Check prediction accuracy
  if (predictionAccuracy.fsrs.accuracy > 0.7 || predictionAccuracy.sm2.accuracy > 0.7) {
    dataQualityScore += 5
  }

  // Consistency score (0-25)
  let consistencyScore = 0
  const testsWithResults = [
    significanceTests.retention,
    significanceTests.score,
    significanceTests.intervalAccuracy,
  ].filter((t) => t !== null)
  if (testsWithResults.length >= 2) consistencyScore += 10
  if (testsWithResults.length >= 3) consistencyScore += 5
  // Check if results are consistent (all pointing same direction)
  const significantTests = testsWithResults.filter((t) => t?.significant)
  if (significantTests.length > 0) consistencyScore += 10

  const overall = sampleScore + powerScore + dataQualityScore + consistencyScore

  // Interpretation
  let interpretation = "Insufficient data for reliable conclusions"
  if (overall >= 80) interpretation = "Research-grade quality - results are highly reliable"
  else if (overall >= 60) interpretation = "Good quality - results are statistically meaningful"
  else if (overall >= 40)
    interpretation = "Moderate quality - results should be interpreted with caution"
  else if (overall >= 20) interpretation = "Low quality - preliminary results only"

  return {
    overall,
    sampleSize: sampleScore,
    statisticalPower: powerScore,
    dataQuality: dataQualityScore,
    consistency: consistencyScore,
    interpretation,
  }
}

function generateRecommendations(
  experiment: ExperimentReadout,
  sampleAnalysis: SampleSizeAnalysis,
  predictionAccuracy: EnhancedResearchAnalysis["predictionAccuracy"],
  qualityScore: EnhancedResearchAnalysis["qualityScore"]
): ResearchRecommendation[] {
  const recommendations: ResearchRecommendation[] = []

  // A broken split invalidates everything else, so it is said first and loudest.
  if (experiment.verdict === "invalid_split") {
    recommendations.push({
      priority: "high",
      category: "data_quality",
      title: "Sample ratio mismatch: stop reading these results",
      description: experiment.detail,
      action:
        "Check assignment: users created while the A/B config was unreachable, a migration that rewrote one arm, or a filter that drops users unevenly.",
    })
  }

  // Sample size recommendations
  if (!sampleAnalysis.isSufficient) {
    recommendations.push({
      priority: "high",
      category: "sample_size",
      title: "Insufficient Sample Size",
      description: `Need at least ${sampleAnalysis.minimumRequired} users per algorithm cohort. Currently: SM-2=${sampleAnalysis.currentSampleSm2}, FSRS=${sampleAnalysis.currentSampleFsrs}.`,
      action: `Wait approximately ${sampleAnalysis.estimatedDaysToSufficient || "unknown"} days for sufficient data.`,
    })
  } else if (sampleAnalysis.powerWithCurrentSample < 0.8) {
    recommendations.push({
      priority: "medium",
      category: "sample_size",
      title: "Low Statistical Power",
      description: `Current power is ${(sampleAnalysis.powerWithCurrentSample * 100).toFixed(0)}%. Recommended: 80%+.`,
      action: `Need ~${sampleAnalysis.recommendedForPower80} users per cohort for 80% power.`,
    })
  }

  // Algorithm recommendation, driven by the corrected primary metric.
  //
  // This used to key off `confidence_level >= 90`, a number produced by
  // `60 + wins * 7`. A metric-counting heuristic cannot support a migration
  // decision, so the recommendation now follows the same test the banner shows.
  if (experiment.verdict === "fsrs_better" || experiment.verdict === "sm2_better") {
    const winner = experiment.verdict === "fsrs_better" ? "FSRS" : "SM-2"
    recommendations.push({
      priority: "high",
      category: "algorithm",
      title: `${winner} wins the primary metric`,
      description: experiment.detail,
      action:
        experiment.window.truncated || experiment.sample.usersWithMixedAssignment > 0
          ? `Confirm on a clean window before migrating everyone to ${winner}.`
          : `Plan the migration to ${winner}, then re-check the guardrail metrics after the switch.`,
    })
  } else if (experiment.verdict === "no_difference_detected") {
    const mde = experiment.sample.minimumDetectableEffect
    recommendations.push({
      priority: "medium",
      category: "algorithm",
      title: "No difference detected on the primary metric",
      description: experiment.detail,
      action: mde
        ? `The current sample could only have detected an effect of d = ${mde.toFixed(2)} or larger. Keep collecting, or accept that anything smaller does not matter commercially.`
        : "Keep collecting.",
    })
  }

  // Prediction accuracy recommendations
  if (predictionAccuracy.comparison.winner !== "equal") {
    const winner = predictionAccuracy.comparison.winner.toUpperCase()
    const improvement = predictionAccuracy.comparison.improvement.toFixed(1)
    recommendations.push({
      priority: "medium",
      category: "algorithm",
      title: `${winner} Has Better Prediction Accuracy`,
      description: `${winner} predictions are ${improvement}% more accurate (lower log loss).`,
      action: "This supports scheduling efficiency - users see cards at optimal times.",
    })
  }

  // Data quality recommendations
  if (qualityScore.dataQuality < 15) {
    recommendations.push({
      priority: "medium",
      category: "data_quality",
      title: "Improve Data Collection",
      description: "Limited data points for analysis. Need more review events.",
      action: "Encourage user engagement to generate more practice data.",
    })
  }

  // Users who appeared in both arms break the randomization and must be chased.
  if (experiment.sample.usersWithMixedAssignment > 0) {
    recommendations.push({
      priority: "medium",
      category: "data_quality",
      title: "Users recorded under both algorithms",
      description: `${experiment.sample.usersWithMixedAssignment} users produced events under both SM-2 and FSRS inside the window and were excluded from the comparison. A randomized user is supposed to stay in one arm.`,
      action: "Check for algorithm overrides or a partial migration during the window.",
    })
  }

  // Action recommendations based on current state
  if (
    qualityScore.overall >= 70 &&
    (experiment.verdict === "fsrs_better" || experiment.verdict === "sm2_better")
  ) {
    recommendations.push({
      priority: "high",
      category: "action",
      title: "Ready for Decision",
      description: `Research quality is sufficient (${qualityScore.overall}/100) and the primary metric is significant after correction.`,
      action: "Consider presenting findings to stakeholders and planning rollout.",
    })
  } else if (qualityScore.overall < 40) {
    recommendations.push({
      priority: "low",
      category: "action",
      title: "Continue Monitoring",
      description: "Research is still in early stages. Avoid premature conclusions.",
      action: "Check back in 1-2 weeks as more data accumulates.",
    })
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}

// ============================================
// Export API endpoint helper
// ============================================

export async function getEnhancedResearchData() {
  return analyzeResearchData()
}
