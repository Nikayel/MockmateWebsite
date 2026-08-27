/**
 * Per-objective mastery deltas for retro's "WHAT THIS MOVED" section
 * (UX-SPEC.md §10: "each with its transition rendered as before -> after in
 * words").
 *
 * No read API exists for a learner's actual mastery state anywhere in this
 * codebase — `recordSprintLabMastery` (lib/sprint-labs/mastery.ts) is
 * write-only, feeding `completeSessionWithMastery`'s spaced-repetition store,
 * which has no per-objective GET either (checked before writing this;
 * flagged in the Task 13 report). `ObjectiveChip.tsx`'s own header already
 * documents the fallback for exactly this situation: "screens with real
 * mastery data (retro, summary) build their own ObjectiveView[]" — this
 * module is that construction, using only signals this screen genuinely
 * has:
 *
 *  - `before` is always `"not_started"`, the same documented default
 *    `toNotStartedObjectiveView` uses elsewhere for "no per-learner signal
 *    available" — honest, not a real prior-state read.
 *  - `after` is derived from THIS ticket's own just-received, real,
 *    server-computed result: a finalized attempt with zero escaped defects
 *    demonstrates every objective the ticket maps to; anything else means at
 *    least one is still being practiced. There is no per-defect objective
 *    mapping anywhere on `TicketAttempt.escapedDefects` (`string[]`, no
 *    objective id — same gap `EscapedDefectList`'s header documents), so a
 *    single escape cannot be pinned to one specific objective without
 *    fabricating a link the data doesn't carry. Never `"escaped"` at this
 *    per-objective granularity for that same reason — that state is real
 *    only for a genuinely defect-attributed objective.
 */

import type { SprintLabObjective } from "@/lib/sprint-labs/types"
import type { ObjectiveView } from "@/components/sprint-labs/ui/ObjectiveChip"

export interface ObjectiveDelta {
  id: string
  label: string
  sentence: string
  before: ObjectiveView["state"]
  after: ObjectiveView["state"]
}

export function buildObjectiveDeltas(
  objectives: SprintLabObjective[],
  finalizedCleanRun: boolean
): ObjectiveDelta[] {
  return objectives.map((objective) => ({
    id: objective.id,
    label: objective.label,
    sentence: objective.canDo,
    before: "not_started",
    after: finalizedCleanRun ? "demonstrated" : "practicing",
  }))
}
