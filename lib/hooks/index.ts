/**
 * Custom Hooks Index
 *
 * Re-exports all custom hooks for easy importing.
 */

export { useNotifications } from "./useNotifications"
export type { UseNotificationsOptions, UseNotificationsReturn } from "./useNotifications"

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

export { useDSARoadmap, inferPattern } from "./useDSARoadmap"
export type { NodeStats, UseDSARoadmapOptions, UseDSARoadmapReturn } from "./useDSARoadmap"

export { useSkillInsights, useEnhancedProfile, useCodeAnalysis } from "./useSkillInsights"
export type { SkillInsightsData } from "./useSkillInsights"

export { useAuthedFetch } from "./useAuthedFetch"
export { useNextPractice } from "./useNextPractice"
