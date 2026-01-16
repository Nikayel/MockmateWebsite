/**
 * Feedback system public API
 *
 * This module exports all public functions and types from the feedback system.
 * Import from this file to access feedback functionality.
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  FeedbackScores,
  StructuredFeedback,
  ConversationValidation,
  CritiqueResult,
  ScoreCritiqueAdjustment,
  FeedbackCritiqueAdjustment,
  AICodeOverlapResult,
  IncompleteSolutionAnalysis,
  PreScreenResult,
  ScoreResult,
  ExtendedScoreResult,
} from "./types"

// ============================================================================
// VALIDATION EXPORTS
// ============================================================================

export {
  extractCodeFromPartnerMessages,
  normalizeCode,
  calculateCodeSimilarity,
  analyzeAICodeOverlap,
  validateConversationWithAI,
  getDefaultValidation,
} from "./validation"

// ============================================================================
// COMPLETENESS ANALYSIS EXPORTS
// ============================================================================

export { analyzeCodeCompleteness, isBlankDesignTemplate } from "./completeness-analysis"

// ============================================================================
// PRE-SCREENING EXPORTS
// ============================================================================

export { preScreenConversation } from "./pre-screening"

// ============================================================================
// SCORING EXPORTS
// ============================================================================

export {
  calculateSystemDesignScores,
  calculateBugFixScores,
  calculateValidatedScores,
  applyScoreFloors,
} from "./scoring-algorithms"

// ============================================================================
// CONSTITUTIONAL AI EXPORTS
// ============================================================================

export { critiqueScores, critiqueFeedbackText } from "./constitutional-ai"

// ============================================================================
// CONTEXT BUILDER EXPORTS
// ============================================================================

export { buildRAGFeedbackContext } from "./context-builder"

// ============================================================================
// PARSER EXPORTS
// ============================================================================

export {
  parseFeedbackSections,
  injectScoresIntoFeedback,
  sanitizeFeedbackForScoreConsistency,
} from "./parsers"
