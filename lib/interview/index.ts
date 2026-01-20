/**
 * Interview Services Module
 *
 * Re-exports all interview-related services for easy importing.
 */

// Session management
export {
  startInterviewSession,
  autoSaveSession,
  restoreSession,
  clearAutoSave,
} from "./session-manager"
export type {
  SessionState,
  StartSessionOptions,
  StartSessionResult,
  AutoSaveOptions,
  RestoreSessionOptions,
} from "./session-manager"

// Feedback generation
export {
  generateFeedback,
  generateSystemDesignFeedback,
  triggerPostInterviewDiscussion,
  trackSessionCompletion,
  calculateInteractionMetrics,
  prepareConversationTranscript,
} from "./feedback-generator"
export type {
  ChatMessage,
  TestResult,
  EfficiencyMetrics,
  GenerateFeedbackOptions,
  FeedbackResult,
} from "./feedback-generator"

// Topic extraction utilities
export { extractTopicsFromMessage, extractUserAnsweredTopics } from "./topic-extraction"

// Code analysis utilities
export { analyzeCodeEfficiency } from "./code-analysis"
export type { CodeEfficiencyMetrics, OptimalComplexity } from "./code-analysis"

// Clarifying questions checker (Real Interview Mode)
// NOTE: Server-only module - import directly from "./clarifying-questions-checker"
// to avoid bundling firebase-admin into client code.
// export { checkClarifyingQuestions, generateClarifyingQuestionsFeedback } from "./clarifying-questions-checker"
export type {
  ClarifyingQuestionResult,
  ClarifyingQuestionsCheckResult,
} from "./clarifying-questions-checker"

// Context-aware proactive triggers (replaces fixed timer)
export {
  checkProactiveTrigger,
  getWhatIfQuestion,
  getMidCodingProbe,
  detectWrongApproach,
} from "./proactive-triggers"
export type { ProactiveContext, ProactiveTriggerResult } from "./proactive-triggers"

// Company-specific time limits (DRY: single source of truth)
export {
  STRICT_TIME_COMPANIES,
  getStrictTimeConfig,
  hasStrictTimeLimit,
  getStrictTimeLimitMinutes,
} from "./company-time-limits"
export type { StrictTimeConfig } from "./company-time-limits"

// Shared patterns (DRY: single source of truth for all detection patterns)
export {
  // Complexity utilities
  COMPLEXITY_PATTERNS,
  COMPLEXITY_RANKS,
  getComplexityRank,
  findDominantComplexity,
  normalizeComplexity,
  // Vague answer detection
  VAGUE_ANSWER_PATTERNS,
  isVagueAnswer,
  // Edge case detection
  EDGE_CASE_KEYWORDS,
  extractEdgeCases,
  // Coding transition detection
  CODING_TRANSITION_PATTERNS,
  containsCodingTransition,
  // Answer giveaway detection
  GIVEAWAY_PATTERNS,
  // Leading question detection
  LEADING_QUESTION_PATTERNS,
  // Acceptance/probing patterns
  ACCEPTANCE_PATTERNS,
  PROBING_PATTERNS,
  acceptsWithoutProbing,
} from "./shared-patterns"

// Interview phases and tracking
export {
  detectInterviewPhase,
  detectInterviewPhaseLegacy,
  createEmptyTracker,
  updateTrackerFromMessage,
  buildTrackingContext,
  getHintGuidance,
  HINT_PROGRESSION,
  addSilentNote,
  getSilentNoteDescription,
} from "./interview-phases"
export type {
  InterviewPhase,
  PhaseContext,
  PhaseDetectionContext,
  ConversationTracker,
  HintLevel,
  SilentNote,
  SilentNoteType,
} from "./interview-phases"

// Interviewer prompts (few-shot examples - preferred over verbose rules)
export {
  FEW_SHOT_EXAMPLES,
  PHASE_PROMPTS,
  QUICK_INJECTIONS,
  buildInterviewerPrompt,
} from "./interviewer-prompts"
export type { PromptContext } from "./interviewer-prompts"

// Interviewer tools (function calling for state queries)
export { INTERVIEWER_TOOLS, executeTool, formatToolResultsForPrompt } from "./interviewer-tools"
export type { ToolDefinition, ToolContext, ToolResult } from "./interviewer-tools"

// Response validation (hard gates + semantic LLM validation)
export {
  validateInterviewerResponse,
  validateWithRetry,
  validateSemanticRules,
  validateInterviewerResponseAsync,
  SEMANTIC_RULES,
  buildSemanticValidationPrompt,
} from "./response-validation"
export type {
  ValidationResult,
  ResponseViolation,
  ValidationContext,
  SemanticValidationResult,
} from "./response-validation"

// Conversation extraction (LLM-based state detection)
// NOTE: Server-only module - import directly from "./conversation-extraction"
// to avoid bundling firebase-admin into client code.
// export {
//   extractConversationState,
//   shouldRunExtraction,
// } from "./conversation-extraction"
export type { ExtendedConversationTracker } from "./conversation-extraction"
