/**
 * The per-ticket dynamic gate (PLAN.md Task 7 / docs/sprint-labs/WORKBOOK-SPEC.md §6's "sbx
 * history gate pointed at your own content"): apply `setup.diff`, assert visible+hidden are NOT
 * all passing (RED); apply `reference.diff` on top, assert they ARE all passing (GREEN); then
 * replay every PRIOR ticket's visible suite against the same GREEN tree (regression).
 *
 * "Not all passing" / "all passing" -- not "every individual test fails in the red state" -- is a
 * deliberate reading, not a looser stand-in for the brief's parenthetical own wording ("assert
 * not all-pass"): DEMO-101's own fixture content proves the stricter reading is wrong. Its buggy
 * setup-state parser (`return {ok:true, value:body}` unconditionally) makes visible test "accepts
 * a well-formed payload" pass even in the RED state -- only "rejects a payload missing tenantId"
 * fails. Requiring every visible test to fail pre-fix would reject correctly-authored content.
 * `visiblePassed`/`hiddenPassed` are still tracked SEPARATELY (not just one combined boolean) so a
 * GREEN failure names which tier didn't flip, per the brief's own requirement.
 */
import type { WorkspaceTestResult } from "@/lib/workspace-execution/types"

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

interface TierVerdict {
  visiblePassed: boolean
  hiddenPassed: boolean
  failingNames: string[]
}

function splitVerdict(results: WorkspaceTestResult[]): TierVerdict {
  const visible = results.filter((r) => !r.isHidden)
  const hidden = results.filter((r) => r.isHidden)
  return {
    visiblePassed: visible.length === 0 || visible.every((r) => r.passed),
    hiddenPassed: hidden.length === 0 || hidden.every((r) => r.passed),
    failingNames: results.filter((r) => !r.passed).map((r) => r.name),
  }
}

function tierLabel(verdict: TierVerdict): string {
  return `visible=${verdict.visiblePassed ? "PASS" : "FAIL"} hidden=${verdict.hiddenPassed ? "PASS" : "FAIL"}`
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
    const redVerdict = splitVerdict(redRun.result.results)

    if (redVerdict.visiblePassed && redVerdict.hiddenPassed) {
      findings.push({
        ruleId: "dynamic-red-green",
        severity: "error",
        ticketKey: ticket.key,
        message:
          "reference solution does not go red->green: the setup-applied state already passes every visible and hidden test, so reference.diff has nothing to fix.",
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
    const greenVerdict = splitVerdict(greenRun.result.results)

    if (!greenVerdict.visiblePassed || !greenVerdict.hiddenPassed) {
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
          message: `regression: "${prior.ticket.key}"'s visible suite fails after this ticket's reference.diff landed; failing: ${failing.join(", ") || "(unnamed)"}`,
        })
      }
    }
  } finally {
    cleanupGitWorkspace(greenMaterialized.ws)
  }

  return findings
}

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
    if (redSummary.allPassed) {
      return [
        {
          ruleId: "dynamic-red-green",
          severity: "error",
          ticketKey: ticket.key,
          message:
            "reference solution does not go red->green: the setup-applied SQL suite already passes every assertion, so reference.diff has nothing to fix.",
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
    if (!greenSummary.allPassed) {
      const failing = greenSummary.result.results.filter((r) => !r.passed).map((r) => r.name)
      return [
        {
          ruleId: "dynamic-red-green",
          severity: "error",
          ticketKey: ticket.key,
          message: `reference solution does not go red->green: the reference-applied SQL suite still fails; failing: ${failing.join(", ") || "(unnamed)"}`,
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
