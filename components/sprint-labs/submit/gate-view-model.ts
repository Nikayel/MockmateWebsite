/**
 * Pure projection: a `CompleteAttemptOutcome`'s `gateResults` (Task 8's real,
 * frozen `GateResult[]` — `{gate, cases: [{testId, humanName, passed}]}`)
 * into what `GateCard`/`GateSequence` render, plus how many of the four
 * gates the staged reveal has shown so far.
 *
 * No network call, no timers — `useGateReveal` (this folder) owns the
 * staged-reveal timing; this module only knows how to read one already-known
 * result.
 *
 * ## Why "visible"/"regression"/"adversary" never carry named escapes
 *
 * Only the HIDDEN gate is built from real per-case comparisons
 * (`lib/sprint-labs/grading/gate-runner.ts`'s `runHiddenGate`, one
 * `GateResultCase` per hidden test). The other three gates are built by
 * `attempts-service.ts`'s `buildAggregateGateResult` from a client-posted
 * `{passed, total}` COUNT — it emits at most ONE synthetic case whose
 * `humanName` is already a formatted summary line ("7/10 visible tests
 * passed"), never a per-defect name. UX-SPEC.md §8's mockup shows a named
 * "Escaped: a replayed webhook..." line under ADVERSARY specifically; the
 * real, stable API has no field that carries that (flagged in the Task 13
 * report). This module renders exactly what the real shape supports: curated
 * `humanName` strings only, sourced from `cases[].humanName` and nothing
 * else, so a card can never render raw output even by accident.
 */

import type { GateKind, GateResult } from "@/lib/sprint-labs/types"

export type GateCardStatus = "pending" | "passed" | "failed" | "errored"

export interface GateCardViewModel {
  id: GateKind
  name: string
  definition: string
  status: GateCardStatus
  /** Only ever populated for the hidden gate — see file header. */
  escaped: string[]
  /** The one synthetic aggregate line for visible/regression/adversary, verbatim. */
  summaryLine?: string
  passed: number
  total: number
}

/** Fixed platform copy, quoted from WORKBOOK-SPEC.md §4 (UX-SPEC.md §8 Copy notes). */
export const GATE_ORDER: GateKind[] = ["visible", "hidden", "regression", "adversary"]

const GATE_NAME: Record<GateKind, string> = {
  visible: "Visible",
  hidden: "Hidden",
  regression: "Regression",
  adversary: "Adversary",
}

const GATE_DEFINITION: Record<GateKind, string> = {
  visible: "the ticket's stated definition of done",
  hidden: "the edge cases a careful engineer would have thought of",
  regression: "every previous sprint's suite",
  adversary: "a hostile actor runs against your implementation",
}

function pendingCard(id: GateKind): GateCardViewModel {
  return {
    id,
    name: GATE_NAME[id],
    definition: GATE_DEFINITION[id],
    status: "pending",
    escaped: [],
    passed: 0,
    total: 0,
  }
}

function toCard(result: GateResult): GateCardViewModel {
  const base = {
    id: result.gate,
    name: GATE_NAME[result.gate],
    definition: GATE_DEFINITION[result.gate],
  }

  if (result.gate === "hidden") {
    const total = result.cases.length
    const passed = result.cases.filter((c) => c.passed).length
    const escaped = result.cases.filter((c) => !c.passed).map((c) => c.humanName)
    return {
      ...base,
      status: total === 0 ? "errored" : passed === total ? "passed" : "failed",
      escaped,
      passed,
      total,
    }
  }

  // visible / regression / adversary: at most one synthetic aggregate case.
  if (result.cases.length === 0) {
    return { ...base, status: "errored", escaped: [], passed: 0, total: 0 }
  }
  const [summary] = result.cases
  return {
    ...base,
    status: summary.passed ? "passed" : "failed",
    escaped: [],
    summaryLine: summary.humanName,
    passed: summary.passed ? 1 : 0,
    total: 1,
  }
}

/**
 * Builds all four cards for the current reveal step. `revealedCount` gates
 * how many of `GATE_ORDER`'s real results are projected; the rest render as
 * `pending` regardless of what the (already fully known) response contains,
 * which is what makes the reveal "staged" rather than instantaneous.
 */
export function buildGateCards(
  gateResults: GateResult[],
  revealedCount: number
): GateCardViewModel[] {
  const byGate = new Map(gateResults.map((g) => [g.gate, g]))
  return GATE_ORDER.map((id, index) => {
    if (index >= revealedCount) return pendingCard(id)
    const result = byGate.get(id)
    return result ? toCard(result) : pendingCard(id)
  })
}

/** One line under a card whose status is "errored" — an infrastructure fault, never a red failure. */
export const GATE_ERRORED_LINE = "This gate could not run. It is not counted against you."

export interface GateHeadline {
  text: string
  tone: "neutral" | "success"
}

/**
 * The post-reveal headline. `escapedDefects` is `attempt.escapedDefects`
 * verbatim (WORKBOOK-SPEC.md §5's headline metric: hidden tests failed over
 * hidden tests run) — never re-derived from the cards above, so the number
 * matches exactly what the server scored.
 */
export function buildHeadline(ticketKey: string, escapedDefects: string[]): GateHeadline {
  if (escapedDefects.length === 0) {
    return { text: `Nothing escaped on ${ticketKey}.`, tone: "success" }
  }
  const count =
    escapedDefects.length === 1 ? "1 escaped defect" : `${escapedDefects.length} escaped defects`
  return { text: `${count} on ${ticketKey}.`, tone: "neutral" }
}
