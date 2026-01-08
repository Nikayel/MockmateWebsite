/**
 * Scoring Module
 *
 * Centralized exports for the scoring system.
 * Three distinct scores serve different purposes:
 *
 * - performanceScore: Full interview evaluation (includes communication)
 *   Used for: Overall feedback, interview assessment
 *
 * - technicalScore: Code-focused evaluation (excludes communication)
 *   Used for: Dashboard "Technical Avg", skill assessment
 *
 * - masteryScore: Test pass rate only
 *   Used for: Spaced repetition scheduling, determining review intervals
 */

// Types
export type {
  ScoreBreakdown,
  SessionScores,
  UserScoreStats,
  UserAverages,
  MasteryLevel,
  MasteryStatistics,
  ScorePersistenceInput,
} from "./types"

export { SCORE_WEIGHTS } from "./types"

// Mastery Score (for spaced repetition)
export {
  calculateMasteryScore,
  calculateMasteryScoreFromTests,
  hasPassed,
  getMasteryQuality,
} from "./mastery-score"

// Technical Score (code-only, excludes communication)
export {
  calculateTechnicalScore,
  calculateTechnicalScoreFromComponents,
  getTechnicalScoreContribution,
} from "./technical-score"

// Score Persistence (atomic Firestore operations)
export {
  persistSessionScores,
  isSessionAlreadyCompleted,
  getExistingSessionScores,
  getUserScoreStats,
  getMasteryStatistics,
  updateProblemMasteryLevel,
} from "./score-persistence"
