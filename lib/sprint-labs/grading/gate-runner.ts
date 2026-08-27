/**
 * The hidden-gate runner — the server-side comparison
 * docs/sprint-labs/EXECUTION-STATE.md's deviation D1 and standing note
 * depend on. The client runs the LEARNER's code against server-issued
 * io-case inputs and posts raw outputs; this module is the only place that
 * ever sees a sealed `expected` value, and it never returns one.
 *
 * Two channels, kept structurally separate:
 *
 *  - **io-case** (server-verified, SCORED): compared here via `deepEqual`
 *    against the sealed `expected`. Feeds `scoredPassed`/`scoredTotal`
 *    (the scorer's Problem-Solving and escaped-defect-rate input) and
 *    `escapedDefects` (curated humanNames, WORKBOOK-SPEC.md §5's headline
 *    metric).
 *  - **probe** (client-executed, client-reported, NEVER SCORED): the
 *    boolean the client posts is trusted only far enough to DISPLAY —
 *    it is projected into `gateResult.cases` alongside io-case verdicts
 *    (so the UI can render one combined hidden-gate list) but never
 *    touches `scoredPassed`, `scoredTotal`, or `escapedDefects`. A
 *    fabricated probe "pass" therefore cannot move the score by even one
 *    point, let alone alter an io-case's verdict — the two are computed
 *    from entirely disjoint inputs.
 *
 * Omission rules (both directions are deliberate, see the tests):
 *  - An io-case NOT in `issuedIoCaseIds` (held back, or drawn by a
 *    different variant) is left OUT of the projection entirely, even if
 *    the client posted an output for it anyway — its very existence must
 *    not be confirmed to a learner it wasn't issued to.
 *  - An io-case that WAS issued but has no posted output counts as
 *    FAILED, not omitted — omitting it would let a learner submit outputs
 *    only for the cases they're confident about and dodge the rest.
 *  - A probe with no client-reported result is OMITTED (not defaulted to
 *    failed): unlike io-cases, probes carry zero scoring stakes, so there
 *    is nothing to protect by penalizing an unreported one.
 *
 * The returned `GateResult` is exactly the shape `lib/sprint-labs/types.ts`'s
 * `.strict()` `gateResultSchema` accepts: `{testId, humanName, passed}` and
 * nothing else. No raw output, no `expected`, no `input`, no probe body ever
 * appears here — the caller (attempts-service.ts) can hand this straight to
 * the client.
 */

import type { SealedHiddenCase } from "@/lib/scenarios/sealed/sprint-labs/types"
import type { GateResult, GateResultCase } from "@/lib/sprint-labs/types"
import { deepEqual } from "./deep-equal"

export interface RunHiddenGateInput {
  /** The ticket's full sealed hidden set (both kinds). */
  hiddenCases: SealedHiddenCase[]
  /** io-case ids this attempt's variant selected for scoring (variant.ts). */
  issuedIoCaseIds: string[]
  /** Client-posted raw outputs, keyed by io-case id. */
  ioCaseOutputs: Record<string, unknown>
  /** Client-posted booleans, keyed by probe id. Display-only, never scored. */
  probeResults: Record<string, boolean>
}

export interface RunHiddenGateResult {
  gateResult: GateResult
  /** How many issued io-cases passed — the ONLY scored numerator in this module. */
  scoredPassed: number
  /** How many io-cases were issued — the ONLY scored denominator in this module. */
  scoredTotal: number
  /** Curated humanNames of FAILED issued io-cases. Never includes a probe, per the file header. */
  escapedDefects: string[]
}

export function runHiddenGate(input: RunHiddenGateInput): RunHiddenGateResult {
  const issued = new Set(input.issuedIoCaseIds)
  const cases: GateResultCase[] = []
  let scoredPassed = 0
  let scoredTotal = 0
  const escapedDefects: string[] = []

  for (const hidden of input.hiddenCases) {
    if (hidden.kind === "io-case") {
      if (!issued.has(hidden.id)) continue

      const posted = Object.prototype.hasOwnProperty.call(input.ioCaseOutputs, hidden.id)
      const passed = posted && deepEqual(input.ioCaseOutputs[hidden.id], hidden.expected)

      cases.push({ testId: hidden.id, humanName: hidden.humanName, passed })
      scoredTotal++
      if (passed) scoredPassed++
      else escapedDefects.push(hidden.humanName)
    } else {
      if (!Object.prototype.hasOwnProperty.call(input.probeResults, hidden.id)) continue
      cases.push({
        testId: hidden.id,
        humanName: hidden.humanName,
        passed: input.probeResults[hidden.id],
      })
    }
  }

  return { gateResult: { gate: "hidden", cases }, scoredPassed, scoredTotal, escapedDefects }
}
