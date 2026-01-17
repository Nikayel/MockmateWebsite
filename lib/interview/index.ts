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
