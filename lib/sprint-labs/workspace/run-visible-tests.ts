/**
 * Sprint Labs workspace — client-side visible-test execution (PLAN.md Task 12).
 *
 * Divergence from the brief, recorded per this task's own "report, don't guess" instruction:
 * the brief describes "the BROWSER path routes through lib/workspace-execution/browser-execution.ts
 * for language 'typescript'". That dispatcher (`executeScenarioInBrowser`) and the wrapper it calls
 * for TS (`executeWorkspaceScenarioTsClientSide`, lib/workspace-execution/ts-workspace/
 * workspace-runner.ts) both take a `Scenario`/`WorkspaceScenario` (lib/scenarios) — a DIFFERENT
 * domain from Sprint Labs' `CompiledTicket` (lib/sprint-labs/content/types.ts). browser-execution.ts's
 * own file header says as much for the sibling pg-sandbox engine: "Sprint Labs tickets are typed via
 * lib/sprint-labs/types.ts (TicketPublic/SprintLabRun), not the Scenario/WorkspaceScenario union this
 * file dispatches on." Fabricating a throwaway `WorkspaceScenario` just to satisfy that wrapper's
 * signature would be worse than calling the primitive underneath it directly: `runTsInWorker`
 * (lib/workspace-execution/ts-workspace, browser-safe barrel) takes the scenario-agnostic
 * `{files, testPaths, hiddenTestPaths}` shape that a ticket's file map already IS. This module is
 * Sprint Labs' own adapter onto that same primitive, mirroring — not modifying — Task 4's own
 * wrapper.
 *
 * The `__WORKSPACE_TEST_RESULTS__:` marker-parsing below (last "log"-typed marker wins, protocol
 * lines stripped from displayed console output) mirrors `executeWorkspaceScenarioTsClientSide`'s own
 * parsing, because that parsing is not separately exported as a reusable function and
 * `workspace-runner.ts` is reuse-only for this task (Task 4's owned file, never modified here). This
 * is a deliberate, small (~30-line) duplication of a stable wire protocol, not a duplicated business
 * rule — see task-12-report.md for why this was judged the lesser risk versus editing a
 * concurrently-owned file to extract a shared helper.
 *
 * `hiddenTestPaths` is always `[]`: visible-tier only here by design (hidden/regression/adversary run
 * server-side at submit — Task 13). Never widen this module to accept a hidden-test path; hidden
 * tests are not in the learner's mount at all (AGENT-CONTEXT.md §4).
 */
import { runTsInWorker } from "@/lib/workspace-execution/ts-workspace"
import type { WorkspaceTestResult } from "@/lib/workspace-execution/types"

export interface RunnableFile {
  path: string
  content: string
}

export interface RunVisibleTestsSummary {
  total: number
  passed: number
  failed: number
  passRate: number
}

export interface RunVisibleTestsResult {
  results: WorkspaceTestResult[]
  summary: RunVisibleTestsSummary
  /** Non-null only on an infrastructure failure (worker spawn, transpile timeout, exec timeout, or
   *  a runner that reported no results at all) — distinct from a normal failing-test result. */
  infraError: string | null
}

const RESULTS_MARKER = "__WORKSPACE_TEST_RESULTS__:"

/** Mirrors ts-workspace/workspace-runner.ts's TS_WORKSPACE_EXEC_TIMEOUT_MS: tests run sequentially,
 *  so the budget bounds the SUM of every test's duration, not the slowest one. Kept as a local
 *  constant (see file header) rather than a deep import of that module's internals. */
const EXEC_TIMEOUT_MS = 15_000

const EMPTY_SUMMARY: RunVisibleTestsSummary = { total: 0, passed: 0, failed: 0, passRate: 0 }

export async function runVisibleTests(
  files: RunnableFile[],
  testPaths: string[]
): Promise<RunVisibleTestsResult> {
  const runResult = await runTsInWorker({ files, testPaths, hiddenTestPaths: [] }, EXEC_TIMEOUT_MS)

  if (!runResult.success || runResult.error) {
    return {
      results: [],
      summary: EMPTY_SUMMARY,
      infraError: runResult.error || "Couldn't run the visible tests.",
    }
  }

  // Only "log"-typed entries are eligible, and only the LAST one counts (same defense as
  // executeWorkspaceScenarioTsClientSide and python-sandbox's decodePackStdout): the shim's own
  // finalize() call is always the last thing that logs this marker, so an earlier marker-shaped
  // line is stale, and a marker written via console.error/warn/info cannot forge a result set.
  const markerLogs = runResult.logs.filter(
    (log) => log.type === "log" && log.message.startsWith(RESULTS_MARKER)
  )
  const lastMarker = markerLogs.length > 0 ? markerLogs[markerLogs.length - 1] : null

  let raw: WorkspaceTestResult[] = []
  if (lastMarker) {
    try {
      const parsed: unknown = JSON.parse(lastMarker.message.slice(RESULTS_MARKER.length))
      if (Array.isArray(parsed)) raw = parsed as WorkspaceTestResult[]
    } catch {
      // Malformed runner output falls through to the no-results case below.
    }
  }

  if (raw.length === 0) {
    return {
      results: [],
      summary: EMPTY_SUMMARY,
      infraError: "The test runner did not report any results.",
    }
  }

  const passed = raw.filter((r) => r.passed).length
  const total = raw.length
  return {
    results: raw,
    summary: {
      total,
      passed,
      failed: total - passed,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
    },
    infraError: null,
  }
}
