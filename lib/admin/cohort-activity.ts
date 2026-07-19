/**
 * Pure helpers for retention-cohort activity bucketing (admin cohorts API).
 *
 * The retention heatmap counts a cohort user as active in a period when they
 * did interview activity; the "incl. Learn" split additionally counts users
 * who progressed or completed a Learn lesson (user_tutorial_progress) that
 * period. Both activity maps MUST bucket with the same period key or the OR
 * merge is meaningless, so the key derivation lives here.
 */

import { format, startOfMonth, startOfWeek } from "date-fns"

export type CohortPeriodType = "weekly" | "monthly"

/**
 * Timestamps a user_tutorial_progress doc carries. Each one marks a real
 * moment of Learn activity: began the lesson, last touched it, completed it.
 * (Intermediate touches between startedAt and updatedAt are not recoverable —
 * the doc is an upsert, not an event log.)
 */
export interface LearnProgressActivityInput {
  userId?: unknown
  startedAt?: unknown
  updatedAt?: unknown
  completedAt?: unknown
}

/**
 * Period bucket key shared by the session and Learn activity maps:
 * "yyyy-MM-dd" of the week start for weekly cohorts, "yyyy-MM" for monthly —
 * identical to the buckets the cohorts route has always used for sessions.
 */
export function cohortPeriodKey(date: Date, cohortType: CohortPeriodType): string {
  return cohortType === "weekly"
    ? format(startOfWeek(date), "yyyy-MM-dd")
    : format(startOfMonth(date), "yyyy-MM")
}

/** Parse the string | Firestore-Timestamp | Date shapes these docs mix; null when invalid. */
function toValidDate(value: unknown): Date | null {
  if (!value) return null
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  const maybeTimestamp = value as { toDate?: () => Date }
  if (typeof maybeTimestamp.toDate === "function") {
    const date = maybeTimestamp.toDate()
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

/**
 * userId -> set of period keys with Learn activity, from every timestamp the
 * progress docs carry. Docs without a string userId or with unparseable
 * timestamps are skipped rather than guessed at.
 */
export function collectLearnActivityPeriods(
  progressDocs: Iterable<LearnProgressActivityInput>,
  cohortType: CohortPeriodType
): Map<string, Set<string>> {
  const activity = new Map<string, Set<string>>()

  for (const doc of progressDocs) {
    if (typeof doc.userId !== "string" || !doc.userId) continue

    for (const raw of [doc.startedAt, doc.updatedAt, doc.completedAt]) {
      const date = toValidDate(raw)
      if (!date) continue

      let periods = activity.get(doc.userId)
      if (!periods) {
        periods = new Set<string>()
        activity.set(doc.userId, periods)
      }
      periods.add(cohortPeriodKey(date, cohortType))
    }
  }

  return activity
}
