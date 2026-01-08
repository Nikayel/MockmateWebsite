/**
 * Scoring Module
 *
 * Centralized exports for the scoring system.
 * Two score types are handled here:
 *
 * - performanceScore: Full interview evaluation (includes communication)
 *   Used for: Overall feedback, interview assessment
 *   Calculated in: lib/scoring.ts
 *
 * - technicalScore: Code-focused evaluation (excludes communication)
 *   Used for: Dashboard "Technical Avg", skill assessment
 *   Calculated in: lib/scoring/technical-score.ts
 *
 * Note: masteryScore for spaced repetition is calculated in
 * lib/spaced-repetition/mastery-score.ts (uses test pass rate + time + hints)
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
