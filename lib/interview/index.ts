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
