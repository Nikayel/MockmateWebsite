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

export { useSessionMetrics } from "./use-session-metrics"

// New interview hooks
export { useInterviewState } from "./useInterviewState"
export type {
  UseInterviewStateOptions,
  UseInterviewStateReturn,
} from "./useInterviewState"

export { useInterviewUI } from "./useInterviewUI"
export type {
  UseInterviewUIOptions,
  UseInterviewUIReturn,
} from "./useInterviewUI"

export { useTestExecution } from "./useTestExecution"
export type {
  UseTestExecutionOptions,
  UseTestExecutionReturn,
} from "./useTestExecution"

export { useFocusTrap } from "./useFocusTrap"

export { useSpacedRepetition } from "./useSpacedRepetition"
export type {
  DueItem,
  Priority,
  MasteryLevel,
  Algorithm,
  UseSpacedRepetitionOptions,
  UseSpacedRepetitionReturn,
} from "./useSpacedRepetition"

export { useScenarioFilters } from "./useScenarioFilters"

export { useDSARoadmap, inferPattern } from "./useDSARoadmap"
export type {
  NodeStats,
  UseDSARoadmapOptions,
  UseDSARoadmapReturn,
} from "./useDSARoadmap"

export { useSkillInsights, useSmartRecommendations, useEnhancedProfile, useCodeAnalysis } from "./useSkillInsights"
export type {
  SkillInsightsData,
  SmartRecommendation,
  SessionInsight,
  UserSummary,
  SmartRecommendationsResponse,
} from "./useSkillInsights"
