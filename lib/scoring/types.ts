/**
 * Scoring Types
 *
 * Centralized type definitions for the scoring system.
 * Three distinct scores serve different purposes:
 * - performanceScore: Full interview evaluation (includes communication)
 * - technicalScore: Code-focused evaluation (excludes communication)
 * - masteryScore: Test pass rate for spaced repetition scheduling
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
  technicalScore: number // Code-only: U + PS + CQ (0-100)
  masteryScore: number // Test pass rate for SR (0-100)
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
 * - Technical Score = Code-focused (tests, efficiency, hints used)
 * - Mastery Score = Spaced repetition (correctness, time, independence)
 *
 * For Technical Score, we weight heavily on what we can OBJECTIVELY measure:
 * - Code Quality (60%): test pass rate, efficiency, readability
 * - Problem Solving (25%): debugging, optimization attempts, structured approach
 * - Understanding (15%): explained approach, complexity analysis (bonus, not penalty)
 */
export const SCORE_WEIGHTS = {
  // Performance score (full interview simulation)
  performance: {
    understanding: 0.25,
    problemSolving: 0.25,
    codeQuality: 0.3,
    communication: 0.2,
  },
  // Technical score (code-focused, heavily weighted on objective metrics)
  technical: {
    codeQuality: 0.6, // 60% - Tests passed, efficiency, readability
    problemSolving: 0.25, // 25% - Debugging, optimization, structured approach
    understanding: 0.15, // 15% - Explained approach, complexity (bonus)
  },
} as const
