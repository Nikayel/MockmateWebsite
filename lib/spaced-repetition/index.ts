/**
 * Spaced Repetition System
 *
 * Production-ready spaced repetition with:
 * - FSRS algorithm (recommended - 20-30% more efficient than SM-2)
 * - Legacy SM-2 for backward compatibility
 * - Algorithm A/B testing infrastructure
 * - RAG integration for personalized recommendations
 */

// Algorithm Router (A/B Testing) - Use this for new implementations
export {
  getUserAlgorithm,
  setUserAlgorithm,
  calculateNextReview,
  createInitialState,
  reconstructState,
  prepareStateForStorage,
  estimateRetention as estimateRetentionForAlgorithm,
  getMemoryStrength,
  getAlgorithmDistribution,
  migrateExistingUsers,
  type AlgorithmState,
  type ReviewInput,
  type ReviewOutput,
} from './algorithm-router';

// FSRS Algorithm (Recommended - Modern, ML-optimized)
export {
  scheduleFSRS,
  createFSRSCard,
  calculateRetrievability,
  mapPerformanceToFSRSRating,
  getRatingDescription,
  getEstimatedRetention,
  isDue,
  getDaysUntilReview,
  getReviewPriority,
  getDueCards,
  getMasteryLevel as getFSRSMasteryLevel,
  getConfidence as getFSRSConfidence,
  DEFAULT_FSRS_CONFIG,
  DEFAULT_FSRS_WEIGHTS,
  type FSRSCard,
  type FSRSConfig,
  type FSRSRating,
  type FSRSState,
} from './fsrs-algorithm';

// Legacy SM-2 Algorithm (kept for backward compatibility)
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

// Research Tracker (A/B Testing Analytics)
export {
  recordReviewEvent,
  recordSkippedReview,
  generateAggregateComparison,
  getAggregateComparison,
  getUserResearchSummary,
  getUserDailyMetrics,
  getRecentEvents,
} from './research-tracker';

// Mastery Score (Code-focused scoring for SR algorithm)
// Separate from interview score - focuses on correctness, not communication
export {
  calculateMasteryScore,
  fromInteractionMetrics,
  quickMasteryScore,
  type MasteryScoreInput,
  type MasteryScoreResult,
} from './mastery-score';
