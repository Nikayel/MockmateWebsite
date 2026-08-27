/**
 * Browser-side entry point for a TypeScript workspace scenario, reached from
 * lib/workspace-execution/browser-execution.ts when `language === "typescript"`.
 *
 * Deliberately simpler than js-sandbox/workspace-runner.ts's `executeWorkspaceScenarioJsClientSide`:
 * that function pre-transpiles `.ts` files and renames their paths BEFORE sending them to the
 * worker (the old, server-round-trip-era convention). This one sends files RAW — transpilation
 * happens INSIDE the worker (see js-sandbox-worker.js's TS branch) — and sends `testPaths`/
 * `hiddenTestPaths` instead of a single hand-authored `entrypoint`, matching node-harness.ts's
 * input shape so the two stay interchangeable for "same semantics, two runtimes."
 */
import type { WorkspaceFileEdit, WorkspaceScenario, WorkspaceTestResult } from "../types"
import { overlayWorkspaceFiles } from "../files"
import type { TsWorkspaceRunResult } from "./types"
import { runTsInWorker } from "./worker-runner"

const RESULTS_MARKER = "__WORKSPACE_TEST_RESULTS__:"

/**
 * Overrides worker-runner.ts's DEFAULT_EXEC_TIMEOUT_MS (5s, left untouched — it stays the
 * conservative fallback for any caller that does not override it) for this specific call site.
 * Tests now run SEQUENTIALLY (vitest-shim.js's I2 fix), so the exec budget bounds the SUM of
 * every test's duration in the suite, not the slowest one; a flat 5s was calibrated for the old
 * (buggy) concurrent-completion-time model and could newly time out a suite of individually-fast
 * async tests with a cause-misattributing "infinite loop" message. 15s is a generous ceiling for a
 * sequential run of a realistic test suite, not the expected common case.
 */
export const TS_WORKSPACE_EXEC_TIMEOUT_MS = 15_000

export async function executeWorkspaceScenarioTsClientSide(
  scenario: WorkspaceScenario,
  edits: WorkspaceFileEdit[]
): Promise<TsWorkspaceRunResult> {
  try {
    const files = overlayWorkspaceFiles(scenario, edits)

    const runResult = await runTsInWorker(
      {
        files: files.map((file) => ({ path: file.path, content: file.content })),
        testPaths: scenario.workspace.visibleTestPaths,
        hiddenTestPaths: scenario.workspace.hiddenTestPaths,
      },
      TS_WORKSPACE_EXEC_TIMEOUT_MS
    )

    if (!runResult.success || runResult.error) {
      return {
        success: false,
        results: [
          {
            suite: "workspace",
            name: "Workspace test runner",
            passed: false,
            error: runResult.error || "Execution failed",
          },
        ],
        consoleLogs: runResult.logs,
        summary: {
          total: 1,
          passed: 0,
          failed: 1,
          passRate: 0,
          serviceErrors: 0,
          effectiveTotal: 1,
        },
        error: null,
        transpileTimingsMs: runResult.transpileTimingsMs || {},
      }
    }

    // Marker lines are protocol-internal regardless of type or position: strip every one of them
    // from what gets shown as console output.
    const cleanLogs: TsWorkspaceRunResult["consoleLogs"] = runResult.logs.filter(
      (log) => !log.message.startsWith(RESULTS_MARKER)
    )

    // Only "log"-typed entries are eligible, and only the LAST one counts — mirroring the
    // existing defense in python-sandbox/pack-oracle-runner.ts's decodePackStdout: the shim's own
    // finalize() call is always the last thing that logs this marker, so an earlier marker-shaped
    // line is either stale or a candidate's own console.log trying to forge a passing result set;
    // a marker written via console.error/warn/info cannot forge a match at all. Accumulating every
    // match (the old behavior) let a single injected line replace or augment the real verdict.
    const markerLogs = runResult.logs.filter(
      (log) => log.type === "log" && log.message.startsWith(RESULTS_MARKER)
    )
    const lastMarker = markerLogs.length > 0 ? markerLogs[markerLogs.length - 1] : null

    const results: WorkspaceTestResult[] = []
    if (lastMarker) {
      try {
        const parsed = JSON.parse(lastMarker.message.slice(RESULTS_MARKER.length))
        if (Array.isArray(parsed)) {
          results.push(...parsed)
        }
      } catch {
        // Ignore malformed runner output and fall through to the no-results error below.
      }
    }

    const finalResults: WorkspaceTestResult[] =
      results.length > 0
        ? results
        : [
            {
              suite: "workspace",
              name: "Workspace test runner",
              passed: false,
              error: "Test runner did not report any test results.",
            },
          ]

    const passedCount = finalResults.filter((result) => result.passed).length
    const totalCount = finalResults.length
    const failedCount = totalCount - passedCount
    const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0

    return {
      success: failedCount === 0,
      results: finalResults,
      consoleLogs: cleanLogs,
      summary: {
        total: totalCount,
        passed: passedCount,
        failed: failedCount,
        passRate,
        serviceErrors: 0,
        effectiveTotal: totalCount,
      },
      error: null,
      transpileTimingsMs: runResult.transpileTimingsMs || {},
    }
  } catch (err) {
    return {
      success: false,
      results: [],
      consoleLogs: [],
      summary: { total: 0, passed: 0, failed: 0, passRate: 0, serviceErrors: 0, effectiveTotal: 0 },
      error:
        err instanceof Error ? err.message : "Failed to execute TS workspace scenario client-side",
      transpileTimingsMs: {},
    }
  }
}
