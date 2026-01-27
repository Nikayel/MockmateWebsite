/**
 * Constitutional AI Analytics Persistence
 *
 * Handles storage and retrieval of Constitutional AI intervention records.
 * Uses Firestore for persistence with atomic batch operations.
 */

import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { logger } from "@/lib/logger"
import type {
  ConstitutionalAIIntervention,
  ConstitutionalAIStats,
  CategoryAdjustmentStats,
  ConflictSummary,
  AnalyticsTimeSeriesPoint,
  CritiqueAspect,
  ScoringAnalyticsRequest,
} from "./analytics-types"

const COLLECTION_NAME = "constitutional_ai_analytics"
const STATS_COLLECTION = "constitutional_ai_stats"

/**
 * Persist a Constitutional AI intervention record
 * Called after Constitutional AI critiques scores or feedback
 */
export async function persistConstitutionalAIIntervention(
  intervention: ConstitutionalAIIntervention
): Promise<void> {
  try {
    const docRef = adminDb.collection(COLLECTION_NAME).doc(intervention.sessionId)

    await docRef.set({
      ...intervention,
      timestamp: FieldValue.serverTimestamp(),
    })

    // Update aggregate stats atomically
    await updateAggregateStats(intervention)

    logger.info("[Constitutional AI Analytics] Intervention persisted", {
      sessionId: intervention.sessionId,
      scoreCritiqueTriggered: intervention.scoreCritique.triggered,
      scoreCritiqueMadeChanges: intervention.scoreCritique.madeChanges,
      feedbackCritiqueMadeChanges: intervention.feedbackCritique.madeChanges,
    })
  } catch (error) {
    logger.error("[Constitutional AI Analytics] Failed to persist intervention", {
      error,
      sessionId: intervention.sessionId,
    })
  }
}

/**
 * Update aggregate statistics atomically
 */
async function updateAggregateStats(intervention: ConstitutionalAIIntervention): Promise<void> {
  const statsRef = adminDb.collection(STATS_COLLECTION).doc("global")

  const updates: Record<string, FieldValue | number> = {
    totalSessions: FieldValue.increment(1),
    lastUpdated: FieldValue.serverTimestamp(),
  }

  // Score critique stats
  if (intervention.scoreCritique.triggered) {
    updates["scoreCritique.totalTriggered"] = FieldValue.increment(1)

    if (intervention.scoreCritique.madeChanges) {
      updates["scoreCritique.totalChanges"] = FieldValue.increment(1)

      // Track direction of overall change
      if (intervention.scoreCritique.overallDelta > 0) {
        updates["scoreCritique.totalIncreases"] = FieldValue.increment(1)
        updates["scoreCritique.sumIncreases"] = FieldValue.increment(
          intervention.scoreCritique.overallDelta
        )
      } else if (intervention.scoreCritique.overallDelta < 0) {
        updates["scoreCritique.totalDecreases"] = FieldValue.increment(1)
        updates["scoreCritique.sumDecreases"] = FieldValue.increment(
          Math.abs(intervention.scoreCritique.overallDelta)
        )
      }

      // Track aspects violated
      for (const aspect of intervention.scoreCritique.aspectsViolated) {
        updates[`scoreCritique.byAspect.${aspect}`] = FieldValue.increment(1)
      }

      // Track evidence floor
      if (intervention.scoreCritique.evidenceFloorApplied) {
        updates["scoreCritique.evidenceFloorApplied"] = FieldValue.increment(1)
      }

      // Track category-level adjustments
      for (const adj of intervention.scoreCritique.categoryAdjustments) {
        updates[`categories.${adj.category}.totalAdjustments`] = FieldValue.increment(1)
        if (adj.direction === "increased") {
          updates[`categories.${adj.category}.totalIncreases`] = FieldValue.increment(1)
          updates[`categories.${adj.category}.sumIncreases`] = FieldValue.increment(adj.delta)
        } else if (adj.direction === "decreased") {
          updates[`categories.${adj.category}.totalDecreases`] = FieldValue.increment(1)
          updates[`categories.${adj.category}.sumDecreases`] = FieldValue.increment(
            Math.abs(adj.delta)
          )
        }
      }
    }
  }

  // Feedback critique stats
  if (intervention.feedbackCritique.triggered) {
    updates["feedbackCritique.totalTriggered"] = FieldValue.increment(1)

    if (intervention.feedbackCritique.madeChanges) {
      updates["feedbackCritique.totalChanges"] = FieldValue.increment(1)

      for (const aspect of intervention.feedbackCritique.aspectsViolated) {
        updates[`feedbackCritique.byAspect.${aspect}`] = FieldValue.increment(1)
      }
    }
  }

  await statsRef.set(updates, { merge: true })
}

/**
 * Get Constitutional AI analytics statistics
 */
