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
 * Breakdown of individual score components (0-100 each)
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

/**
 * Score weights for different calculation methods
 *
 * Philosophy:
 * - Performance Score = Full interview simulation (communication matters)
 * - Technical Score = Mastery Score = Objective code metrics (no communication)
 */
export const SCORE_WEIGHTS = {
  // Performance score (full interview simulation)
  // Communication bumped to 30% to reflect real interview importance
  // (At Google, poor communicators often get rejected even with correct solutions)
  performance: {
    understanding: 0.25,
    problemSolving: 0.25,
    codeQuality: 0.2,
    communication: 0.3,
  },
  // Technical score = Mastery score (objective metrics only)
  // Calculated in lib/spaced-repetition/mastery-score.ts
  technical: {
    correctness: 0.6, // 60% - Test pass rate
    timeEfficiency: 0.25, // 25% - Time relative to expected
    independence: 0.15, // 15% - Minimal hint usage
  },
} as const
