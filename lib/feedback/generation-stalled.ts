/**
 * When is a session's feedback generation considered stalled?
 *
 * "pending" and "processing" are transit states that normally resolve within
 * a minute of completion. They only persist when evaluation was orphaned.
 * "queued" is deliberately excluded: its frozen score is already visible and
 * the feedback worker owns the retry schedule. A completed session still in a
 * scoring transit state past this threshold is shown as failed and reaped.
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

/**
 * Present an orphaned transit state as the terminal state it effectively is.
 * Writers keep the raw value for incident diagnosis; readers share this view
 * so dashboards, history, detail pages, and admin do not disagree.
 */
export function resolveFeedbackGenerationStatus(
  feedbackStatus: string | null | undefined,
  completedAt: string | Date | null | undefined,
  nowMs: number = Date.now()
): string | null | undefined {
  return isFeedbackGenerationStalled(feedbackStatus, completedAt, nowMs) ? "failed" : feedbackStatus
}
