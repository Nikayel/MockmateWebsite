/**
 * Insight Effectiveness Tracking
 *
 * Tracks whether AI insights and recommendations are actually helping users.
 * Measures:
 * - Which insights are shown vs acted upon
 * - Performance changes after following recommendations
 * - Which recommendation types are most effective
 */

import { adminDb, FieldValue } from "@/lib/firebase-admin"
import type { DSAPattern } from "@/lib/types/dsa-patterns"

// ============================================================================
// TYPES
// ============================================================================

export type InsightType =
  | "critical-weakness"
  | "skill-decay"
  | "misconception"
  | "interview-hot"
  | "weakness-practice"
  | "spaced-review"
  | "strength-challenge"
  | "new-pattern"
  | "warmup"
  | "daily-practice"
  | "behavioral-insight"
  | "session-insight"

export type InteractionType = "shown" | "clicked" | "started" | "completed" | "dismissed"

export interface InsightInteraction {
  id?: string
  userId: string
  insightType: InsightType
  interactionType: InteractionType
  pattern?: DSAPattern
  problemId?: string
  recommendationId?: string
  metadata?: Record<string, unknown>
  timestamp: Date
}

export interface InsightEffectivenessStats {
  insightType: InsightType
  totalShown: number
  totalClicked: number
  totalCompleted: number
  clickThroughRate: number
  completionRate: number
  avgScoreAfter: number | null
  avgScoreBefore: number | null
  improvementRate: number | null
}

export interface UserInsightStats {
  userId: string
  totalInteractions: number
  mostEffectiveInsightType: InsightType | null
  leastEffectiveInsightType: InsightType | null
  avgImprovementFromRecommendations: number | null
  statsPerType: InsightEffectivenessStats[]
  lastUpdated: Date
}

// ============================================================================
// TRACKING FUNCTIONS
// ============================================================================

const COLLECTION = "insight_interactions"
const STATS_COLLECTION = "insight_effectiveness_stats"

/**
 * Track when an insight is shown to a user
 */
export async function trackInsightShown(
  userId: string,
  insightType: InsightType,
  options: {
    pattern?: DSAPattern
    problemId?: string
    recommendationId?: string
    metadata?: Record<string, unknown>
  } = {}
): Promise<void> {
  await trackInteraction(userId, insightType, "shown", options)
}

/**
 * Track when a user clicks on an insight/recommendation
 */
export async function trackInsightClicked(
  userId: string,
  insightType: InsightType,
  options: {
    pattern?: DSAPattern
    problemId?: string
    recommendationId?: string
    metadata?: Record<string, unknown>
  } = {}
): Promise<void> {
  await trackInteraction(userId, insightType, "clicked", options)
}

/**
 * Track when a user starts a recommended problem
 */
export async function trackRecommendationStarted(
  userId: string,
  insightType: InsightType,
  problemId: string,
  pattern: DSAPattern
): Promise<void> {
  await trackInteraction(userId, insightType, "started", { problemId, pattern })
}

/**
 * Track when a user completes a recommended problem
 */
export async function trackRecommendationCompleted(
  userId: string,
  insightType: InsightType,
  problemId: string,
  pattern: DSAPattern,
  score: number
): Promise<void> {
  await trackInteraction(userId, insightType, "completed", {
    problemId,
    pattern,
    metadata: { score },
  })

  // Update effectiveness stats
  await updateEffectivenessStats(userId, insightType, pattern, score)
}

/**
 * Track when a user dismisses an insight
 */
export async function trackInsightDismissed(
  userId: string,
  insightType: InsightType,
  reason?: string
): Promise<void> {
  await trackInteraction(userId, insightType, "dismissed", {
    metadata: { reason },
  })
}

/**
 * Internal function to track interactions
 */
async function trackInteraction(
  userId: string,
  insightType: InsightType,
  interactionType: InteractionType,
  options: {
    pattern?: DSAPattern
    problemId?: string
    recommendationId?: string
    metadata?: Record<string, unknown>
  } = {}
): Promise<void> {
  try {
    const interaction: Omit<InsightInteraction, "id"> = {
      userId,
      insightType,
      interactionType,
      pattern: options.pattern,
      problemId: options.problemId,
      recommendationId: options.recommendationId,
      metadata: options.metadata,
      timestamp: new Date(),
    }

    await adminDb.collection(COLLECTION).add(interaction)

    // Also update aggregated counters
    await updateAggregatedCounters(userId, insightType, interactionType)
  } catch (error) {
    // Best-effort tracking - don't fail the main operation
    console.error("[InsightEffectiveness] Failed to track interaction:", error)
  }
}

/**
 * Update aggregated counters for faster stats retrieval
 */
