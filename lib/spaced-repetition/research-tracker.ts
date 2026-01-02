/**
 * Algorithm Research Tracker
 *
 * Tracks detailed metrics for A/B testing research between SM-2 and FSRS.
 * Stores granular data for statistical analysis and comparison.
 */

import { adminDb } from '../firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import type {
  SpacedRepetitionAlgorithm,
  SpacedRepetitionMasteryLevel,
  SpacedRepetitionDifficulty,
  AlgorithmDailyMetrics,
  AlgorithmResearchSummary,
  AlgorithmResearchEvent,
  AlgorithmComparisonAggregate,
  AlgorithmCohortStats,
} from '../types'
import { getUserAlgorithm } from './algorithm-router'

// ============================================
// Helper Functions
// ============================================

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0] // YYYY-MM-DD
}

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  return getDateString(d)
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// ============================================
// Daily Metrics Tracking
// ============================================

/**
 * Record a review event and update daily metrics
 */
export async function recordReviewEvent(params: {
  userId: string
  problemId: string
  scenarioId: string
  pattern: string
  difficulty: SpacedRepetitionDifficulty
  score: number
  qualityRating: number
  timeSpentMinutes: number
  hintsUsed: number
  preReviewState: {
    intervalDays: number
    daysSinceLastReview: number
    daysOverdue: number
    easeFactor?: number
    stability?: number
    predictedRetention: number
    masteryLevel: SpacedRepetitionMasteryLevel
  }
  postReviewState: {
    newIntervalDays: number
    newEaseFactor?: number
    newStability?: number
    masteryLevel: SpacedRepetitionMasteryLevel
  }
  isEarlyReview: boolean
  isFirstReview: boolean
  sessionNumber: number
}): Promise<void> {
  const algorithm = await getUserAlgorithm(params.userId)
  const now = new Date()
  const dateStr = getDateString(now)

  // Create the research event
  const eventId = `${params.userId}_${params.problemId}_${now.getTime()}`
  const masteryChanged = params.preReviewState.masteryLevel !== params.postReviewState.masteryLevel
  const actualRetention = params.score >= 56
  const retentionAsPredicted =
    (params.preReviewState.predictedRetention >= 50) === actualRetention

  const event: AlgorithmResearchEvent = {
    id: eventId,
    user_id: params.userId,
    algorithm,
    timestamp: now.toISOString(),
    problem_id: params.problemId,
    scenario_id: params.scenarioId,
    pattern: params.pattern,
    difficulty: params.difficulty,
    score: params.score,
    quality_rating: params.qualityRating,
    time_spent_minutes: params.timeSpentMinutes,
    hints_used: params.hintsUsed,
    pre_review: {
      interval_days: params.preReviewState.intervalDays,
      days_since_last_review: params.preReviewState.daysSinceLastReview,
      days_overdue: params.preReviewState.daysOverdue,
      ease_factor: params.preReviewState.easeFactor,
      stability: params.preReviewState.stability,
      predicted_retention: params.preReviewState.predictedRetention,
    },
    post_review: {
      new_interval_days: params.postReviewState.newIntervalDays,
      new_ease_factor: params.postReviewState.newEaseFactor,
      new_stability: params.postReviewState.newStability,
      mastery_level: params.postReviewState.masteryLevel,
      mastery_level_changed: masteryChanged,
    },
    actual_retention: actualRetention,
    retention_as_predicted: retentionAsPredicted,
    session_number: params.sessionNumber,
    is_early_review: params.isEarlyReview,
    is_first_review: params.isFirstReview,
  }

  // Store the event
  await adminDb.collection('algorithm_research_events').doc(eventId).set(event)

  // Update daily metrics
  await updateDailyMetrics(params.userId, algorithm, dateStr, {
    score: params.score,
    qualityRating: params.qualityRating,
    timeSpentMinutes: params.timeSpentMinutes,
    hintsUsed: params.hintsUsed,
    difficulty: params.difficulty,
    intervalScheduled: params.postReviewState.newIntervalDays,
    retained: actualRetention,
    lapsed: params.score < 40,
    masteredToday: masteryChanged && params.postReviewState.masteryLevel === 'mastered',
    regressedToday: masteryChanged &&
      ['learning', 'new'].includes(params.postReviewState.masteryLevel) &&
      ['reviewing', 'mastered'].includes(params.preReviewState.masteryLevel),
    isNewProblem: params.isFirstReview,
  })

  // Update user summary
  await updateResearchSummary(params.userId, algorithm, {
    score: params.score,
    timeSpentMinutes: params.timeSpentMinutes,
    retained: actualRetention,
    lapsed: params.score < 40,
    intervalScheduled: params.postReviewState.newIntervalDays,
    retentionAsPredicted,
    newProblemMastered: masteryChanged && params.postReviewState.masteryLevel === 'mastered',
    easeFactor: params.postReviewState.newEaseFactor,
    stability: params.postReviewState.newStability,
  })
}

