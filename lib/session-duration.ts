/**
 * The single place that decides how much of a session's wall clock counts as practice.
 *
 * `interview_sessions.started_at` is stamped when the session document is created (the
 * moment the workspace loads), and `completed_at` when the candidate submits. The gap
 * between them is wall clock, not attention: a tab left open overnight, a session
 * resumed from autosave three days later, or a round abandoned and finished the
 * following week all produce the same shape of number. Summed over a practice history
 * that arithmetic reports hundreds of hours for a few dozen real sessions.
 *
 * Every duration derived from that pair therefore goes through `clampPracticeMinutes`,
 * which treats anything past `MAX_SESSION_PRACTICE_MINUTES` as an artifact of an idle
 * tab rather than time at the keyboard.
 *
 * Pure and dependency-free on purpose: the same helper runs in server aggregation
 * (`lib/session-metrics.ts`, `app/api/user/metrics`) and in client session lists, so a
 * session card and the dashboard total can never disagree about how long a round took.
 */

/**
 * Longest single round that counts toward practice time.
 *
 * Interview rounds on this platform are scoped to roughly 45 minutes; 90 leaves room
 * for a long system-design or bugfix session while still discarding the idle-tab tail.
 * A session that genuinely ran longer is truncated, which understates by minutes —
 * the unclamped alternative overstates by days.
 */
export const MAX_SESSION_PRACTICE_MINUTES = 90

/** Anything a Firestore timestamp field might plausibly hold. */
export type TimestampInput = string | number | Date | null | undefined

/** Epoch ms for a timestamp field, or null when it is missing or unparseable. */
function toEpochMs(value: TimestampInput): number | null {
  if (value === null || value === undefined) return null
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(ms) ? ms : null
}

/**
 * Practice minutes between two timestamps, clamped to a plausible session.
 *
 * Returns 0 rather than throwing for every degenerate input, because these values come
 * from documents written by many code paths over the product's life:
 * - either timestamp missing or unparseable (older docs, interrupted writes)
 * - `completedAt` before `startedAt` (client clock skew) — a negative would otherwise
 *   silently subtract from a user's lifetime total
 *
 * Values above the ceiling are truncated to `MAX_SESSION_PRACTICE_MINUTES`.
 */
export function clampPracticeMinutes(
  startedAt: TimestampInput,
  completedAt: TimestampInput
): number {
  const start = toEpochMs(startedAt)
  const end = toEpochMs(completedAt)
  if (start === null || end === null) return 0

  const minutes = Math.round((end - start) / 60_000)
  if (!Number.isFinite(minutes) || minutes <= 0) return 0
  return Math.min(minutes, MAX_SESSION_PRACTICE_MINUTES)
}

/**
 * Apply the same ceiling to a duration that was already measured in minutes.
 *
 * The timestamp pair above is not the only source of practice time: the interview
 * workspace also reports a client-side elapsed timer (`timeSpentMinutes`), which
 * reaches the server as request input and is accumulated with `FieldValue.increment`
 * into running totals. That path never touches `started_at`/`completed_at`, so
 * without this it bypassed the ceiling entirely and could inflate a lifetime total
 * from a single left-open tab, exactly the way the timestamp path once did.
 *
 * Untrusted input, so every degenerate value collapses to 0: negatives, NaN,
 * Infinity, and non-numbers a client could put in a JSON body.
 */
export function clampPracticeMinutesValue(minutes: unknown): number {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) return 0
  return Math.min(Math.round(minutes), MAX_SESSION_PRACTICE_MINUTES)
}

/** Clamped practice minutes for an elapsed timer measured in seconds. */
export function clampPracticeMinutesFromSeconds(seconds: unknown): number {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return 0
  return clampPracticeMinutesValue(seconds / 60)
}

/**
 * Whether a stored duration was inflated past what one sitting can plausibly hold.
 *
 * Lets a surface label a truncated number ("90+ min") instead of quietly reporting a
 * ceiling as if it were measured.
 */
export function isTruncatedDuration(
  startedAt: TimestampInput,
  completedAt: TimestampInput
): boolean {
  const start = toEpochMs(startedAt)
  const end = toEpochMs(completedAt)
  if (start === null || end === null) return false
  return Math.round((end - start) / 60_000) > MAX_SESSION_PRACTICE_MINUTES
}
