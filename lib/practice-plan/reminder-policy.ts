import { canSendEmail } from "@/lib/email/notifications"
import { isReasonableHourForUser, isInQuietHours } from "@/lib/email/timezone"
import type { Profile } from "@/lib/types"
import type { EmailResult } from "@/lib/email/brevo"
import type { PracticePlan } from "./schema"

export const REMINDER_DEFER_MS = 3 * 60 * 60 * 1000
export function reminderEligibility(
  plan: PracticePlan,
  profile: Profile | undefined,
  now: Date
): "cancel" | "defer" | "send" {
  if (
    !profile?.email ||
    profile.notification_preferences?.email_notifications_enabled === false ||
    profile.notification_preferences?.inactivity_reminders === false ||
    now.getTime() - Date.parse(plan.savedAt) > 30 * 86_400_000
  )
    return "cancel"
  const timezone = profile.notification_preferences?.timezone || plan.timezone
  const quiet = profile.notification_preferences?.quietHours
  if (
    !isReasonableHourForUser(timezone).isReasonable ||
    (quiet?.enabled && isInQuietHours(timezone, quiet)) ||
    !canSendEmail(profile.last_email_sent_at, profile.emails_sent_today, timezone).allowed
  )
    return "defer"
  return "send"
}
export function reminderDeliveryState(
  plan: PracticePlan,
  result: EmailResult,
  now: Date
): Partial<PracticePlan> {
  if (result.success) return { reminderStatus: "sent", nextAttemptAt: null }
  if (result.deliveryUncertain) return { reminderStatus: "uncertain", nextAttemptAt: null }
  if (!result.retryable || plan.attempts >= 3)
    return { reminderStatus: "failed", nextAttemptAt: null }
  return {
    reminderStatus: "pending",
    nextAttemptAt: new Date(
      now.getTime() + REMINDER_DEFER_MS * Math.pow(2, plan.attempts - 1)
    ).toISOString(),
  }
}