/**
 * Update daily metrics for a user
 */
async function updateDailyMetrics(
  userId: string,
  algorithm: SpacedRepetitionAlgorithm,
  dateStr: string,
  data: {
    score: number
    qualityRating: number
    timeSpentMinutes: number
    hintsUsed: number
    difficulty: SpacedRepetitionDifficulty
    intervalScheduled: number
    retained: boolean
    lapsed: boolean
    masteredToday: boolean
    regressedToday: boolean
    isNewProblem: boolean
  }
): Promise<void> {
  const metricsRef = adminDb
    .collection('algorithm_research_metrics')
    .doc(userId)
    .collection('daily')
    .doc(dateStr)

  const doc = await metricsRef.get()

  if (!doc.exists) {
    // Create new daily record
    const newMetrics: AlgorithmDailyMetrics = {
      user_id: userId,
      algorithm,
      date: dateStr,
      reviews_completed: 1,
      reviews_skipped: 0,
      total_review_time_minutes: data.timeSpentMinutes,
      average_review_time_minutes: data.timeSpentMinutes,
      scores: [data.score],
      average_score: data.score,
      median_score: data.score,
      lowest_score: data.score,
      highest_score: data.score,
      quality_distribution: { [data.qualityRating]: 1 },
      retention_rate: data.retained ? 100 : 0,
      lapse_count: data.lapsed ? 1 : 0,
      first_try_success_rate: data.retained ? 100 : 0,
      problems_due_at_start: 0, // Will be set separately
      problems_completed: 1,
      new_problems_learned: data.isNewProblem ? 1 : 0,
      problems_mastered_today: data.masteredToday ? 1 : 0,
      problems_regressed_today: data.regressedToday ? 1 : 0,
      streak_days: 0, // Will be set from user profile
      session_count: 1,
      longest_session_minutes: data.timeSpentMinutes,
      intervals_scheduled: [data.intervalScheduled],
      average_interval_days: data.intervalScheduled,
      max_interval_days: data.intervalScheduled,
      hints_used: data.hintsUsed,
      problems_by_difficulty: {
        easy: { attempted: 0, avg_score: 0 },
        medium: { attempted: 0, avg_score: 0 },
        hard: { attempted: 0, avg_score: 0 },
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Set difficulty stats
    newMetrics.problems_by_difficulty[data.difficulty] = {
      attempted: 1,
      avg_score: data.score,
    }

    await metricsRef.set(newMetrics)
  } else {
    // Update existing record
    const existing = doc.data() as AlgorithmDailyMetrics
    const newScores = [...existing.scores, data.score]
    const newIntervals = [...existing.intervals_scheduled, data.intervalScheduled]
    const retained = newScores.filter(s => s >= 56).length
    const newQualityDist = { ...existing.quality_distribution }
    newQualityDist[data.qualityRating] = (newQualityDist[data.qualityRating] || 0) + 1

    // Update difficulty stats
    const diffStats = { ...existing.problems_by_difficulty }
    const currentDiff = diffStats[data.difficulty]
    const newAttempted = currentDiff.attempted + 1
    const newAvgScore = ((currentDiff.avg_score * currentDiff.attempted) + data.score) / newAttempted
    diffStats[data.difficulty] = {
      attempted: newAttempted,
      avg_score: Math.round(newAvgScore),
    }

    await metricsRef.update({
      reviews_completed: FieldValue.increment(1),
      total_review_time_minutes: FieldValue.increment(data.timeSpentMinutes),
      average_review_time_minutes:
        (existing.total_review_time_minutes + data.timeSpentMinutes) / (existing.reviews_completed + 1),
      scores: newScores,
      average_score: Math.round(newScores.reduce((a, b) => a + b, 0) / newScores.length),
      median_score: median(newScores),
      lowest_score: Math.min(existing.lowest_score, data.score),
      highest_score: Math.max(existing.highest_score, data.score),
      quality_distribution: newQualityDist,
      retention_rate: Math.round((retained / newScores.length) * 100),
      lapse_count: data.lapsed ? FieldValue.increment(1) : existing.lapse_count,
      first_try_success_rate: Math.round((retained / newScores.length) * 100),
      problems_completed: FieldValue.increment(1),
      new_problems_learned: data.isNewProblem
        ? FieldValue.increment(1)
        : existing.new_problems_learned,
      problems_mastered_today: data.masteredToday
        ? FieldValue.increment(1)
        : existing.problems_mastered_today,
      problems_regressed_today: data.regressedToday
        ? FieldValue.increment(1)
        : existing.problems_regressed_today,
      intervals_scheduled: newIntervals,
      average_interval_days: Math.round(newIntervals.reduce((a, b) => a + b, 0) / newIntervals.length),
      max_interval_days: Math.max(existing.max_interval_days, data.intervalScheduled),
      hints_used: FieldValue.increment(data.hintsUsed),
      problems_by_difficulty: diffStats,
      updated_at: new Date().toISOString(),
    })
  }
}

/**
 * Update user's research summary
 */
async function updateResearchSummary(
  userId: string,
  algorithm: SpacedRepetitionAlgorithm,
  data: {
    score: number
    timeSpentMinutes: number
    retained: boolean
    lapsed: boolean
    intervalScheduled: number
    retentionAsPredicted: boolean
    newProblemMastered: boolean
    easeFactor?: number
    stability?: number
  }
): Promise<void> {
  const summaryRef = adminDb
    .collection('algorithm_research_metrics')
    .doc(userId)
    .collection('summary')
    .doc('current')

  const doc = await summaryRef.get()

  if (!doc.exists) {
    // Create new summary
    const now = new Date().toISOString()
    const weekStart = getWeekStart()

    const newSummary: AlgorithmResearchSummary = {
      user_id: userId,
      algorithm,
      algorithm_assigned_at: now,
      algorithm_user_overridden: false,
      total_reviews: 1,
      total_problems_seen: 1,
      total_time_spent_minutes: data.timeSpentMinutes,
      total_days_active: 1,
      lifetime_average_score: data.score,
      lifetime_retention_rate: data.retained ? 100 : 0,
      lifetime_lapse_rate: data.lapsed ? 100 : 0,
      problems_mastered: data.newProblemMastered ? 1 : 0,
      problems_learning: data.newProblemMastered ? 0 : 1,
      problems_struggling: 0,
      average_time_to_mastery_days: 0,
      longest_streak: 1,
      current_streak: 1,
      average_daily_reviews: 1,
      average_session_length_minutes: data.timeSpentMinutes,
      weekly_averages: [{
        week_start: weekStart,
        average_score: data.score,
        retention_rate: data.retained ? 100 : 0,
        reviews_completed: 1,
        problems_mastered: data.newProblemMastered ? 1 : 0,
      }],
      average_interval_accuracy: data.retentionAsPredicted ? 100 : 0,
      interval_distribution: {
        '1-3_days': data.intervalScheduled <= 3 ? 1 : 0,
        '4-7_days': data.intervalScheduled >= 4 && data.intervalScheduled <= 7 ? 1 : 0,
        '8-14_days': data.intervalScheduled >= 8 && data.intervalScheduled <= 14 ? 1 : 0,
        '15-30_days': data.intervalScheduled >= 15 && data.intervalScheduled <= 30 ? 1 : 0,
        '31-60_days': data.intervalScheduled >= 31 && data.intervalScheduled <= 60 ? 1 : 0,
        '60+_days': data.intervalScheduled > 60 ? 1 : 0,
      },
      first_review_at: now,
      last_review_at: now,
      created_at: now,
      updated_at: now,
    }

    // Add algorithm-specific data
    if (algorithm === 'sm2' && data.easeFactor) {
      newSummary.sm2_specific = {
        average_ease_factor: data.easeFactor,
        ease_factor_distribution: { [data.easeFactor.toFixed(1)]: 1 },
      }
    } else if (algorithm === 'fsrs' && data.stability) {
      newSummary.fsrs_specific = {
        average_stability: data.stability,
        average_difficulty: 5,
        desired_retention: 0.9,
      }
    }

    await summaryRef.set(newSummary)
  } else {
    // Update existing summary
    const existing = doc.data() as AlgorithmResearchSummary
    const newTotalReviews = existing.total_reviews + 1
    const newRetained = (existing.lifetime_retention_rate * existing.total_reviews / 100) +
      (data.retained ? 1 : 0)
    const newLapsed = (existing.lifetime_lapse_rate * existing.total_reviews / 100) +
      (data.lapsed ? 1 : 0)
    const newAccurate = (existing.average_interval_accuracy * existing.total_reviews / 100) +
      (data.retentionAsPredicted ? 1 : 0)

    // Determine interval bucket
    const intervalBucket =
      data.intervalScheduled <= 3 ? '1-3_days' :
      data.intervalScheduled <= 7 ? '4-7_days' :
      data.intervalScheduled <= 14 ? '8-14_days' :
      data.intervalScheduled <= 30 ? '15-30_days' :
      data.intervalScheduled <= 60 ? '31-60_days' : '60+_days'

    const newIntervalDist = { ...existing.interval_distribution }
    newIntervalDist[intervalBucket] = (newIntervalDist[intervalBucket] || 0) + 1

    const updateData: Record<string, unknown> = {
      total_reviews: FieldValue.increment(1),
      total_time_spent_minutes: FieldValue.increment(data.timeSpentMinutes),
      lifetime_average_score: Math.round(
        ((existing.lifetime_average_score * existing.total_reviews) + data.score) / newTotalReviews
      ),
      lifetime_retention_rate: Math.round((newRetained / newTotalReviews) * 100),
      lifetime_lapse_rate: Math.round((newLapsed / newTotalReviews) * 100),
      average_interval_accuracy: Math.round((newAccurate / newTotalReviews) * 100),
      interval_distribution: newIntervalDist,
      last_review_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (data.newProblemMastered) {
      updateData.problems_mastered = FieldValue.increment(1)
    }

    await summaryRef.update(updateData)
  }
}

/**
 * Record a skipped review
 */
export async function recordSkippedReview(userId: string): Promise<void> {
  const algorithm = await getUserAlgorithm(userId)
  const dateStr = getDateString()

  const metricsRef = adminDb
    .collection('algorithm_research_metrics')
    .doc(userId)
    .collection('daily')
    .doc(dateStr)

  const doc = await metricsRef.get()

  if (doc.exists) {
    await metricsRef.update({
      reviews_skipped: FieldValue.increment(1),
      updated_at: new Date().toISOString(),
    })
  }
}

// ============================================
// Aggregate Comparison
// ============================================

/**
 * Generate aggregate comparison between SM-2 and FSRS cohorts
 * This should be run periodically (e.g., daily cron job)
 */
export async function generateAggregateComparison(): Promise<AlgorithmComparisonAggregate> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Query each algorithm separately to match available index:
  // (algorithm ASC, total_reviews DESC)
  let sm2Users: AlgorithmResearchSummary[] = []
  let fsrsUsers: AlgorithmResearchSummary[] = []

  try {
    // Query SM-2 users
    const sm2Snap = await adminDb
      .collectionGroup('summary')
      .where('algorithm', '==', 'sm2')
      .where('total_reviews', '>', 0)
      .get()

    sm2Snap.docs.forEach((doc) => {
      const data = doc.data() as AlgorithmResearchSummary
      if (!data.algorithm_user_overridden) {
        sm2Users.push(data)
      }
    })
  } catch (error) {
    console.warn('[ResearchTracker] Failed to query SM-2 summaries:', error)
  }

  try {
    // Query FSRS users
    const fsrsSnap = await adminDb
      .collectionGroup('summary')
      .where('algorithm', '==', 'fsrs')
      .where('total_reviews', '>', 0)
      .get()

    fsrsSnap.docs.forEach((doc) => {
      const data = doc.data() as AlgorithmResearchSummary
      if (!data.algorithm_user_overridden) {
        fsrsUsers.push(data)
      }
    })
  } catch (error) {
    console.warn('[ResearchTracker] Failed to query FSRS summaries:', error)
  }

  // Calculate cohort stats
  const sm2Stats = calculateCohortStats('sm2', sm2Users, thirtyDaysAgo)
  const fsrsStats = calculateCohortStats('fsrs', fsrsUsers, thirtyDaysAgo)

  // Calculate comparison
  const comparison: {
    retention_rate_difference: number
    average_score_difference: number
    time_to_mastery_difference_days: number
    engagement_difference: number
    interval_efficiency_difference: number
    sufficient_sample_size: boolean
    overall_winner: SpacedRepetitionAlgorithm | null
    confidence_level: number | null
    fsrs_wins_count: number
    sm2_wins_count: number
  } = {
    retention_rate_difference: fsrsStats.average_retention_rate - sm2Stats.average_retention_rate,
    average_score_difference: fsrsStats.average_score - sm2Stats.average_score,
    time_to_mastery_difference_days:
      sm2Stats.average_time_to_mastery_days - fsrsStats.average_time_to_mastery_days,
    engagement_difference: fsrsStats.average_daily_reviews - sm2Stats.average_daily_reviews,
    interval_efficiency_difference: fsrsStats.interval_accuracy - sm2Stats.interval_accuracy,
    sufficient_sample_size: sm2Users.length >= 30 && fsrsUsers.length >= 30,
    overall_winner: null, // Use null instead of undefined for Firestore compatibility
    confidence_level: null,
    fsrs_wins_count: 0,
    sm2_wins_count: 0,
  }

  // Count wins for each algorithm across metrics
  const metricComparisons = [
    { name: 'retention', fsrsBetter: comparison.retention_rate_difference > 0 },
    { name: 'score', fsrsBetter: comparison.average_score_difference > 0 },
    { name: 'time_to_mastery', fsrsBetter: comparison.time_to_mastery_difference_days > 0 },
    { name: 'engagement', fsrsBetter: comparison.engagement_difference > 0 },
    { name: 'interval_efficiency', fsrsBetter: comparison.interval_efficiency_difference > 0 },
  ]

  const fsrsWins = metricComparisons.filter(m => m.fsrsBetter).length
  const sm2Wins = 5 - fsrsWins

  comparison.fsrs_wins_count = fsrsWins
  comparison.sm2_wins_count = sm2Wins

  // Determine winner if sample size is sufficient
  if (comparison.sufficient_sample_size) {
    if (fsrsWins >= 4) {
      comparison.overall_winner = 'fsrs'
      comparison.confidence_level = Math.min(95, 60 + fsrsWins * 7)
    } else if (fsrsWins <= 1) {
      comparison.overall_winner = 'sm2'
      comparison.confidence_level = Math.min(95, 60 + sm2Wins * 7)
    }
    // If 2-3 wins each, no clear winner - leave as null
  }

  const aggregate: AlgorithmComparisonAggregate = {
    last_updated: now.toISOString(),
    data_range: {
      start_date: thirtyDaysAgo.toISOString(),
      end_date: now.toISOString(),
    },
    sm2: sm2Stats,
    fsrs: fsrsStats,
    comparison,
  }

  // Store the aggregate
  await adminDb
    .collection('algorithm_research_aggregate')
    .doc('comparison')
    .set(aggregate)

  return aggregate
}

function calculateCohortStats(
  algorithm: SpacedRepetitionAlgorithm,
  users: AlgorithmResearchSummary[],
  thirtyDaysAgo: Date
): AlgorithmCohortStats {
  if (users.length === 0) {
    return createEmptyCohortStats(algorithm)
  }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const activeUsers7d = users.filter(u =>
    new Date(u.last_review_at) >= sevenDaysAgo
  )
  const activeUsers30d = users.filter(u =>
    new Date(u.last_review_at) >= thirtyDaysAgo
  )

  const retentionRates = users.map(u => u.lifetime_retention_rate)
  const scores = users.map(u => u.lifetime_average_score)

  return {
    algorithm,
    total_users: users.length,
    active_users_7d: activeUsers7d.length,
    active_users_30d: activeUsers30d.length,
    users_with_overrides: 0, // All overridden users were filtered out

    average_retention_rate: Math.round(
      retentionRates.reduce((a, b) => a + b, 0) / retentionRates.length
    ),
    median_retention_rate: median(retentionRates),
    average_score: Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length
    ),
    median_score: median(scores),

    total_problems_mastered: users.reduce((sum, u) => sum + u.problems_mastered, 0),
    average_problems_mastered_per_user: Math.round(
      users.reduce((sum, u) => sum + u.problems_mastered, 0) / users.length
    ),
    average_time_to_mastery_days: Math.round(
      users.reduce((sum, u) => sum + u.average_time_to_mastery_days, 0) / users.length
    ),

    average_streak_days: Math.round(
      users.reduce((sum, u) => sum + u.current_streak, 0) / users.length
    ),
    average_daily_reviews: Math.round(
      users.reduce((sum, u) => sum + u.average_daily_reviews, 0) / users.length * 10
    ) / 10,
    average_session_length_minutes: Math.round(
      users.reduce((sum, u) => sum + u.average_session_length_minutes, 0) / users.length
    ),
    churn_rate_7d: Math.round((1 - activeUsers7d.length / users.length) * 100),
    churn_rate_30d: Math.round((1 - activeUsers30d.length / users.length) * 100),

    score_distribution: calculateScoreDistribution(users),

    average_lapse_rate: Math.round(
      users.reduce((sum, u) => sum + u.lifetime_lapse_rate, 0) / users.length
    ),
    users_with_zero_lapses: users.filter(u => u.lifetime_lapse_rate === 0).length,

    average_interval_days: calculateAverageInterval(users),
    interval_accuracy: Math.round(
      users.reduce((sum, u) => sum + u.average_interval_accuracy, 0) / users.length
    ),

    weekly_trends: [], // Will be populated from daily data if needed
  }
}

function createEmptyCohortStats(algorithm: SpacedRepetitionAlgorithm): AlgorithmCohortStats {
  return {
    algorithm,
    total_users: 0,
    active_users_7d: 0,
    active_users_30d: 0,
    users_with_overrides: 0,
    average_retention_rate: 0,
    median_retention_rate: 0,
    average_score: 0,
    median_score: 0,
    total_problems_mastered: 0,
    average_problems_mastered_per_user: 0,
    average_time_to_mastery_days: 0,
    average_streak_days: 0,
    average_daily_reviews: 0,
    average_session_length_minutes: 0,
    churn_rate_7d: 0,
    churn_rate_30d: 0,
    score_distribution: {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0,
    },
    average_lapse_rate: 0,
    users_with_zero_lapses: 0,
    average_interval_days: 0,
    interval_accuracy: 0,
    weekly_trends: [],
  }
}

function calculateScoreDistribution(users: AlgorithmResearchSummary[]): AlgorithmCohortStats['score_distribution'] {
  const dist = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 }

  users.forEach((u) => {
    const score = u.lifetime_average_score
    if (score <= 20) dist['0-20']++
    else if (score <= 40) dist['21-40']++
    else if (score <= 60) dist['41-60']++
    else if (score <= 80) dist['61-80']++
    else dist['81-100']++
  })

  return dist
}

