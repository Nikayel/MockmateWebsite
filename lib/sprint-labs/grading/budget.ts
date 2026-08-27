/**
 * Per-ticket submission budget + cooldown (docs/sprint-labs/WORKBOOK-SPEC.md
 * §5: "Per-ticket submission budget, cooldown, and fixed-latency reporting,
 * to close the oracle and timing channels"). Pure decision function: given
 * how many attempts already exist for (userId, ticketKey) and when the most
 * recent one landed, decide whether a NEW attempt may be opened.
 *
 * Enforced at `/api/sprint-labs/attempts` (open), folded into the SAME
 * transaction that creates the attempt's stub doc (fix round 1, I3 — the
 * budget slot and the stub are consumed atomically, decided on a fresh
 * in-transaction read, closing the race a separate pre-check could leave).
 * `/api/sprint-labs/attempts/complete` does not re-check budget: completing
 * an already-opened stub transitions its status, it does not consume a new
 * slot, so there is nothing left to over-spend there.
 *
 * DEFERRED (fix round 1, M12, by ruling): WORKBOOK-SPEC.md §5's
 * "fixed-latency reporting" — padding every `/attempts/complete` response to
 * a constant wall-clock time regardless of how much work grading did, so a
 * learner (or a scripted attacker) cannot use response latency itself as a
 * side channel to infer which hidden cases ran or how many passed. NOT
 * implemented in this task. If/when it lands, it belongs beside the route
 * handlers, not in this pure decision function.
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
