import { getDaysDifference } from "@/lib/email/timezone"

/**
 * The **effective** current streak for a user, given the STORED `streak_days` and their last session.
 *
 * `streak_days` is only advanced when a session completes, so between a missed day and the next
 * session the stored value is stale (still shows the pre-break count). This reconciles it the same way
 * the dashboard does: a gap of MORE than one calendar day (in the user's timezone) means the streak is
 * broken → `0`; a same-day (0) or still-alive next-day (1) gap keeps the stored value.
 *
 * Pure and dependency-light so every read path — dashboard, reminder/at-risk emails, scheduler —
 * agrees on one number, instead of some surfaces showing a streak the user has actually lost.
 */
export function reconcileStreak(
  streakDays: number | undefined | null,
  lastSessionAt: string | undefined | null,
  timezone: string | undefined | null,
  now: Date = new Date()
): number {
  const stored = streakDays || 0
  if (stored <= 0 || !lastSessionAt) return stored > 0 ? stored : 0
  return getDaysDifference(lastSessionAt, now, timezone) > 1 ? 0 : stored
}
