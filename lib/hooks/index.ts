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

export { useNotifications } from "./useNotifications"
export type { UseNotificationsOptions, UseNotificationsReturn } from "./useNotifications"

export { useSessionMetrics } from "./use-session-metrics"

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
export type { NodeStats, UseDSARoadmapOptions, UseDSARoadmapReturn } from "./useDSARoadmap"

export {
  useSkillInsights,
  useSmartRecommendations,
  useEnhancedProfile,
  useCodeAnalysis,
} from "./useSkillInsights"
export type {
  SkillInsightsData,
  SmartRecommendation,
  SessionInsight,
  UserSummary,
  SmartRecommendationsResponse,
} from "./useSkillInsights"

export { useInterviewPhase } from "./useInterviewPhase"
export type { UseInterviewPhaseReturn } from "./useInterviewPhase"
