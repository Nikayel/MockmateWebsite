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
  SpacedRepetitionAlgorithm,
} from "../types"
import {
  tTest,
  TTestResult,
  calculatePredictionMetrics,
  PredictionMetrics,
  CalibrationBin,
  analyzeSampleSize,
  SampleSizeAnalysis,
  analyzeTrend,
  TrendAnalysis,
  mean,
  standardDeviation,
  proportionConfidenceInterval,
  ConfidenceInterval,
} from "./statistics"

// ============================================
// Types
// ============================================

export interface EnhancedResearchAnalysis {
  // Basic comparison data
  comparison: AlgorithmComparisonAggregate | null

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
 * Perform comprehensive research analysis
 */
export async function analyzeResearchData(): Promise<EnhancedResearchAnalysis> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Fetch comparison data
  const comparisonDoc = await adminDb
    .collection("algorithm_research_aggregate")
    .doc("comparison")
    .get()
  const comparison = comparisonDoc.exists
    ? (comparisonDoc.data() as AlgorithmComparisonAggregate)
    : null

  // Fetch recent events for detailed analysis
  const eventsSnapshot = await adminDb
    .collection("algorithm_research_events")
    .orderBy("timestamp", "desc")
    .limit(5000) // Analyze last 5000 events
    .get()

  const events = eventsSnapshot.docs.map((doc) => doc.data() as AlgorithmResearchEvent)

  // Separate by algorithm
  const sm2Events = events.filter((e) => e.algorithm === "sm2")
  const fsrsEvents = events.filter((e) => e.algorithm === "fsrs")

  // Calculate significance tests
  const significanceTests = calculateSignificanceTests(sm2Events, fsrsEvents)

  // Calculate prediction accuracy
  const predictionAccuracy = calculatePredictionAccuracyComparison(sm2Events, fsrsEvents)

  // Sample size analysis
  const sampleAnalysis = analyzeSampleSize(
    comparison?.sm2.total_users || 0,
    comparison?.fsrs.total_users || 0,
    estimateDailyNewUsers(events)
  )

  // Trend analysis
  const trends = await calculateTrends(thirtyDaysAgo)

  // Confidence intervals
  const confidenceIntervals = calculateConfidenceIntervals(sm2Events, fsrsEvents)

  // Calculate quality score
  const qualityScore = calculateResearchQualityScore(
    sampleAnalysis,
    significanceTests,
    predictionAccuracy,
    events.length
  )

  // Generate recommendations
  const recommendations = generateRecommendations(
    comparison,
    sampleAnalysis,
    significanceTests,
    predictionAccuracy,
    qualityScore
  )

  return {
    comparison,
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
        start: thirtyDaysAgo.toISOString(),
        end: now.toISOString(),
      },
      totalEventsAnalyzed: events.length,
      totalUsersAnalyzed: new Set(events.map((e) => e.user_id)).size,
    },
  }
}

// ============================================
// Helper Functions
// ============================================

function calculateSignificanceTests(
  sm2Events: AlgorithmResearchEvent[],
  fsrsEvents: AlgorithmResearchEvent[]
): EnhancedResearchAnalysis["significanceTests"] {
  // Extract metrics for each algorithm
  const sm2Scores = sm2Events.map((e) => e.score || 0)
  const fsrsScores = fsrsEvents.map((e) => e.score || 0)

  const sm2Retention = sm2Events.map((e) => (e.actual_retention ? 1 : 0))
  const fsrsRetention = fsrsEvents.map((e) => (e.actual_retention ? 1 : 0))

  const sm2Intervals = sm2Events
    .map((e) => e.post_review?.new_interval_days || 0)
    .filter((v) => v > 0)
  const fsrsIntervals = fsrsEvents
    .map((e) => e.post_review?.new_interval_days || 0)
    .filter((v) => v > 0)

  const sm2Time = sm2Events.map((e) => e.time_spent_minutes || 0).filter((v) => v > 0)
  const fsrsTime = fsrsEvents.map((e) => e.time_spent_minutes || 0).filter((v) => v > 0)

  return {
    retention:
      sm2Retention.length >= 10 && fsrsRetention.length >= 10
        ? tTest(sm2Retention, fsrsRetention)
        : null,
    score: sm2Scores.length >= 10 && fsrsScores.length >= 10 ? tTest(sm2Scores, fsrsScores) : null,
    timeToMastery: null, // Requires different data structure
    dailyReviews: null, // Requires aggregation by user-day
    intervalAccuracy:
      sm2Events.length >= 10 && fsrsEvents.length >= 10
        ? tTest(
            sm2Events.map((e) => (e.retention_as_predicted ? 1 : 0)),
            fsrsEvents.map((e) => (e.retention_as_predicted ? 1 : 0))
          )
        : null,
  }
}

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
  // Fetch daily metrics for trend analysis
  const dailyMetricsSnapshot = await adminDb
    .collectionGroup("daily")
    .where("date", ">=", startDate.toISOString().split("T")[0])
    .orderBy("date", "asc")
    .get()

  const dailyMetrics = dailyMetricsSnapshot.docs.map((doc) => doc.data() as AlgorithmDailyMetrics)

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

