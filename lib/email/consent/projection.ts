import { DEFAULT_NOTIFICATION_PREFERENCES as SMART_DEFAULTS } from "@/lib/types/notifications"
import type { NotificationPreferences } from "@/lib/types"
import type { EmailPreferenceKey } from "./policy"

const TYPE_FIELDS: Partial<Record<EmailPreferenceKey, string[]>> = {
  welcome_email: ["welcome"],
  spaced_repetition_reminders: ["spaced_repetition_review"],
  roadmap_reminders: ["interview_countdown", "daily_practice_reminder", "roadmap_behind"],
  milestone_celebrations: ["milestone_celebration"],
}
/** Compatibility projection; transport decisions remain owned by email consent. */
export function smartEmailProjection(input: {
  userId: string
  preferences: NotificationPreferences
  changes: Partial<Record<EmailPreferenceKey, boolean>>
  isNew: boolean
  now: string
  timezone?: string
}): Record<string, unknown> {
  const { userId, preferences, changes, isNew, now, timezone } = input
  const smart: Record<string, unknown> = {
    ...(isNew
      ? { ...SMART_DEFAULTS, createdAt: now, timezone: timezone || SMART_DEFAULTS.timezone }
      : {}),
    userId,
    updatedAt: now,
    channels: {
      ...(isNew ? SMART_DEFAULTS.channels : {}),
      email: preferences.email_notifications_enabled,
    },
  }
  const types: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(isNew ? preferences : changes)) {
    for (const type of TYPE_FIELDS[key as EmailPreferenceKey] ?? [])
      types[type] = {
        ...(isNew
          ? SMART_DEFAULTS.typePreferences[type as keyof typeof SMART_DEFAULTS.typePreferences]
          : {}),
        enabled: value,
      }
  }
  if (Object.keys(types).length)
    smart.typePreferences = { ...(isNew ? SMART_DEFAULTS.typePreferences : {}), ...types }
  return smart
}
