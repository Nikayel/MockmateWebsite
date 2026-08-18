/**
 * When is a session's feedback generation considered stalled?
 *
 * "pending" and "processing" are transit states that normally resolve within
 * a minute of completion. They only persist when the pipeline was orphaned
 * (historically: the browser tab owned persistence and was closed mid-stream).
 * A completed session still in a transit state past this threshold will never
 * finish on its own, so the UI should offer retry instead of a spinner, and
 * the reaper cron flips it to "failed".
 */

export const FEEDBACK_STALL_THRESHOLD_MS = 5 * 60_000

const TRANSIT_STATUSES = new Set(["pending", "processing"])

function toMillis(value: string | Date | null | undefined): number | null {
  if (!value) return null
  const ms = value instanceof Date ? value.getTime() : Date.parse(value)
  return Number.isFinite(ms) ? ms : null
}

export function isFeedbackGenerationStalled(
  feedbackStatus: string | null | undefined,
  completedAt: string | Date | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!feedbackStatus || !TRANSIT_STATUSES.has(feedbackStatus)) return false
  const completedMs = toMillis(completedAt)
  if (completedMs === null) return false
  return nowMs - completedMs > FEEDBACK_STALL_THRESHOLD_MS
}