export async function getConstitutionalAIStats(
  request: ScoringAnalyticsRequest
): Promise<ConstitutionalAIStats> {
  // Get time range filter
  const startDate = getStartDate(request.timeRange)

  // Build query
  let query = adminDb.collection(COLLECTION_NAME).orderBy("timestamp", "desc")

  if (startDate) {
    query = query.where("timestamp", ">=", startDate)
  }

  if (request.scenarioType && request.scenarioType !== "all") {
    query = query.where("scenarioType", "==", request.scenarioType)
  }

  const snapshot = await query.limit(1000).get()

  // Compute stats from individual records
  const stats = computeStatsFromRecords(
    snapshot.docs.map((doc) => doc.data() as ConstitutionalAIIntervention)
  )

  return stats
}

/**
 * Get recent Constitutional AI interventions
 */
export async function getRecentInterventions(
  limit: number = 20,
  scenarioType?: string
): Promise<ConstitutionalAIIntervention[]> {
  let query = adminDb.collection(COLLECTION_NAME).orderBy("timestamp", "desc").limit(limit)

  if (scenarioType && scenarioType !== "all") {
    query = query.where("scenarioType", "==", scenarioType)
  }

  const snapshot = await query.get()

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      ...data,
      timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
    } as ConstitutionalAIIntervention
  })
}

/**
 * Get time series data for charts
 */
export async function getAnalyticsTimeSeries(
  timeRange: "7d" | "30d" | "90d" | "all"
): Promise<AnalyticsTimeSeriesPoint[]> {
  const startDate = getStartDate(timeRange)

  let query = adminDb.collection(COLLECTION_NAME).orderBy("timestamp", "asc")

  if (startDate) {
    query = query.where("timestamp", ">=", startDate)
  }

  const snapshot = await query.get()

  // Group by date
  const byDate = new Map<string, ConstitutionalAIIntervention[]>()

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as ConstitutionalAIIntervention
    const timestamp = data.timestamp
    let date: string

    if (typeof timestamp === "string") {
      date = timestamp.split("T")[0]
    } else if (timestamp && typeof timestamp === "object" && "toDate" in timestamp) {
      // Handle Firestore Timestamp
      const firestoreTimestamp = timestamp as { toDate: () => Date }
      date = firestoreTimestamp.toDate().toISOString().split("T")[0]
    } else {
      date = new Date().toISOString().split("T")[0]
    }

    if (!byDate.has(date)) {
      byDate.set(date, [])
    }
    byDate.get(date)!.push(data)
  })

  // Convert to time series points
  const timeSeries: AnalyticsTimeSeriesPoint[] = []

  byDate.forEach((interventions, date) => {
    const scoreCritiqueChanges = interventions.filter((i) => i.scoreCritique.madeChanges).length
    const feedbackCritiqueChanges = interventions.filter(
      (i) => i.feedbackCritique.madeChanges
    ).length

    const totalDeltas = interventions.reduce(
      (sum, i) => sum + (i.scoreCritique.overallDelta || 0),
      0
    )
    const avgDelta = interventions.length > 0 ? totalDeltas / interventions.length : 0

    const correctScores = interventions.filter((i) => !i.scoreCritique.madeChanges).length
    const accuracyRate =
      interventions.length > 0 ? (correctScores / interventions.length) * 100 : 100

    timeSeries.push({
      date,
      totalSessions: interventions.length,
      scoreCritiqueChanges,
      feedbackCritiqueChanges,
      avgScoreDelta: Math.round(avgDelta * 10) / 10,
      accuracyRate: Math.round(accuracyRate * 10) / 10,
    })
  })

  return timeSeries.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Get conflict summaries
 */
export async function getConflicts(limit: number = 50): Promise<ConflictSummary[]> {
  // Query without composite index requirement - filter in memory instead
  const snapshot = await adminDb
    .collection(COLLECTION_NAME)
    .orderBy("timestamp", "desc")
    .limit(limit * 3) // Fetch more to account for filtering
    .get()

  const conflicts: ConflictSummary[] = []

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as ConstitutionalAIIntervention

    // Filter in memory to avoid composite index requirement
    if (!data.scoreCritique?.madeChanges) return

    // Create a conflict entry for each aspect violated
    data.scoreCritique.aspectsViolated.forEach((aspect) => {
      conflicts.push({
        sessionId: data.sessionId,
        timestamp: data.timestamp,
        scenarioTitle: data.scenarioTitle,
        conflictType: aspect,
        description: data.scoreCritique.reasoning,
        originalScore: data.scoreCritique.originalOverall,
        adjustedScore: data.scoreCritique.adjustedOverall,
        delta: data.scoreCritique.overallDelta,
      })
    })
  })

  return conflicts.slice(0, limit)
}

/**
 * Compute stats from intervention records
 */
