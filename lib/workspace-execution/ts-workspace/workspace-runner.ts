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

export async function executeWorkspaceScenarioTsClientSide(
  scenario: WorkspaceScenario,
  edits: WorkspaceFileEdit[]
): Promise<TsWorkspaceRunResult> {
  try {
    const files = overlayWorkspaceFiles(scenario, edits)

    const runResult = await runTsInWorker({
      files: files.map((file) => ({ path: file.path, content: file.content })),
      testPaths: scenario.workspace.visibleTestPaths,
      hiddenTestPaths: scenario.workspace.hiddenTestPaths,
    })

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

    const results: WorkspaceTestResult[] = []
    const cleanLogs: TsWorkspaceRunResult["consoleLogs"] = []

    for (const log of runResult.logs) {
      if (log.message.startsWith(RESULTS_MARKER)) {
        try {
          const parsed = JSON.parse(log.message.slice(RESULTS_MARKER.length))
          if (Array.isArray(parsed)) {
            results.push(...parsed)
          }
        } catch {
          // Ignore malformed runner output and fall through to the no-results error below.
        }
      } else {
        cleanLogs.push(log)
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
