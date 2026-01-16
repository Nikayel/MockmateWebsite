/**
 * Re-export useInterview hook from provider
 *
 * This provides a cleaner import path:
 * import { useInterview } from "./_hooks/useInterview"
 *
 * Instead of:
 * import { useInterview } from "./_providers/InterviewProvider"
 */

export { useInterview } from "../_providers/InterviewProvider"
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
} from "../_providers/InterviewProvider"
