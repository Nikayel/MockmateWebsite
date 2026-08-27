/**
 * Per-ticket submission budget + cooldown (docs/sprint-labs/WORKBOOK-SPEC.md
 * §5: "Per-ticket submission budget, cooldown, and fixed-latency reporting,
 * to close the oracle and timing channels"). Pure decision function: given
 * how many attempts already exist for (userId, ticketKey) and when the most
 * recent one landed, decide whether a NEW attempt may be opened.
 *
 * Enforced at BOTH ends of an attempt's lifecycle by the attempts service:
 * once when `/api/sprint-labs/attempts` issues fresh hidden-case inputs (so a
 * learner who is already out of budget never even receives a new variant to
 * probe with), and again, independently, when `/api/sprint-labs/attempts/
 * complete` is about to persist a graded submission (so a client that skips
 * the open call, or races two opens, cannot exceed the same limits).
 */

/** Max graded submissions a user may make against one ticket, ever. */
export const SPRINT_LAB_SUBMISSION_BUDGET = 5

/** Minimum seconds between two submissions on the same ticket. */
export const SPRINT_LAB_SUBMISSION_COOLDOWN_SECONDS = 60

export interface BudgetCheckInput {
  /** How many attempts already exist for this (userId, ticketKey). */
  priorAttemptCount: number
  /** ISO timestamp of the most recent existing attempt's submission, or `null` if there is none. */
  mostRecentSubmittedAt: string | null
  now: Date
}

export type BudgetCheckResult =
  | { allowed: true }
  | { allowed: false; reason: "BUDGET_EXCEEDED" }
  | { allowed: false; reason: "COOLDOWN_ACTIVE"; retryAfterSeconds: number }

/**
 * Budget is checked before cooldown: an exhausted budget is a hard, durable
 * stop, and reporting a `retryAfterSeconds` for it would falsely imply
 * waiting helps.
 */
export function checkSubmissionBudget(input: BudgetCheckInput): BudgetCheckResult {
  if (input.priorAttemptCount >= SPRINT_LAB_SUBMISSION_BUDGET) {
    return { allowed: false, reason: "BUDGET_EXCEEDED" }
  }

  if (input.mostRecentSubmittedAt === null) {
    return { allowed: true }
  }

  const elapsedSeconds =
    (input.now.getTime() - new Date(input.mostRecentSubmittedAt).getTime()) / 1000
  const remaining = SPRINT_LAB_SUBMISSION_COOLDOWN_SECONDS - elapsedSeconds
  if (remaining > 0) {
    return { allowed: false, reason: "COOLDOWN_ACTIVE", retryAfterSeconds: Math.ceil(remaining) }
  }

  return { allowed: true }
}
