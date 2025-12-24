/**
 * Custom Hooks Index
 *
 * Re-exports all custom hooks for easy importing.
 */

export { useInterviewSession } from "./useInterviewSession"
export type {
  SessionState,
  UseInterviewSessionOptions,
  UseInterviewSessionReturn,
} from "./useInterviewSession"

export { useInterviewChat } from "./useInterviewChat"
export type {
  ChatMessage,
  UseInterviewChatOptions,
  UseInterviewChatReturn,
} from "./useInterviewChat"

export { useCodeExecution } from "./useCodeExecution"
export type {
  TestResult,
  EfficiencyMetrics,
  TestSummary,
  UseCodeExecutionOptions,
  UseCodeExecutionReturn,
} from "./useCodeExecution"

export { useNotifications } from "./useNotifications"
export type {
  UseNotificationsOptions,
  UseNotificationsReturn,
} from "./useNotifications"
