import type {
  WorkspaceExecutionResult,
  WorkspaceFileEdit,
  WorkspaceScenario,
  WorkspaceTestResult,
} from "../types"
import { overlayWorkspaceFiles } from "../files"
import { parseWorkspaceMarker } from "./workspace-marker"
import { runSqlInWorker } from "./worker-runner"

/**
 * Script/workspace SQL grading (L3/L4). The learner writes a multi-statement DDL+DML script (the
 * single editable file); the scenario carries `seedSql` + hidden `assertions` (dbt "count of
 * violations = 0") and an optional idempotency double-run. The worker runs the script then the
 * assertions and emits the `__WORKSPACE_TEST_RESULTS__:` marker; we parse it into the identical
 * `WorkspaceExecutionResult` the Python workspace path returns, so `formatWorkspaceResult()` and the
 * results UI stay byte-for-byte unchanged.
 */
interface SqlWorkspaceConfig {
  seedSql?: string
  assertions?: Array<{ suite: string; name: string; sql: string; isHidden?: boolean }>
  checkIdempotency?: boolean
}

export async function executeWorkspaceScenarioSqlClientSide(
  scenario: WorkspaceScenario,
  edits: WorkspaceFileEdit[]
): Promise<WorkspaceExecutionResult> {
  try {
    const files = overlayWorkspaceFiles(scenario, edits)
    const primary = files.find((file) => file.path === scenario.workspace.primaryFilePath)

    if (!primary) {
      throw new Error(`Workspace primary file not found: ${scenario.workspace.primaryFilePath}`)
    }

    // seedSql / assertions / checkIdempotency ride on the workspace config via the documented
    // exercise-scenarios cast (SqlWorkspaceGrading extends WorkspaceScenarioConfig).
    const config = scenario.workspace as unknown as SqlWorkspaceConfig

    const runResult = await runSqlInWorker({
      mode: "workspace",
      seedSql: config.seedSql ?? "",
      code: primary.content,
      assertions: config.assertions ?? [],
      checkIdempotency: config.checkIdempotency,
    })

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
              suite: "workspace",
              name: "Assertion runner",
              passed: false,
              error: "The assertion runner did not report any results.",
            },
          ]

    const passed = results.filter((result) => result.passed).length
    const total = results.length

    return {
      success: passed === total,
      results,
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
      error: error instanceof Error ? error.message : "Failed to execute SQL workspace client-side",
    }
  }
}

function workspaceFailure(
  error: string,
  logs: WorkspaceExecutionResult["consoleLogs"]
): WorkspaceExecutionResult {
  return {
    success: false,
    results: [{ suite: "workspace", name: "Assertion runner", passed: false, error }],
    consoleLogs: logs,
    summary: { total: 1, passed: 0, failed: 1, passRate: 0, serviceErrors: 0, effectiveTotal: 1 },
    error: null,
  }
}