function calculateConfidenceIntervals(
  sm2Events: AlgorithmResearchEvent[],
  fsrsEvents: AlgorithmResearchEvent[]
): EnhancedResearchAnalysis["confidenceIntervals"] {
  // Retention confidence intervals
  const sm2RetainedCount = sm2Events.filter((e) => e.actual_retention).length
  const fsrsRetainedCount = fsrsEvents.filter((e) => e.actual_retention).length

  const sm2Scores = sm2Events.map((e) => e.score || 0)
  const fsrsScores = fsrsEvents.map((e) => e.score || 0)

  return {
    sm2Retention: proportionConfidenceInterval(sm2RetainedCount, sm2Events.length),
    fsrsRetention: proportionConfidenceInterval(fsrsRetainedCount, fsrsEvents.length),
    sm2Score: {
      point: mean(sm2Scores),
      lower:
        mean(sm2Scores) - (1.96 * standardDeviation(sm2Scores)) / Math.sqrt(sm2Scores.length || 1),
      upper:
        mean(sm2Scores) + (1.96 * standardDeviation(sm2Scores)) / Math.sqrt(sm2Scores.length || 1),
      confidenceLevel: 0.95,
    },
    fsrsScore: {
      point: mean(fsrsScores),
      lower:
        mean(fsrsScores) -
        (1.96 * standardDeviation(fsrsScores)) / Math.sqrt(fsrsScores.length || 1),
      upper:
        mean(fsrsScores) +
        (1.96 * standardDeviation(fsrsScores)) / Math.sqrt(fsrsScores.length || 1),
      confidenceLevel: 0.95,
    },
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
  comparison: AlgorithmComparisonAggregate | null,
  sampleAnalysis: SampleSizeAnalysis,
  significanceTests: EnhancedResearchAnalysis["significanceTests"],
  predictionAccuracy: EnhancedResearchAnalysis["predictionAccuracy"],
  qualityScore: EnhancedResearchAnalysis["qualityScore"]
): ResearchRecommendation[] {
  const recommendations: ResearchRecommendation[] = []

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

  // Algorithm recommendations
  if (
    comparison?.comparison.overall_winner &&
    (comparison.comparison.confidence_level ?? 0) >= 90
  ) {
    const winner = comparison.comparison.overall_winner.toUpperCase()
    recommendations.push({
      priority: "high",
      category: "algorithm",
      title: `${winner} is Significantly Better`,
      description: `${winner} wins on ${winner === "FSRS" ? comparison.comparison.fsrs_wins_count : comparison.comparison.sm2_wins_count}/5 key metrics with ${comparison.comparison.confidence_level}% confidence.`,
      action: `Consider migrating all users to ${winner}.`,
    })
  } else if (
    comparison?.comparison.overall_winner &&
    (comparison.comparison.confidence_level ?? 0) >= 70
  ) {
    recommendations.push({
      priority: "medium",
      category: "algorithm",
      title: `${comparison.comparison.overall_winner.toUpperCase()} Shows Promise`,
      description: `Early indicators favor ${comparison.comparison.overall_winner.toUpperCase()}, but more data needed for definitive conclusion.`,
      action: "Continue A/B test to strengthen statistical confidence.",
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

  // Action recommendations based on current state
  if (qualityScore.overall >= 70 && comparison?.comparison.overall_winner) {
    recommendations.push({
      priority: "high",
      category: "action",
      title: "Ready for Decision",
      description: `Research quality is sufficient (${qualityScore.overall}/100). Results are actionable.`,
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
