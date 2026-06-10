import type {
  WorkspaceExecutionResult,
  WorkspaceFileEdit,
  WorkspaceScenario,
  WorkspaceTestResult,
} from "../types"
import { overlayWorkspaceFiles } from "../files"
import { transpileIfNeeded } from "./transpiler"
import { runInWorker } from "./worker-runner"

export async function executeWorkspaceScenarioJsClientSide(
  scenario: WorkspaceScenario,
  edits: WorkspaceFileEdit[]
): Promise<WorkspaceExecutionResult> {
  let allConsoleLogs: any[] = []
  try {
    const files = overlayWorkspaceFiles(scenario, edits)
    const runner = files.find((file) => file.path === scenario.workspace.testRunnerPath)
    if (!runner) {
      throw new Error(`Workspace runner not found: ${scenario.workspace.testRunnerPath}`)
    }

    const processedFiles = await Promise.all(
      files.map(async (file) => {
        const isTS = file.path.endsWith(".ts") || file.path.endsWith(".tsx")
        const cleanPath = file.path.replace(/\.tsx?$/, ".js")

        let content = file.content
        if (isTS) {
          content = await transpileIfNeeded(content, "typescript")
        }

        return {
          path: cleanPath,
          content,
        }
      })
    )

    const cleanRunnerPath = runner.path.replace(/\.tsx?$/, ".js")

    const runResult = await runInWorker({
      entrypoint: cleanRunnerPath,
      files: processedFiles,
    })

    if (runResult.logs && runResult.logs.length > 0) {
      allConsoleLogs = runResult.logs
    }

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
        consoleLogs: allConsoleLogs.map((log) => ({
          ...log,
          message: log.message.startsWith("__WORKSPACE_TEST_RESULTS__:") ? "" : log.message,
        })),
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
    const cleanLogs: any[] = []

    for (const log of allConsoleLogs) {
      const message = log.message || ""
      if (message.startsWith("__WORKSPACE_TEST_RESULTS__:")) {
        try {
          const parsed = JSON.parse(message.slice("__WORKSPACE_TEST_RESULTS__:".length))
          if (Array.isArray(parsed)) {
            results.push(...parsed)
          }
        } catch {
          // ignore parse errors
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

    const passedCount = finalResults.filter((r) => r.passed).length
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
    }
  } catch (err) {
    return {
      success: false,
      results: [],
      consoleLogs: [],
      summary: { total: 0, passed: 0, failed: 0, passRate: 0, serviceErrors: 0, effectiveTotal: 0 },
      error:
        err instanceof Error ? err.message : "Failed to execute workspace scenario client-side",
    }
  }
}
