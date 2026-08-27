import type { WorkspaceExecutionResult, WorkspaceTestResult } from "../types"
import { parseWorkspaceMarker } from "../sql-sandbox/workspace-marker"
import { runPgInWorker } from "./worker-runner"
import type { PgSuite } from "./types"
// A static import of the shared, browser-safe core (see its own header) — it has no Node-specific
// import of its own, so bundling it into the client is fine, and it is the ONE place
// pass/total/summary computation is written (node-runner.ts calls the same function), rather than
// two independently-maintained copies drifting apart.
import { summarizeResults } from "../../../public/workers/pg-suite-core.mjs"

/**
 * Browser-side entry point for the PGlite suite engine. Posts the suite to
 * public/workers/pg-sandbox-worker.js (a fresh `PGlite` instance boots inside the worker for this
 * one call — see that file's header), then parses the shared `__WORKSPACE_TEST_RESULTS__:` marker
 * the worker emits into the same `WorkspaceExecutionResult` shape every other workspace runner in
 * this codebase returns.
 */
export async function runPgSuite(suite: PgSuite): Promise<WorkspaceExecutionResult> {
  try {
    const runResult = await runPgInWorker({ mode: "suite", suite })

    if (!runResult.success || runResult.error) {
      return workspaceFailure(runResult.error || "Execution failed", runResult.logs)
    }

    const parsed = parseWorkspaceMarker(runResult.logs)
    const cleanLogs = runResult.logs.filter(
      (log) => !log.message.startsWith("__WORKSPACE_TEST_RESULTS__:")
    )

    const results: WorkspaceTestResult[] =
      parsed && parsed.length > 0
        ? parsed
        : [
            {
              suite: "pg-suite",
              name: "Suite runner",
              passed: false,
              error: "The suite runner did not report any results.",
            },
          ]

    const summarized = summarizeResults(results) as WorkspaceExecutionResult
    return { ...summarized, consoleLogs: cleanLogs }
  } catch (error) {
    return {
      success: false,
      results: [],
      consoleLogs: [],
      summary: { total: 0, passed: 0, failed: 0, passRate: 0, serviceErrors: 0, effectiveTotal: 0 },
      error: error instanceof Error ? error.message : "Failed to execute PG suite client-side",
    }
  }
}

function workspaceFailure(
  error: string,
  logs: WorkspaceExecutionResult["consoleLogs"]
): WorkspaceExecutionResult {
  return {
    success: false,
    results: [{ suite: "pg-suite", name: "Suite runner", passed: false, error }],
    consoleLogs: logs,
    summary: { total: 1, passed: 0, failed: 1, passRate: 0, serviceErrors: 0, effectiveTotal: 1 },
    error: null,
  }
}
