import { executeFilesWithPiston, isExecutionServiceError } from "@/lib/piston"
import { buildPistonWorkspaceFiles } from "./piston-builder"
import { parseWorkspaceExecutionOutput } from "./result-parser"
import type { WorkspaceExecutionResult, WorkspaceFileEdit, WorkspaceScenario } from "./types"
import { validateWorkspaceScenario } from "./validators"

/**
 * @deprecated Server-side **Piston** workspace execution is DEPRECATED. Workspace scenarios now run
 * client-side via `executeWorkspaceScenarioPythonClientSide` / `...JsClientSide` (reached through
 * `executeScenarioInBrowser`). This server path is only reachable via the deprecated `POST
 * /api/execute` route. Kept for reference — wire the client-side runner instead.
 */
export async function executeWorkspaceScenario(options: {
  scenario: WorkspaceScenario
  edits: WorkspaceFileEdit[]
}): Promise<WorkspaceExecutionResult> {
  const scenarioErrors = validateWorkspaceScenario(options.scenario)
  if (scenarioErrors.length > 0) {
    return toFailure(`Workspace scenario is invalid: ${scenarioErrors.join("; ")}`)
  }

  const pistonFiles = buildPistonWorkspaceFiles(options.scenario, options.edits)
  const executionResult = await executeFilesWithPiston(
    pistonFiles,
    options.scenario.workspace.language
  )

  if (!executionResult.success || executionResult.error) {
    const error = executionResult.error || "Execution failed"
    const serviceErrorCount = isExecutionServiceError(error) ? 1 : 0
    return {
      success: false,
      results: [
        {
          suite: "workspace",
          name: serviceErrorCount > 0 ? "Code execution service" : "Workspace test runner",
          passed: false,
          error,
        },
      ],
      consoleLogs: [],
      summary: {
        total: 1,
        passed: 0,
        failed: serviceErrorCount > 0 ? 0 : 1,
        passRate: 0,
        serviceErrors: serviceErrorCount,
        effectiveTotal: serviceErrorCount > 0 ? 0 : 1,
      },
      error: null,
    }
  }

  const parsed = parseWorkspaceExecutionOutput(executionResult.output || "")
  const results =
    parsed.results.length > 0
      ? parsed.results
      : [
          {
            suite: "workspace",
            name: "Workspace test runner",
            passed: false,
            error: "Test runner did not report any test results.",
          },
        ]

  const passed = results.filter((result) => result.passed).length
  const total = results.length
  const failed = total - passed
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0

  return {
    success: failed === 0,
    results,
    consoleLogs: parsed.consoleLogs,
    summary: {
      total,
      passed,
      failed,
      passRate,
      serviceErrors: 0,
      effectiveTotal: total,
    },
    error: null,
  }
}

function toFailure(error: string): WorkspaceExecutionResult {
  return {
    success: false,
    results: [],
    consoleLogs: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      passRate: 0,
      serviceErrors: 0,
      effectiveTotal: 0,
    },
    error,
  }
}
