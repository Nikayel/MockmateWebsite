import type {
  WorkspaceExecutionResult,
  WorkspaceFileEdit,
  WorkspaceScenario,
  WorkspaceTestResult,
} from "../types"
import { overlayWorkspaceFiles } from "../files"
import { runPythonInWorker } from "./worker-runner"

export async function executeWorkspaceScenarioPythonClientSide(
  scenario: WorkspaceScenario,
  edits: WorkspaceFileEdit[]
): Promise<WorkspaceExecutionResult> {
  try {
    const files = overlayWorkspaceFiles(scenario, edits)
    const runner = files.find((file) => file.path === scenario.workspace.testRunnerPath)

    if (!runner) {
      throw new Error(`Workspace runner not found: ${scenario.workspace.testRunnerPath}`)
    }

    const runResult = await runPythonInWorker({
      entrypoint: runner.path,
      files: files.map((file) => ({ path: file.path, content: file.content })),
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
      }
    }

    const results: WorkspaceTestResult[] = []
    const cleanLogs: WorkspaceExecutionResult["consoleLogs"] = []

    for (const log of runResult.logs) {
      if (log.message.startsWith("__WORKSPACE_TEST_RESULTS__:")) {
        try {
          const parsed = JSON.parse(log.message.slice("__WORKSPACE_TEST_RESULTS__:".length))
          if (Array.isArray(parsed)) {
            results.push(...parsed)
          }
        } catch {
          // Ignore malformed runner output and fall through to the no-results error.
        }
      } else {
        cleanLogs.push(log)
      }
    }

    const finalResults =
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

    const passed = finalResults.filter((result) => result.passed).length
    const total = finalResults.length

    return {
      success: passed === total,
      results: finalResults,
      consoleLogs: cleanLogs,
      summary: {
        total,
        passed,
        failed: total - passed,
        passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
        serviceErrors: 0,
        effectiveTotal: total,
      },
      error: null,
    }
  } catch (error) {
    return {
      success: false,
      results: [],
      consoleLogs: [],
      summary: { total: 0, passed: 0, failed: 0, passRate: 0, serviceErrors: 0, effectiveTotal: 0 },
      error:
        error instanceof Error ? error.message : "Failed to execute Python workspace client-side",
    }
  }
}
