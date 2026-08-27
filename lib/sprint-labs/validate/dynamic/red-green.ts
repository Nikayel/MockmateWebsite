/**
 * The per-ticket dynamic gate (PLAN.md Task 7 / docs/sprint-labs/WORKBOOK-SPEC.md §6's "sbx
 * history gate pointed at your own content"): apply `setup.diff`, assert EVERY tier that has
 * executable tests actually fails (RED); apply `reference.diff` on top, assert every tier fully
 * passes (GREEN); then replay every PRIOR ticket's visible suite against the same GREEN tree
 * (regression).
 *
 * RED is checked PER TIER, not as one combined "not everything passes" union (PLAN.md Task 7
 * review round 1, Critical 1). The union check has a real hole: a hidden escape test that PASSES
 * even against the buggy setup state (an escape test that does not catch its own escape) sails
 * through as long as the VISIBLE tier fails for some unrelated reason -- the very thing the hidden
 * tier exists to prove (that this specific escape is caught) is never actually checked. So a tier
 * with executable tests must show at least one failure in the red state, independently for visible
 * and for hidden; GREEN still requires every tier with tests to fully pass (a tier with zero tests
 * has nothing to require either way -- see `splitVerdict`'s doc comment for the exact semantics).
 * `visiblePassed`/`hiddenPassed` from the union-check era are gone; `TierVerdict` now separates
 * "has executable tests" from "all of them currently pass" so RED and GREEN can each apply their
 * own (different) rule to the same shape.
 *
 * A harness that could not run at all (`result.error !== null`, or zero results from a non-success
 * run) is a hard `dynamic-red-green` ERROR before either tier is ever inspected -- Important 1 of
 * the same review round: an empty `results` array must never read as "vacuously passed" the way an
 * empty TIER legitimately can.
 *
 * `splitVerdict`/`redTierViolations`/`greenTierViolated`/`tierLabel` are runtime-agnostic (they
 * operate on the generic `WorkspaceTestResult[]` shape every workspace runner returns, keyed only on
 * `.isHidden`/`.passed`), so `runSqlRedGreen` reuses them UNCHANGED for the SQL path (the sealed
 * SQL-hidden-test subsystem's fix): before this, SQL had no way to even author a sealed hidden tier
 * that reached this gate at all, and this file's SQL check was one combined `allPassed` union across
 * whatever assertions existed -- the exact hole Critical 1 above closed for TS, now also closed here.
 * `sql-replay.ts`'s `buildPgSuiteForTicket` concatenates the ticket's sealed hidden assertions onto
 * the same suite the visible descriptor populates; `pg-suite-core.mjs`'s own `isHiddenAssertion`
 * (an id/humanName containing "hidden") is what tags the resulting results with `isHidden`, so no
 * new tier-detection logic was needed here, only reuse of what RED/GREEN already required per tier.
 */
import type { WorkspaceExecutionResult, WorkspaceTestResult } from "@/lib/workspace-execution/types"

