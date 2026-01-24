/**
 * Type definitions for Constitutional AI and Scoring Analytics
 *
 * This module tracks:
 * - Constitutional AI interventions (score critiques, feedback critiques)
 * - AI scoring accuracy (correct vs incorrect)
 * - Score evolution over time
 * - Conflicts between initial scoring and Constitutional AI
 */

/**
 * Aspect types that Constitutional AI critiques
 */
export type CritiqueAspect = "fairness" | "tone" | "accuracy" | "actionability"

/**
 * Direction of score adjustment
 */
export type AdjustmentDirection = "increased" | "decreased" | "unchanged"

/**
 * Single score category adjustment record
 */
export interface ScoreCategoryAdjustment {
  category: "understanding" | "problemSolving" | "codeQuality" | "communication"
  originalScore: number
  adjustedScore: number
  delta: number
  direction: AdjustmentDirection
  reason: string
}

/**
 * Constitutional AI intervention record for a single session
 * Stored in Firestore: constitutional_ai_analytics/{sessionId}
 */
export interface ConstitutionalAIIntervention {
  sessionId: string
  userId: string
  timestamp: Date | string
  scenarioType: "dsa" | "system_design" | "bug_fix"
  scenarioId: string
  scenarioTitle: string

  // Score Critique
  scoreCritique: {
    triggered: boolean
    aspectsViolated: CritiqueAspect[]
    madeChanges: boolean
    originalOverall: number
    adjustedOverall: number
    overallDelta: number
    categoryAdjustments: ScoreCategoryAdjustment[]
    reasoning: string
    // Evidence-based floor enforcement
    evidenceFloorApplied: boolean
    evidenceFloorReason?: string
  }

  // Feedback Critique
  feedbackCritique: {
    triggered: boolean
    aspectsViolated: CritiqueAspect[]
    madeChanges: boolean
    reasoning: string
  }

  // Context for analysis
  context: {
    testPassRate: number
    codeIncomplete: boolean
    silentSolution: boolean
    hasBlindCopying: boolean
    communicationQuotesFound: number
    approachExplained: boolean
    complexityDiscussed: boolean
  }
}

/**
 * Aggregated statistics for Constitutional AI analytics
 * Computed on-the-fly from individual interventions
 */
export interface ConstitutionalAIStats {
  totalSessions: number

  // Score critique stats
  scoreCritiqueStats: {
    totalTriggered: number
    totalChanges: number
    changeRate: number // percentage
    avgScoreIncrease: number
    avgScoreDecrease: number
    byAspect: Record<CritiqueAspect, number>
    evidenceFloorApplied: number
  }

  // Feedback critique stats
  feedbackCritiqueStats: {
    totalTriggered: number
    totalChanges: number
    changeRate: number
    byAspect: Record<CritiqueAspect, number>
  }

  // Category-level adjustments
  categoryStats: {
    understanding: CategoryAdjustmentStats
    problemSolving: CategoryAdjustmentStats
    codeQuality: CategoryAdjustmentStats
    communication: CategoryAdjustmentStats
  }

  // Score accuracy analysis
  scoreAccuracy: {
    totalComparisons: number
    correctInitialScores: number // No adjustment needed
    incorrectInitialScores: number // Adjustment made
    accuracyRate: number // percentage
  }

  // Conflict analysis
  conflicts: ConflictSummary[]
}

/**
 * Stats for a single category
 */
export interface CategoryAdjustmentStats {
  totalAdjustments: number
  totalIncreases: number
  totalDecreases: number
  avgIncrease: number
  avgDecrease: number
  commonReasons: Array<{ reason: string; count: number }>
}

/**
 * Summary of a conflict between AI scoring and Constitutional AI
 */
export interface ConflictSummary {
  sessionId: string
  timestamp: Date | string
  scenarioTitle: string
  conflictType: "fairness" | "tone" | "accuracy" | "actionability"
  description: string
  originalScore: number
  adjustedScore: number
  delta: number
}

/**
 * Time series data point for charts
 */
export interface AnalyticsTimeSeriesPoint {
  date: string // ISO date string (YYYY-MM-DD)
  totalSessions: number
  scoreCritiqueChanges: number
  feedbackCritiqueChanges: number
  avgScoreDelta: number
  accuracyRate: number
}

/**
 * Request parameters for analytics API
 */
export interface ScoringAnalyticsRequest {
  timeRange: "7d" | "30d" | "90d" | "all"
  scenarioType?: "dsa" | "system_design" | "bug_fix" | "all"
  includeTimeSeries?: boolean
  includeConflicts?: boolean
  conflictLimit?: number
}

/**
 * Full response from analytics API
 */
export interface ScoringAnalyticsResponse {
  success: boolean
  data: {
    stats: ConstitutionalAIStats
    timeSeries?: AnalyticsTimeSeriesPoint[]
    recentInterventions: ConstitutionalAIIntervention[]
  }
  error?: string
}
