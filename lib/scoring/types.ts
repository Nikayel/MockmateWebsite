/**
 * Scoring Types
 *
 * Centralized type definitions for the scoring system.
 * Two distinct scores serve different purposes:
 * - performanceScore: Full interview evaluation (includes communication)
 * - technicalScore: Objective code metrics (= masteryScore)
 *
 * Technical Score is now unified with Mastery Score for simplicity.
 * Both measure objective coding ability without communication:
 * - Correctness (60%): test pass rate
 * - Time Efficiency (25%): how quickly solved relative to expected time
 * - Independence (15%): minimal hint usage
 */

/**
 * Breakdown of individual score components for persistence (0-100 each)
 *
 * NOTE: This is the minimal breakdown stored in Firestore.
 * For the full client-side breakdown with aiCollaborationIndicator,
 * see ScoreBreakdown in lib/scoring.ts
 */
export interface ScoreBreakdown {
  understandingScore: number // How well user understood the problem
  problemSolvingScore: number // Approach and algorithm selection
  codeQualityScore: number // Code correctness, efficiency, cleanliness
  communicationScore: number // Explaining approach, discussing trade-offs
  overallScore: number // Weighted average of all components
}

/**
 * All scores calculated for a session
 */
export interface SessionScores {
  performanceScore: number // Full score with communication (0-100)
  technicalScore: number // Objective metrics: correctness + time + independence (= masteryScore)
  masteryScore: number // Same as technicalScore, used for spaced repetition scheduling
  breakdown: ScoreBreakdown
}

/**
 * User aggregate statistics stored in user_stats collection
 */
export interface UserScoreStats {
  totalSessions: number
  sumOverallScore: number // Sum for calculating averages
  sumTechnicalScore: number
  sumMasteryScore: number
  lastUpdated: Date
}

/**
 * Computed user averages (derived from UserScoreStats)
 */
export interface UserAverages {
  averageOverallScore: number
  averageTechnicalScore: number
  averageMasteryScore: number
  totalSessions: number
}

/**
 * Mastery level for spaced repetition
 * - new: Never practiced
 * - learning: Short intervals, still building skill
 * - reviewing: Medium intervals, needs occasional practice
 * - mastered: Long intervals (21+ days), in long-term memory
 */
export type MasteryLevel = "new" | "learning" | "reviewing" | "mastered"

/**
 * Mastery statistics by level
 */
export interface MasteryStatistics {
  total: number
  new: number
  learning: number
  reviewing: number
  mastered: number
}

/**
 * Input for score persistence
 */
export interface ScorePersistenceInput {
  userId: string
  sessionId: string
  problemId: string
  scores: SessionScores
}

import { SCORING } from "../constants"

// Re-export scoring component interfaces from constants
// These provide typed parameters for score calculation functions
export type {
  PerformanceScoreComponents,
  TechnicalScoreComponents,
  PerformanceLevel,
  LetterGrade,
} from "../constants"

/**
 * Score weights for different calculation methods
 *
 * IMPORTANT: These are re-exported from lib/constants.ts for backwards compatibility.
 * All weight definitions should be in constants.ts (single source of truth).
 *
 * Philosophy:
 * - Performance Score = Full interview simulation (communication matters)
 * - Technical Score = Mastery Score = Objective code metrics (no communication)
 */
export const SCORE_WEIGHTS = {
  // Performance score (full interview simulation)
  performance: {
    understanding: SCORING.PERFORMANCE_WEIGHTS.UNDERSTANDING,
    problemSolving: SCORING.PERFORMANCE_WEIGHTS.PROBLEM_SOLVING,
    codeQuality: SCORING.PERFORMANCE_WEIGHTS.CODE_QUALITY,
    communication: SCORING.PERFORMANCE_WEIGHTS.COMMUNICATION,
  },
  // Technical score = Mastery score (objective metrics only)
  // Calculated in lib/spaced-repetition/mastery-score.ts
  technical: {
    correctness: SCORING.TECHNICAL_WEIGHTS.CORRECTNESS,
    timeEfficiency: SCORING.TECHNICAL_WEIGHTS.TIME_EFFICIENCY,
    independence: SCORING.TECHNICAL_WEIGHTS.INDEPENDENCE,
  },
} as const
