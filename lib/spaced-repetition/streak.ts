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

/**
 * The **write-side** counterpart to {@link reconcileStreak}: given the STORED
 * `streak_days` and the previous session, return the streak to persist after a
 * session that just completed at `now`.
 *
 * This is the single source of truth for how a streak advances, so every writer
 * (the topic-level writer in `lib/learning-state.ts` and the session-metrics
 * writer) agrees on the semantics instead of hand-rolling divergent rules:
 *
 * - No previous session -> `1` (first session ever starts the streak).
 * - Gap of exactly one calendar day -> increment (consecutive day).
 * - Gap of more than one day -> `1` (missed a day; a fresh streak starts today).
 * - Same calendar day (gap `0`) -> unchanged. This is what makes the helper
 *   **idempotent**: multiple writers can fire for one session, and a second call
 *   (which reads the `last_session_at` the first call just wrote) must not
 *   double-increment.
 * - Out-of-order / negative gap (clock skew, backfilled session) -> unchanged,
 *   so a stale timestamp never silently resets a valid streak.
 *
 * Calendar-day gaps are computed in the user's timezone via `getDaysDifference`
 * so an 11pm-then-1am pair counts as consecutive days regardless of server time.
 */
export function advanceStreak(
  streakDays: number | undefined | null,
  lastSessionAt: string | undefined | null,
  timezone: string | undefined | null,
  now: Date = new Date()
): number {
  const stored = streakDays || 0

  // First session ever: the streak begins at 1.
  if (!lastSessionAt) return 1

  const daysDiff = getDaysDifference(lastSessionAt, now, timezone)

  if (daysDiff === 1) return stored + 1 // Consecutive calendar day.
  if (daysDiff > 1) return 1 // Missed a day; restart at today's session.

  // Same day (0) or an out-of-order/negative gap: leave the streak untouched.
  return stored
}