import type { AuthoredTicket, AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"
import { readAllFiles } from "./git-workspace"
import { resolveTicketRunnerLanguage } from "./language"
import {
  cleanupGitWorkspace,
  materializeThroughReference,
  materializeThroughSetup,
  priorTickets,
} from "./materialize"
import { buildPgSuiteForTicket, runPgSuiteAndSummarize } from "./sql-replay"
import { runTicketFullSuite, runTicketVisibleSuite } from "./ts-replay"

interface TierState {
  count: number
  allPass: boolean
}

interface TierVerdict {
  visible: TierState
  hidden: TierState
  failingNames: string[]
}

/** `allPass` is only meaningful when `count > 0` -- a tier with zero executable tests is neither
 *  "passing" nor "failing", it has nothing to report either way. Callers decide what a zero-count
 *  tier means for THEIR purposes (RED: nothing required of it; GREEN: nothing required of it
 *  either, since there is nothing there to fail; "no tests exist at all": both callers separately
 *  guard the all-zero case). */
function splitVerdict(results: WorkspaceTestResult[]): TierVerdict {
  const visible = results.filter((r) => !r.isHidden)
  const hidden = results.filter((r) => r.isHidden)
  return {
    visible: {
      count: visible.length,
      allPass: visible.length > 0 && visible.every((r) => r.passed),
    },
    hidden: { count: hidden.length, allPass: hidden.length > 0 && hidden.every((r) => r.passed) },
    failingNames: results.filter((r) => !r.passed).map((r) => r.name),
  }
}

function tierLabel(verdict: TierVerdict): string {
  const label = (tier: TierState): string =>
    tier.count === 0 ? "n/a (0 tests)" : tier.allPass ? "PASS" : "FAIL"
  return `visible=${label(verdict.visible)} hidden=${label(verdict.hidden)}`
}

/** Important 1: a harness that couldn't run at all must never be read as a pass. `error !== null`
 *  covers the top-level catch path; `!success && results.length === 0` covers the "workspace has
 *  no files at all" / equivalent shapes that report failure but leave nothing for `splitVerdict`
 *  to see, which would otherwise default every tier to a vacuous, wrongly-green `count === 0`.
 *  Exported for a direct unit test of the exact boolean the review asked for -- reproducing a
 *  genuine `runTsWorkspace` internal crash through real content is difficult by design (its own
 *  test suite is built specifically to fail cleanly instead; see node-harness.test.ts's "fails
 *  cleanly... when the workspace has no files at all"), so this function's own logic is tested
 *  directly, and `__tests__/red-green.test.ts`'s mocked-harness test covers the integration path. */
export function harnessFailedToRun(result: WorkspaceExecutionResult): boolean {
  return result.error !== null || (!result.success && result.results.length === 0)
}

function harnessErrorFinding(
  ticketKey: string,
  stage: string,
  result: WorkspaceExecutionResult
): ValidationFinding {
  return {
    ruleId: "dynamic-red-green",
    severity: "error",
    ticketKey,
    message: `${stage} could not run at all (harness error), which is never a pass: ${result.error ?? "zero results with success:false"}`,
  }
}

function diffApplyFailedFinding(
  ticketKey: string,
  failure: { ticketKey: string; diffKind: string; error: string }
): ValidationFinding {
  return {
    ruleId: "dynamic-diff-apply-failed",
    severity: "error",
    ticketKey,
    message:
      failure.ticketKey === ticketKey
        ? `${failure.diffKind}.diff failed to apply via git apply: ${failure.error}`
        : `materializing this ticket's tree requires "${failure.ticketKey}"'s ${failure.diffKind}.diff, which failed to apply via git apply: ${failure.error}`,
  }
}

/** Critical 1: every tier that HAS executable tests must show at least one failure in the red
 *  state. Returns the violating tier descriptions (empty = a genuine red state, or no tests exist
 *  to check at all -- the latter handled by the caller's all-zero guard). */
function redTierViolations(verdict: TierVerdict): string[] {
  const violations: string[] = []
  if (verdict.visible.count > 0 && verdict.visible.allPass) {
    violations.push("visible tier did not fail in the red state")
  }
  if (verdict.hidden.count > 0 && verdict.hidden.allPass) {
    violations.push(
      "hidden tier did not fail in the red state -- an escape test that does not catch its escape"
    )
  }
  return violations
}

function greenTierViolated(verdict: TierVerdict): boolean {
  const visibleOk = verdict.visible.count === 0 || verdict.visible.allPass
  const hiddenOk = verdict.hidden.count === 0 || verdict.hidden.allPass
  return !visibleOk || !hiddenOk
}

async function runTsRedGreen(
  workbook: AuthoredWorkbook,
  ticket: AuthoredTicket
): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = []

  const redMaterialized = materializeThroughSetup(workbook, ticket.key)
  try {
    if (redMaterialized.failure) {
      return [diffApplyFailedFinding(ticket.key, redMaterialized.failure)]
    }

    const redRun = await runTicketFullSuite(redMaterialized.ws, ticket)
    if (harnessFailedToRun(redRun.result)) {
      return [harnessErrorFinding(ticket.key, "the setup-applied (red) run", redRun.result)]
    }

    const redVerdict = splitVerdict(redRun.result.results)
    const redViolations = redTierViolations(redVerdict)
    const noTestsAtAll = redVerdict.visible.count === 0 && redVerdict.hidden.count === 0
    if (noTestsAtAll) redViolations.push("no executable tests exist to verify a red state at all")

    if (redViolations.length > 0) {
      findings.push({
        ruleId: "dynamic-red-green",
        severity: "error",
        ticketKey: ticket.key,
        message: `reference solution does not go red->green: ${redViolations.join("; ")}.`,
      })
      return findings
    }
  } finally {
    cleanupGitWorkspace(redMaterialized.ws)
  }

  const greenMaterialized = materializeThroughReference(workbook, ticket.key)
  try {
    if (greenMaterialized.failure) {
      return [diffApplyFailedFinding(ticket.key, greenMaterialized.failure)]
    }

    const greenRun = await runTicketFullSuite(greenMaterialized.ws, ticket)
    findings.push(...greenRun.hiddenFindings)

    if (harnessFailedToRun(greenRun.result)) {
      findings.push(
        harnessErrorFinding(ticket.key, "the reference-applied (green) run", greenRun.result)
      )
      return findings
    }

    const greenVerdict = splitVerdict(greenRun.result.results)

    if (greenTierViolated(greenVerdict)) {
      findings.push({
        ruleId: "dynamic-red-green",
        severity: "error",
        ticketKey: ticket.key,
        message: `reference solution does not go red->green: after reference.diff, ${tierLabel(greenVerdict)}; failing: ${greenVerdict.failingNames.join(", ") || "(unnamed)"}`,
      })
      return findings
    }

    // Regression: every prior ticket's visible suite must still pass against this ticket's GREEN
    // tree. Scoped to TS-routed prior tickets -- see sql-replay.ts's header for why SQL regression
    // replay is out of scope until real SQL ticket content exists.
    for (const prior of priorTickets(workbook, ticket.key)) {
      if (!prior.ticket.referenceDiff) continue // stub, nothing shipped to regress
      if (resolveTicketRunnerLanguage(workbook, prior.ticket) !== "typescript") continue

      const regressionRun = await runTicketVisibleSuite(greenMaterialized.ws, prior.ticket)
      if (!regressionRun.success) {
        const failing = regressionRun.results.filter((r) => !r.passed).map((r) => r.name)
        findings.push({
          ruleId: "dynamic-regression",
          severity: "error",
          ticketKey: ticket.key,
          message: `regression: "${prior.ticket.key}"'s visible suite fails after this ticket's reference.diff landed; failing: ${failing.join(", ") || "(unnamed, or the harness could not run at all)"}`,
        })
      }
    }
  } finally {
    cleanupGitWorkspace(greenMaterialized.ws)
  }

  return findings
}