async function updateAggregatedCounters(
  userId: string,
  insightType: InsightType,
  interactionType: InteractionType
): Promise<void> {
  const counterDoc = adminDb
    .collection(STATS_COLLECTION)
    .doc(userId)
    .collection("counters")
    .doc(insightType)

  const incrementField = `${interactionType}Count`

  await counterDoc.set(
    {
      [incrementField]: FieldValue.increment(1),
      lastUpdated: new Date(),
    },
    { merge: true }
  )
}

/**
 * Update effectiveness stats when a recommendation is completed
 */
async function updateEffectivenessStats(
  userId: string,
  insightType: InsightType,
  pattern: DSAPattern,
  score: number
): Promise<void> {
  try {
    const statsDoc = adminDb
      .collection(STATS_COLLECTION)
      .doc(userId)
      .collection("pattern_scores")
      .doc(pattern)

    const doc = await statsDoc.get()
    const data = doc.data() || { scores: [], byInsightType: {} }

    // Track scores by insight type
    if (!data.byInsightType[insightType]) {
      data.byInsightType[insightType] = { scores: [], count: 0 }
    }
    data.byInsightType[insightType].scores.push(score)
    data.byInsightType[insightType].count++

    // Keep only last 20 scores per insight type
    if (data.byInsightType[insightType].scores.length > 20) {
      data.byInsightType[insightType].scores = data.byInsightType[insightType].scores.slice(-20)
    }

    await statsDoc.set(data, { merge: true })
  } catch (error) {
    console.error("[InsightEffectiveness] Failed to update stats:", error)
  }
}

// ============================================================================
// RETRIEVAL FUNCTIONS
// ============================================================================

/**
 * Get effectiveness stats for a user
 */
export async function getUserInsightStats(userId: string): Promise<UserInsightStats | null> {
  try {
    const countersSnapshot = await adminDb
      .collection(STATS_COLLECTION)
      .doc(userId)
      .collection("counters")
      .get()

    if (countersSnapshot.empty) {
      return null
    }

    const statsPerType: InsightEffectivenessStats[] = []
    let totalInteractions = 0

    for (const doc of countersSnapshot.docs) {
      const insightType = doc.id as InsightType
      const data = doc.data()

      const shown = data.shownCount || 0
      const clicked = data.clickedCount || 0
      const completed = data.completedCount || 0

      totalInteractions += shown + clicked + completed

      statsPerType.push({
        insightType,
        totalShown: shown,
        totalClicked: clicked,
        totalCompleted: completed,
        clickThroughRate: shown > 0 ? clicked / shown : 0,
        completionRate: clicked > 0 ? completed / clicked : 0,
        avgScoreAfter: null, // Would need additional query
        avgScoreBefore: null,
        improvementRate: null,
      })
    }

    // Sort by completion rate to find most/least effective
    statsPerType.sort((a, b) => b.completionRate - a.completionRate)

    return {
      userId,
      totalInteractions,
      mostEffectiveInsightType: statsPerType[0]?.insightType || null,
      leastEffectiveInsightType: statsPerType[statsPerType.length - 1]?.insightType || null,
      avgImprovementFromRecommendations: null, // Would need more data
      statsPerType,
      lastUpdated: new Date(),
    }
  } catch (error) {
    console.error("[InsightEffectiveness] Failed to get user stats:", error)
    return null
  }
}

/**
 * Get global effectiveness stats (for admin/research)
 */
export async function getGlobalInsightStats(): Promise<{
  byInsightType: Record<InsightType, { shown: number; clicked: number; completed: number }>
  mostEffective: InsightType | null
  leastEffective: InsightType | null
}> {
  try {
    // Aggregate across all users - this could be expensive, consider pre-aggregating
    const allStats = await adminDb.collectionGroup("counters").get()

    const aggregated: Record<InsightType, { shown: number; clicked: number; completed: number }> =
      {} as Record<InsightType, { shown: number; clicked: number; completed: number }>

    for (const doc of allStats.docs) {
      const insightType = doc.id as InsightType
      const data = doc.data()

      if (!aggregated[insightType]) {
        aggregated[insightType] = { shown: 0, clicked: 0, completed: 0 }
      }

      aggregated[insightType].shown += data.shownCount || 0
      aggregated[insightType].clicked += data.clickedCount || 0
      aggregated[insightType].completed += data.completedCount || 0
    }

    // Calculate effectiveness (completion rate)
    const effectiveness = Object.entries(aggregated).map(([type, stats]) => ({
      type: type as InsightType,
      rate: stats.clicked > 0 ? stats.completed / stats.clicked : 0,
    }))

    effectiveness.sort((a, b) => b.rate - a.rate)

    return {
      byInsightType: aggregated,
      mostEffective: effectiveness[0]?.type || null,
      leastEffective: effectiveness[effectiveness.length - 1]?.type || null,
    }
  } catch (error) {
    console.error("[InsightEffectiveness] Failed to get global stats:", error)
    return {
      byInsightType: {} as Record<
        InsightType,
        { shown: number; clicked: number; completed: number }
      >,
      mostEffective: null,
      leastEffective: null,
    }
  }
}
