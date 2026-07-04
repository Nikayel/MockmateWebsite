/**
 * Roadmap "do later" (defer / reschedule) rules.
 *
 * Deferring a roadmap question MOVES the question object to a later day and
 * resets it to "pending", rather than the lossy Skip which flags it in place
 * and counts it toward finishing the day. This is a relocation, not a status:
 * we deliberately do NOT introduce a "deferred" status enum value, so the
 * persisted Firestore node shape (a contract with already-saved roadmaps) is
 * unchanged and no data migration is required.
 *
 * The target day is always strictly after both the source day and today, which
 * structurally avoids stranding a question on an already-acknowledged/unlocked
 * day. These functions are pure and side-effect free so the Zustand store
 * (optimistic update) and the API route (authoritative transaction) share one
 * source of truth and can never diverge on where a question lands.
 */

import { compareStoredDateWithLocal } from "@/lib/utils"

/** Soft cap: prefer not to pile a moved question onto an already-full day. */
export const MAX_QUESTIONS_PER_DAY = 6

export type DeferBlockReason = "not_found" | "no_later_day"

export type DeferResult<P> =
  | {
      ok: true
      updatedPlans: P[]
      sourceDayIndex: number
      targetDayIndex: number
      movedTitle: string
    }
  | { ok: false; reason: DeferBlockReason }

/**
 * Minimal structural shape satisfied by both the hydrated in-memory DailyPlan
 * (date: Date) and the Firestore-persisted plan (date: Timestamp | string).
 */
interface DeferrablePlan {
  date?: unknown
  questions?: Array<{
    scenarioId: string
    status: string
    title: string
    completedAt?: unknown
    score?: unknown
  }>
}

/** Resolve a stored plan date (Date | ISO string | Firestore Timestamp) to a Date. */
function resolvePlanDate(value: unknown): Date {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate()
  }
  if (value instanceof Date) return value
  if (typeof value === "string" || typeof value === "number") return new Date(value)
  return new Date()
}

/** Index of the last plan whose date is on or before today (UTC-safe). */
function resolveTodayIndex<P extends DeferrablePlan>(plans: P[], now: Date): number {
  let todayIndex = 0
  for (let i = 0; i < plans.length; i++) {
    if (compareStoredDateWithLocal(resolvePlanDate(plans[i].date), now) <= 0) {
      todayIndex = i
    }
  }
  return todayIndex
}

/**
 * Pick the day to move a question to: the nearest day strictly after both the
 * source day and today that still has capacity, or, if every later day is full,
 * the least-loaded later day (we never drop the question). Returns null when no
 * later day exists (source is the last day) so the caller can block the action.
 */
export function selectDeferTargetIndex<P extends DeferrablePlan>(
  plans: P[],
  sourceIndex: number,
  now: Date = new Date()
): number | null {
  const startAfter = Math.max(sourceIndex, resolveTodayIndex(plans, now))
  const laterIndices: number[] = []
  for (let i = startAfter + 1; i < plans.length; i++) laterIndices.push(i)
  if (laterIndices.length === 0) return null

  const underCap = laterIndices.find(
    (i) => (plans[i].questions?.length ?? 0) < MAX_QUESTIONS_PER_DAY
  )
  if (underCap !== undefined) return underCap

  // All later days are at/over the cap: fall back to the least-loaded one.
  return laterIndices.reduce((best, i) =>
    (plans[i].questions?.length ?? 0) < (plans[best].questions?.length ?? 0) ? i : best
  )
}

/**
 * Move a question to a later day and reset it to "pending". Drops completedAt
 * and score (a moved question is not completed) by omission rather than writing
 * `undefined`, which Firestore rejects. Returns a discriminated result; callers
 * recompute completion counts from updatedPlans.
 */
export function deferQuestionInPlans<P extends DeferrablePlan>(
  plans: P[],
  scenarioId: string,
  now: Date = new Date()
): DeferResult<P> {
  const sourceDayIndex = plans.findIndex((p) =>
    p.questions?.some((q) => q.scenarioId === scenarioId)
  )
  if (sourceDayIndex === -1) return { ok: false, reason: "not_found" }

  const targetDayIndex = selectDeferTargetIndex(plans, sourceDayIndex, now)
  if (targetDayIndex === null) return { ok: false, reason: "no_later_day" }

  const moved = plans[sourceDayIndex].questions!.find((q) => q.scenarioId === scenarioId)!
  const { completedAt: _completedAt, score: _score, ...rest } = moved
  const movedPending = { ...rest, status: "pending" }

  const updatedPlans = plans.map((plan, i) => {
    if (i === sourceDayIndex) {
      return {
        ...plan,
        questions: (plan.questions ?? []).filter((q) => q.scenarioId !== scenarioId),
      }
    }
    if (i === targetDayIndex) {
      return { ...plan, questions: [...(plan.questions ?? []), movedPending] }
    }
    return plan
  }) as P[]

  return { ok: true, updatedPlans, sourceDayIndex, targetDayIndex, movedTitle: moved.title }
}