/**
 * SQL's red/green check, rewritten to be TIER-INDEPENDENT exactly like `runTsRedGreen` (the
 * SQL-hidden-test subsystem's fix for the second half of the S3 review's finding: SQL suites
 * previously had no way to even AUTHOR a hidden tier that reached this gate, and this function's
 * old shape checked `allPassed` as one combined union across visible+hidden regardless -- the same
 * hole Critical 1 closed for TS). `buildPgSuiteForTicket` (sql-replay.ts) now concatenates the
 * ticket's sealed `tests/hidden/*.yaml` (`kind: sql-assertion`) assertions onto the same
 * `assertions[]` the visible descriptor populates, and `pg-suite-core.mjs`'s own `isHiddenAssertion`
 * heuristic (an id/humanName containing "hidden") tags each resulting `WorkspaceTestResult` with
 * `isHidden` -- the exact shape `splitVerdict`/`redTierViolations`/`greenTierViolated` already
 * consume for the TS path, reused here UNCHANGED rather than reimplemented: a SQL ticket's hidden
 * tier must now show at least one failure in the red state (an escape test that does not catch its
 * own escape is caught, not silently waved through), and both tiers must fully pass in green.
 */
async function runSqlRedGreen(
  workbook: AuthoredWorkbook,
  ticket: AuthoredTicket
): Promise<ValidationFinding[]> {
  const redMaterialized = materializeThroughSetup(workbook, ticket.key)
  try {
    if (redMaterialized.failure) {
      return [diffApplyFailedFinding(ticket.key, redMaterialized.failure)]
    }

    const redFiles = readAllFiles(redMaterialized.ws)
    const redSuite = buildPgSuiteForTicket(ticket, redFiles)
    if ("gap" in redSuite) return [redSuite.gap]

    const redSummary = await runPgSuiteAndSummarize(redSuite.suite)
    if (harnessFailedToRun(redSummary.result)) {
      return [harnessErrorFinding(ticket.key, "the setup-applied (red) SQL run", redSummary.result)]
    }

    const redVerdict = splitVerdict(redSummary.result.results)
    const redViolations = redTierViolations(redVerdict)
    const noTestsAtAll = redVerdict.visible.count === 0 && redVerdict.hidden.count === 0
    if (noTestsAtAll) redViolations.push("no executable tests exist to verify a red state at all")

    if (redViolations.length > 0) {
      return [
        {
          ruleId: "dynamic-red-green",
          severity: "error",
          ticketKey: ticket.key,
          message: `reference solution does not go red->green: ${redViolations.join("; ")}.`,
        },
      ]
    }
  } finally {
    cleanupGitWorkspace(redMaterialized.ws)
  }

  const greenMaterialized = materializeThroughReference(workbook, ticket.key)
  try {
    if (greenMaterialized.failure) {
      return [diffApplyFailedFinding(ticket.key, greenMaterialized.failure)]
    }

    const greenFiles = readAllFiles(greenMaterialized.ws)
    const greenSuite = buildPgSuiteForTicket(ticket, greenFiles)
    if ("gap" in greenSuite) return [greenSuite.gap]

    const greenSummary = await runPgSuiteAndSummarize(greenSuite.suite)
    if (harnessFailedToRun(greenSummary.result)) {
      return [
        harnessErrorFinding(
          ticket.key,
          "the reference-applied (green) SQL run",
          greenSummary.result
        ),
      ]
    }

    const greenVerdict = splitVerdict(greenSummary.result.results)
    if (greenTierViolated(greenVerdict)) {
      const failing = greenSummary.result.results.filter((r) => !r.passed).map((r) => r.name)
      return [
        {
          ruleId: "dynamic-red-green",
          severity: "error",
          ticketKey: ticket.key,
          message: `reference solution does not go red->green: after reference.diff, ${tierLabel(greenVerdict)}; failing: ${failing.join(", ") || "(unnamed)"}`,
        },
      ]
    }
  } finally {
    cleanupGitWorkspace(greenMaterialized.ws)
  }

  return []
}

/** Runs the full dynamic gate (red/green + regression replay) for one ticket. Picks the harness by
 *  `language.ts`'s resolution. Caller (`dynamic/index.ts`) is responsible for skipping a ticket
 *  with no authored `reference.diff` at all (a Task 16 stub) before calling this. */
export async function runDynamicGateForTicket(
  workbook: AuthoredWorkbook,
  ticket: AuthoredTicket
): Promise<ValidationFinding[]> {
  const language = resolveTicketRunnerLanguage(workbook, ticket)
  return language === "sql" ? runSqlRedGreen(workbook, ticket) : runTsRedGreen(workbook, ticket)
}
