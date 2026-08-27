/**
 * Sprint Lab -> spaced-repetition mastery mapping (docs/sprint-labs/PLAN.md
 * Task 8), mirroring `lib/labs/case-lab-mastery.ts`'s shape: a pure builder
 * plus a best-effort recorder that calls the one shared entry point,
 * `completeSessionWithMastery` (`lib/learning-state.ts:356`).
 *
 * Registered under the dedicated non-DSA `sprint-lab` bucket
 * (`DSA_PATTERNS.SPRINT_LAB`) for the same reason Case Labs got `case-lab`:
 * a Meridian ticket is not one DSA pattern, so recording it as one would
 * inflate that pattern's stats with work the learner never did.
 *
 * Field-name note (docs/sprint-labs/INTEGRATION.md §3): this module ONLY
 * ever calls `completeSessionWithMastery`, never `lib/spaced-repetition/
 * scheduler.ts`'s `updateProblemMastery`/`initializeProblemMasteryFromSession`
 * directly — that indirection is exactly what keeps it safe from
 * `lib/session-metrics.ts`'s documented field-name mismatch with
 * `scheduler.ts`, since this file never constructs a `ProblemMastery`-shaped
 * object of its own.
 *
 * Unlike Case Labs (which has no pre-computed mastery number and must derive
 * one from raw test-pass counts via `calculateMasteryScore`), a
 * `TicketAttempt` already carries a full, considered 0-100 breakdown from
 * `lib/sprint-labs/grading/scorer.ts` — `overall` (the full rubric score,
 * communication included when present) and `problemSolving` (hidden IO-case
 * pass rate, the closest analog to Case Labs' "code correctness, no
 * communication" mastery number). This module reuses those directly rather
 * than recomputing a second, differently-shaped score.
 */

import type { DSAPattern } from "@/lib/types/dsa-patterns"
import { logger } from "@/lib/logger"
import type { TicketAttempt, TicketPublic } from "./types"

const SPRINT_LAB_MASTERY_PATTERN: DSAPattern = "sprint-lab"

export interface SprintLabMasterySession {
  scenarioId: string
  title: string
  pattern: DSAPattern
  difficulty: "easy" | "medium" | "hard"
  performanceScore: number
  masteryScore: number
  completedAt: string
}

/**
 * `TicketPublic` carries no explicit difficulty (WORKBOOK-SPEC.md §6 sizes
 * a ticket by `points`, not a difficulty enum), so this bands the one sizing
 * signal that exists into the three-value scale `completeSessionWithMastery`
 * expects.
 */
export function difficultyForPoints(points: number): "easy" | "medium" | "hard" {
  if (points <= 3) return "easy"
  if (points <= 6) return "medium"
  return "hard"
}

/**
 * Pure mapping: a completed ticket attempt into the session payload
 * `completeSessionWithMastery` expects. `scenarioId` is namespaced by
 * workbook so the same ticket key in two different workbooks (unlikely, but
 * never assumed) can never collide in `problem_mastery`.
 */
export function buildSprintLabMasterySession(
  workbookId: string,
  ticket: TicketPublic,
  attempt: TicketAttempt
): SprintLabMasterySession {
  return {
    scenarioId: `sprint-labs:${workbookId}:${ticket.key}`,
    title: ticket.title,
    pattern: SPRINT_LAB_MASTERY_PATTERN,
    difficulty: difficultyForPoints(ticket.points),
    performanceScore: attempt.scores.overall,
    masteryScore: attempt.scores.problemSolving,
    completedAt: attempt.submittedAt,
  }
}

/**
 * Record a completed Sprint Lab ticket attempt against problem-level
 * mastery. Best-effort: any failure is logged, never thrown, so a mastery
 * hiccup can never fail the attempt-completion response (matching
 * `recordCaseLabMastery`'s contract).
 *
 * The ai_policy split (WORKBOOK-SPEC.md §5 rule 1) is enforced HERE, inside
 * the one recorder, not left to each call site to remember: only
 * `unassisted` and `review-only` attempts feed mastery, and only once
 * `finalized` — an assisted attempt, or a formative-only re-attempt, is a
 * silent no-op.
 */
export async function recordSprintLabMastery(
  userId: string,
  workbookId: string,
  ticket: TicketPublic,
  attempt: TicketAttempt
): Promise<void> {
  if (attempt.aiPolicy === "assisted" || !attempt.finalized) return

  try {
    const { completeSessionWithMastery } = await import("@/lib/learning-state")
    await completeSessionWithMastery(
      userId,
      buildSprintLabMasterySession(workbookId, ticket, attempt)
    )
  } catch (error) {
    logger.error("Sprint lab mastery update failed", {
      error,
      userId,
      workbookId,
      ticketKey: ticket.key,
    })
  }
}
