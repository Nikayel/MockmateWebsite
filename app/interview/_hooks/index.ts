/**
 * Interview Hooks Index
 *
 * Re-exports all interview-specific hooks for easy importing.
 */

// Main context hook
export { useInterview } from "./useInterview"

// Focused domain hooks
export { useInterviewSession, type UseInterviewSessionReturn } from "./useInterviewSession"
export { useInterviewChat, type UseInterviewChatReturn } from "./useInterviewChat"
export { useInterviewCode, type UseInterviewCodeReturn } from "./useInterviewCode"
export { useInterviewHints, type UseInterviewHintsReturn } from "./useInterviewHints"
export { useInterviewTimers, type UseInterviewTimersReturn } from "./useInterviewTimers"
export { useInterviewPhase, type UseInterviewPhaseReturn } from "./useInterviewPhase"

// Types from provider
export type {
  InterviewContextValue,
  InterviewContextState,
  InterviewContextActions,
  ChatMessage,
  TestResult,
  TestSummary,
  EfficiencyMetrics,
  ScoreBreakdown,
  SupportedLanguage,
  PanelType,
} from "./useInterview"