function calculateAverageInterval(users: AlgorithmResearchSummary[]): number {
  let totalWeight = 0
  let weightedSum = 0

  users.forEach((u) => {
    const dist = u.interval_distribution
    const weights = {
      '1-3_days': 2,
      '4-7_days': 5.5,
      '8-14_days': 11,
      '15-30_days': 22.5,
      '31-60_days': 45.5,
      '60+_days': 90,
    }

    Object.entries(dist).forEach(([key, count]) => {
      const avgDays = weights[key as keyof typeof weights]
      weightedSum += avgDays * count
      totalWeight += count
    })
  })

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0
}

// ============================================
// Query Functions for Admin Dashboard
// ============================================

/**
 * Get the latest aggregate comparison
 */
export async function getAggregateComparison(): Promise<AlgorithmComparisonAggregate | null> {
  const doc = await adminDb
    .collection('algorithm_research_aggregate')
    .doc('comparison')
    .get()

  return doc.exists ? (doc.data() as AlgorithmComparisonAggregate) : null
}

/**
 * Get user's research summary
 */
export async function getUserResearchSummary(
  userId: string
): Promise<AlgorithmResearchSummary | null> {
  const doc = await adminDb
    .collection('algorithm_research_metrics')
    .doc(userId)
    .collection('summary')
    .doc('current')
    .get()

  return doc.exists ? (doc.data() as AlgorithmResearchSummary) : null
}

/**
 * Get user's daily metrics for a date range
 */
export async function getUserDailyMetrics(
  userId: string,
  startDate: string,
  endDate: string
): Promise<AlgorithmDailyMetrics[]> {
  const snapshot = await adminDb
    .collection('algorithm_research_metrics')
    .doc(userId)
    .collection('daily')
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .orderBy('date', 'desc')
    .get()

  return snapshot.docs.map((doc) => doc.data() as AlgorithmDailyMetrics)
}

/**
 * Get recent research events for analysis
 */
export async function getRecentEvents(
  limit: number = 100,
  algorithm?: SpacedRepetitionAlgorithm
): Promise<AlgorithmResearchEvent[]> {
  let query = adminDb
    .collection('algorithm_research_events')
    .orderBy('timestamp', 'desc')
    .limit(limit)

  if (algorithm) {
    query = adminDb
      .collection('algorithm_research_events')
      .where('algorithm', '==', algorithm)
      .orderBy('timestamp', 'desc')
      .limit(limit)
  }

  const snapshot = await query.get()
  return snapshot.docs.map((doc) => doc.data() as AlgorithmResearchEvent)
}
