/** Pure state checks shared by the durable feedback worker and its tests. */
function timestampMillis(value: unknown): number | null {
  if (value instanceof Date) return value.getTime()
  if (typeof value !== "object" || value === null) return null
  const timestamp = value as { toMillis?: () => number }
  if (typeof timestamp.toMillis !== "function") return null
  const millis = timestamp.toMillis()
  return Number.isFinite(millis) ? millis : null
}

export function isFeedbackJobDue(
  status: string,
  nextAttemptAt: unknown,
  leaseUntil: unknown,
  nowMs: number
): boolean {
  if (status === "queued") {
    const dueAt = timestampMillis(nextAttemptAt)
    return dueAt !== null && dueAt <= nowMs
  }
  if (status === "inline" || status === "processing") {
    const expiresAt = timestampMillis(leaseUntil)
    return expiresAt !== null && expiresAt <= nowMs
  }
  return false
}

export function feedbackJobDueTime(
  status: string,
  nextAttemptAt: unknown,
  leaseUntil: unknown
): number | null {
  return timestampMillis(status === "queued" ? nextAttemptAt : leaseUntil)
}