function computeStatsFromRecords(
  interventions: ConstitutionalAIIntervention[]
): ConstitutionalAIStats {
  const aspectCounts: Record<CritiqueAspect, number> = {
    fairness: 0,
    tone: 0,
    accuracy: 0,
    actionability: 0,
  }

  const feedbackAspectCounts: Record<CritiqueAspect, number> = {
    fairness: 0,
    tone: 0,
    accuracy: 0,
    actionability: 0,
  }

  const categoryStats: Record<string, CategoryAdjustmentStats> = {
    understanding: createEmptyCategoryStats(),
    problemSolving: createEmptyCategoryStats(),
    codeQuality: createEmptyCategoryStats(),
    communication: createEmptyCategoryStats(),
  }

  const reasonCounts: Record<string, Record<string, number>> = {
    understanding: {},
    problemSolving: {},
    codeQuality: {},
    communication: {},
  }

  let scoreCritiqueTriggered = 0
  let scoreCritiqueChanges = 0
  let totalIncreases = 0
  let totalDecreases = 0
  let sumIncreases = 0
  let sumDecreases = 0
  let evidenceFloorCount = 0

  let feedbackCritiqueTriggered = 0
  let feedbackCritiqueChanges = 0

  interventions.forEach((intervention) => {
    // Score critique
    if (intervention.scoreCritique.triggered) {
      scoreCritiqueTriggered++

      if (intervention.scoreCritique.madeChanges) {
        scoreCritiqueChanges++

        if (intervention.scoreCritique.overallDelta > 0) {
          totalIncreases++
          sumIncreases += intervention.scoreCritique.overallDelta
        } else if (intervention.scoreCritique.overallDelta < 0) {
          totalDecreases++
          sumDecreases += Math.abs(intervention.scoreCritique.overallDelta)
        }

        intervention.scoreCritique.aspectsViolated.forEach((aspect) => {
          aspectCounts[aspect]++
        })

        if (intervention.scoreCritique.evidenceFloorApplied) {
          evidenceFloorCount++
        }

        // Category adjustments
        intervention.scoreCritique.categoryAdjustments.forEach((adj) => {
          const cat = categoryStats[adj.category]
          if (cat) {
            cat.totalAdjustments++
            if (adj.direction === "increased") {
              cat.totalIncreases++
              cat.avgIncrease =
                (cat.avgIncrease * (cat.totalIncreases - 1) + adj.delta) / cat.totalIncreases
            } else if (adj.direction === "decreased") {
              cat.totalDecreases++
              cat.avgDecrease =
                (cat.avgDecrease * (cat.totalDecreases - 1) + Math.abs(adj.delta)) /
                cat.totalDecreases
            }

            // Track reasons
            const reasonKey = adj.reason.slice(0, 50) // Truncate for grouping
            reasonCounts[adj.category][reasonKey] = (reasonCounts[adj.category][reasonKey] || 0) + 1
          }
        })
      }
    }

    // Feedback critique
    if (intervention.feedbackCritique.triggered) {
      feedbackCritiqueTriggered++

      if (intervention.feedbackCritique.madeChanges) {
        feedbackCritiqueChanges++

        intervention.feedbackCritique.aspectsViolated.forEach((aspect) => {
          feedbackAspectCounts[aspect]++
        })
      }
    }
  })

  // Build common reasons for each category
  Object.keys(categoryStats).forEach((cat) => {
    const reasons = reasonCounts[cat]
    categoryStats[cat].commonReasons = Object.entries(reasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }))
  })

  const totalSessions = interventions.length
  const correctScores = totalSessions - scoreCritiqueChanges

  return {
    totalSessions,
    scoreCritiqueStats: {
      totalTriggered: scoreCritiqueTriggered,
      totalChanges: scoreCritiqueChanges,
      changeRate: totalSessions > 0 ? (scoreCritiqueChanges / totalSessions) * 100 : 0,
      avgScoreIncrease: totalIncreases > 0 ? sumIncreases / totalIncreases : 0,
      avgScoreDecrease: totalDecreases > 0 ? sumDecreases / totalDecreases : 0,
      byAspect: aspectCounts,
      evidenceFloorApplied: evidenceFloorCount,
    },
    feedbackCritiqueStats: {
      totalTriggered: feedbackCritiqueTriggered,
      totalChanges: feedbackCritiqueChanges,
      changeRate: totalSessions > 0 ? (feedbackCritiqueChanges / totalSessions) * 100 : 0,
      byAspect: feedbackAspectCounts,
    },
    categoryStats: categoryStats as ConstitutionalAIStats["categoryStats"],
    scoreAccuracy: {
      totalComparisons: totalSessions,
      correctInitialScores: correctScores,
      incorrectInitialScores: scoreCritiqueChanges,
      accuracyRate: totalSessions > 0 ? (correctScores / totalSessions) * 100 : 100,
    },
    conflicts: [], // Populated separately if requested
  }
}

/**
 * Create empty category stats object
 */
function createEmptyCategoryStats(): CategoryAdjustmentStats {
  return {
    totalAdjustments: 0,
    totalIncreases: 0,
    totalDecreases: 0,
    avgIncrease: 0,
    avgDecrease: 0,
    commonReasons: [],
  }
}

/**
 * Get start date for time range filter
 */
function getStartDate(timeRange: "7d" | "30d" | "90d" | "all"): Date | null {
  if (timeRange === "all") return null

  const now = new Date()
  const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90

  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}
