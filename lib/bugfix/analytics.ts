export const BUGFIX_ANALYTICS_EVENTS = {
  STARTED: "bugfix_started",
  COMPLETED: "bugfix_completed",
  TIME_TO_FIRST_REPRODUCTION: "bugfix_time_to_first_reproduction",
  TIME_TO_FIRST_EDIT: "bugfix_time_to_first_edit",
  FIRST_INSPECTED_FILE_ROLE: "bugfix_first_inspected_file_role",
  VISIBLE_TO_HIDDEN_FAILURE: "bugfix_visible_to_hidden_failure",
  OVER_EDIT_DETECTED: "bugfix_over_edit_detected",
  AI_SHORTCUT_DETECTED: "bugfix_ai_shortcut_detected",
  REPEAT_PRACTICE_CONVERSION: "bugfix_repeat_practice_conversion",
} as const

export type BugfixAnalyticsEvent =
  (typeof BUGFIX_ANALYTICS_EVENTS)[keyof typeof BUGFIX_ANALYTICS_EVENTS]
