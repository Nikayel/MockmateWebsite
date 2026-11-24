/**
 * Exponential backoff & dormancy sunset for spaced-repetition reminder emails.
 *
 * Without backoff, any overdue problem triggered a daily email forever: users
 * who ignored reminders received 250+ consecutive daily emails, harming Brevo
 * sender reputation.
 *
 * Schedule after a user's last recorded practice activity:
 *  - Reminder #1: when due (respecting 24h min gap from any prior SR email)
 *  - Reminder #2: 3 days after #1
 *  - Reminder #3: 7 days after #2
 *  - Reminder #4: 14 days after #3
 *  - Reminder #5+: paused until the user practices again
 *
 * Users inactive for > 30 days are also paused (`dormant_account`) so rolling
 * off the 45-day history lookback window never wakes up an abandoned account.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** Minimum wait (in days) after each unanswered reminder: #1->#2, #2->#3, #3->#4. */
export const SPACED_REPETITION_BACKOFF_WAIT_DAYS = [3, 7, 14] as const

/** Total unanswered reminders before pausing until the user returns to practice. */
export const MAX_UNANSWERED_SPACED_REPETITION_REMINDERS =
  SPACED_REPETITION_BACKOFF_WAIT_DAYS.length + 1

/** Stop sending spaced-repetition reminders once a user has been inactive this long. */
export const SPACED_REPETITION_MAX_INACTIVE_DAYS = 30

/**
 * Lookback window for pre-fetching spaced-repetition send history in one query.
 * Must exceed both MAX_INACTIVE_DAYS (30) and the total backoff arc (3 + 7 + 14 = 24).
 */
export const SPACED_REPETITION_LOOKBACK_DAYS = 45

export type SpacedRepetitionBackoffReason =
  | "dormant_account"
  | "max_unanswered_reminders"
  | "backoff_active"
  | "recent_send"

export type SpacedRepetitionBackoffDecision =
  | {
      allowed: true
      attemptNumber: number
      unansweredSends: number
    }
  | {
      allowed: false
      reason: SpacedRepetitionBackoffReason
      unansweredSends: number
      nextAllowedAt?: string
    }

function parseTimestampMs(value: string | Date | null | undefined): number | null {
  if (!value) return null
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(ms) ? ms : null
}

/**
 * Pick the most recent known practice activity timestamp from a user's learning state.
 * Falls back from `last_session_at` to topic `last_practiced_at` and `updated_at` so
 * legacy docs without `last_session_at` still honor the dormancy cutoff.
 */
export function resolveLastPracticeActivityAt(learningState: {
  last_session_at?: string
  updated_at?: string
  topics?: Record<string, { last_practiced_at?: string }>
}): string | null {
  const candidates: number[] = []

  const lastSession = parseTimestampMs(learningState.last_session_at)
  if (lastSession !== null) candidates.push(lastSession)

  if (learningState.topics) {
    for (const topic of Object.values(learningState.topics)) {
      const practiced = parseTimestampMs(topic?.last_practiced_at)
      if (practiced !== null) candidates.push(practiced)
    }
  }

  if (candidates.length === 0) {
    const updated = parseTimestampMs(learningState.updated_at)
    if (updated !== null) candidates.push(updated)
  }

  if (candidates.length === 0) return null
  return new Date(Math.max(...candidates)).toISOString()
}

export function evaluateSpacedRepetitionBackoff(input: {
  now: Date
  lastActivityAt: string | Date | null | undefined
  recentSendTimestamps: ReadonlyArray<string | Date | null | undefined>
}): SpacedRepetitionBackoffDecision {
  const nowMs = input.now.getTime()
  const lastActivityMs = parseTimestampMs(input.lastActivityAt)

  const validSendTimes = input.recentSendTimestamps
    .map(parseTimestampMs)
    .filter((ms): ms is number => ms !== null && ms <= nowMs)
    .sort((a, b) => a - b)

  const unansweredSendTimes =
    lastActivityMs === null
      ? validSendTimes
      : validSendTimes.filter((sentMs) => sentMs > lastActivityMs)
  const unansweredSends = unansweredSendTimes.length

  if (
    lastActivityMs !== null &&
    nowMs - lastActivityMs > SPACED_REPETITION_MAX_INACTIVE_DAYS * DAY_MS
  ) {
    return {
      allowed: false,
      reason: "dormant_account",
      unansweredSends,
    }
  }

  // Never send two spaced-repetition reminders within 24 hours, even if the user
  // completed a new session shortly after receiving an earlier reminder.
  const latestSendMs = validSendTimes.at(-1)
  if (latestSendMs !== undefined && nowMs - latestSendMs < DAY_MS) {
    return {
      allowed: false,
      reason: "recent_send",
      unansweredSends,
      nextAllowedAt: new Date(latestSendMs + DAY_MS).toISOString(),
    }
  }

  if (unansweredSends >= MAX_UNANSWERED_SPACED_REPETITION_REMINDERS) {
    return {
      allowed: false,
      reason: "max_unanswered_reminders",
      unansweredSends,
    }
  }

  if (unansweredSends > 0) {
    const waitDays = SPACED_REPETITION_BACKOFF_WAIT_DAYS[unansweredSends - 1]
    const lastUnansweredSendMs = unansweredSendTimes[unansweredSendTimes.length - 1]
    const nextAllowedMs = lastUnansweredSendMs + waitDays * DAY_MS
    if (nowMs < nextAllowedMs) {
      return {
        allowed: false,
        reason: "backoff_active",
        unansweredSends,
        nextAllowedAt: new Date(nextAllowedMs).toISOString(),
      }
    }
  }

  return {
    allowed: true,
    attemptNumber: unansweredSends + 1,
    unansweredSends,
  }
}
