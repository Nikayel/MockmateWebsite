/**
 * Spaced Repetition System
 *
 * Production-ready spaced repetition using enhanced SM-2 algorithm
 * with RAG integration for personalized recommendations.
 */

// Core SM-2 Algorithm
export {
  calculateNextInterval,
  mapScoreToQuality,
  calculateConfidence,
  determineMasteryLevel,
  estimateRetention,
  calculateReviewPriority,
  getInitialSM2State,
  type SM2Input,
  type SM2Output,
  type Difficulty,
  type MasteryLevel,
} from './sm2-algorithm';

// Scheduler
export {
  getDueProblems,
  getOrCreateProblemMastery,
  updateProblemMastery,
  skipProblem,
  getAllUserProblems,
  getProblemsByPattern,
  initializeProblemMasteryFromSession,
  type ProblemMastery,
  type DueItem,
  type DueQueueResult,
  type SchedulerOptions,
} from './scheduler';

// Mastery Calculator
export {
  calculatePatternStats,
  calculateDifficultyStats,
  calculateTrendStats,
  calculateOverallStats,
  getUserMasteryStats,
  getWeakPatterns,
  getPatternsReadyForAdvancement,
  updateUserLearningStateSummary,
  getDailyGoalProgress,
  setDailyGoal,
  type PatternMasteryStats,
  type DifficultyStats,
  type TrendStats,
  type OverallStats,
  type UserMasteryStats,
} from './mastery-calculator';

// RAG Integration
export {
  getSmartRecommendations,
  getPatternRecommendations,
  getNextPracticeRecommendation,
  type SmartRecommendation,
  type RecommendationType,
} from './rag-integration';
