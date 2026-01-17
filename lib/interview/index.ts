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
export {
  checkClarifyingQuestions,
  generateClarifyingQuestionsFeedback,
} from "./clarifying-questions-checker"
export type {
  ClarifyingQuestionResult,
  ClarifyingQuestionsCheckResult,
} from "./clarifying-questions-checker"
