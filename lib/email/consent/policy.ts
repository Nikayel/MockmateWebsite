import type { NotificationPreferences } from "@/lib/types"

export const EMAIL_PREFERENCE_KEYS = [
  "email_notifications_enabled",
  "welcome_email",
  "inactivity_reminders",
  "spaced_repetition_reminders",
  "roadmap_reminders",
  "marketing_emails",
  "milestone_celebrations",
] as const
export type EmailPreferenceKey = (typeof EMAIL_PREFERENCE_KEYS)[number]
export const CATEGORY_PREFERENCE = {
  welcome: "welcome_email",
  inactivity: "inactivity_reminders",
  spaced_repetition: "spaced_repetition_reminders",
  roadmap: "roadmap_reminders",
  marketing: "marketing_emails",
} as const
export type OptionalEmailCategory = keyof typeof CATEGORY_PREFERENCE
export const DEFAULT_EMAIL_PREFERENCES: NotificationPreferences = {
  email_notifications_enabled: true,
  welcome_email: true,
  inactivity_reminders: true,
  spaced_repetition_reminders: true,
  roadmap_reminders: true,
  milestone_celebrations: true,
  marketing_emails: false,
  preferred_hours: [9, 10, 11, 14, 15, 19, 20],
}
export function emailPreferences(raw: unknown): NotificationPreferences {
  const result = { ...DEFAULT_EMAIL_PREFERENCES }
  if (!raw || typeof raw !== "object") return result
  for (const key of EMAIL_PREFERENCE_KEYS) {
    const value = (raw as Record<string, unknown>)[key]
    if (typeof value === "boolean") result[key] = value
  }
  const stored = raw as Record<string, unknown>
  if (typeof stored.timezone === "string") result.timezone = stored.timezone
  if (Array.isArray(stored.preferred_hours))
    result.preferred_hours = stored.preferred_hours.filter(
      (hour): hour is number =>
        typeof hour === "number" && Number.isInteger(hour) && hour >= 0 && hour <= 23
    )
  const quiet = stored.quietHours as Record<string, unknown> | undefined
  if (
    quiet &&
    typeof quiet.enabled === "boolean" &&
    typeof quiet.start === "number" &&
    typeof quiet.end === "number"
  )
    result.quietHours = { enabled: quiet.enabled, start: quiet.start, end: quiet.end }
  return result
}
export function optionalEmailAllowed(raw: unknown, category: OptionalEmailCategory): boolean {
  const preferences = emailPreferences(raw)
  return preferences.email_notifications_enabled && preferences[CATEGORY_PREFERENCE[category]]
}
