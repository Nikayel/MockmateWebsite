import type { Scenario } from "@/lib/scenarios"
import type {
  DsaExecutionResult,
  PackExecutionResult,
  WorkspaceExecutionResult,
  WorkspaceFileEdit,
  WorkspaceScenario,
} from "./types"
import { executeJsClientSide, executeWorkspaceScenarioJsClientSide } from "./js-sandbox"
import {
  executePackOracleClientSide,
  executePythonClientSide,
  executeWorkspaceScenarioPythonClientSide,
  type PackOracleRunResult,
} from "./python-sandbox"
import {
  executeSqlClientSide,
  executeWorkspaceScenarioSqlClientSide,
  type SqlSingleFileScenario,
} from "./sql-sandbox"
import { ORACLE_VISIBLE_PATH } from "@/lib/bugfix/packs/scenario"
import { isPackScenario, isWorkspaceScenario, type PackScenario } from "./validators"

type BrowserExecutionResult = DsaExecutionResult | WorkspaceExecutionResult | PackExecutionResult

type ScenarioWithCodebase = Scenario & {
  codebaseFiles?: Partial<Record<string, Array<{ fileName: string; content: string }>>>
}

function isBrowserExecutionLanguage(language: string): boolean {
  return (
    language === "javascript" ||
    language === "typescript" ||
    language === "python" ||
    language === "sql"
  )
}

function buildFullCode(code: string, scenario: ScenarioWithCodebase, language: string): string {
  if (scenario.type !== "bugfix" && scenario.type !== "add-functionality") {
    return code
  }

  const codebaseFiles = scenario.codebaseFiles?.[language] || []
  if (codebaseFiles.length === 0) return code

  const supportingCode = codebaseFiles
    .map((file) => {
      let content = file.content

      if (language === "javascript" || language === "typescript") {
        content = content
          .replace(/export\s+(function|const|let|var|class|default)\s+/g, "$1 ")
          .replace(/export\s*\{[^}]*\}/g, "")
          .replace(/import\s+.*?from\s+['"][^'"]*['"]\s*;?/g, "")
          .replace(/import\s+['"][^'"]*['"]\s*;?/g, "")
      }

      if (language === "python") {
        content = content
          .replace(/from\s+\.\w*\s+import\s+[^\n]+/g, "")
          .replace(
            /from\s+(?!typing|collections|functools|itertools|math|re|json|datetime|os|sys)\w+\s+import\s+[^\n]+/g,
            ""
          )
      }

      const header =
        language === "python" ? `# File: ${file.fileName}\n` : `// File: ${file.fileName}\n`
      return `${header}${content}`
    })
    .join("\n\n")

  return `${supportingCode}\n\n${code}`
}

/**
 * Map a stdout-oracle pack run onto the shared execution-result shape.
 *
 * `error` stays null for anything the runtime returned a verdict on — including a
 * crash in the candidate's own code. Top-level `error` makes the caller treat the
 * run as an infrastructure failure (`applyExecutionApiError`), but a candidate's
 * ValueError is a legitimate result: it is real terminal output they need to read.
 * Only a structurally impossible pack surfaces as a top-level error.
 */
function formatPackResult(
  result: PackOracleRunResult,
  scenario: PackScenario
): PackExecutionResult {
  const { runCmd } = scenario.pack
  const passed = result.match

  return {
    kind: "pack",
    success: passed,
    // One row so test-summary consumers (bugfix evidence, hint agent) stay
    // consistent with `summary`. The console renders `packRun` instead of this
    // row, so no synthetic expected/actual is invented for it.
    results: [
      {
        description: `$ ${runCmd}`,
        passed,
        input: "oracle",
        expected: undefined,
        actual: undefined,
        error: result.ran ? null : result.error,
      },
    ],
    consoleLogs: result.consoleLogs,
    summary: {
      total: 1,
      passed: passed ? 1 : 0,
      failed: passed ? 0 : 1,
      passRate: passed ? 100 : 0,
      serviceErrors: 0,
      effectiveTotal: 1,
    },
    error: null,
    packRun: {
      runCmd,
      ran: result.ran,
      stdout: result.stdout,
      oraclePath: ORACLE_VISIBLE_PATH,
      match: result.match,
      crashError: result.ran ? null : result.error,
    },
  }
}

function formatWorkspaceResult(result: WorkspaceExecutionResult): BrowserExecutionResult {
  return {
    ...result,
    results: result.results.map((item) => ({
      description: `${item.suite}: ${item.name}`,
      passed: item.passed,
      // The suite name rides in `input` — the guided-lab reveal filter keys off it.
      input: item.suite,
      // A workspace suite has no expected/actual pair; its assert message is the
      // signal. Synthesizing "pass"/"fail" here rendered `Expected: "pass"` and
      // `Got: "fail"`, which told the learner nothing about what broke.
      expected: undefined,
      actual: undefined,
      error: item.error,
      isHidden: item.isHidden,
    })),
  } as BrowserExecutionResult
}

export async function executeScenarioInBrowser(options: {
  code: string
  scenario: Scenario
  language: string
  workspaceFiles?: WorkspaceFileEdit[]
}): Promise<BrowserExecutionResult | null> {
  // Single-file SQL scenarios declare their language on the scenario itself (the tutorial adapter
  // sets `language: "sql"`), so the effective language comes from the scenario when present and
  // falls back to the caller's `language` for Python/JS scenarios, which don't set it.
  const language = isWorkspaceScenario(options.scenario)
    ? options.scenario.workspace.language
    : ((options.scenario as { language?: string }).language ?? options.language)

  if (!isBrowserExecutionLanguage(language)) {
    return null
  }

  // Packs run their `runCmd` and are graded by byte-exact stdout. They must never
  // reach the assert runner below: a pack's `testRunnerPath` is oracle config, not
  // an executable runner, and feeding it to Pyodide silently produces no results.
  if (isPackScenario(options.scenario)) {
    const packResult = await executePackOracleClientSide(
      options.scenario,
      options.workspaceFiles || []
    )
    return formatPackResult(packResult, options.scenario)
  }

  if (isWorkspaceScenario(options.scenario)) {
    const scenario = options.scenario as WorkspaceScenario
    const edits = options.workspaceFiles || []
    const result =
      language === "python"
        ? await executeWorkspaceScenarioPythonClientSide(scenario, edits)
        : language === "sql"
          ? await executeWorkspaceScenarioSqlClientSide(scenario, edits)
          : await executeWorkspaceScenarioJsClientSide(scenario, edits)

    return formatWorkspaceResult(result)
  }

  const testCases =
    "testCases" in options.scenario && Array.isArray(options.scenario.testCases)
      ? options.scenario.testCases
      : []

  if (testCases.length === 0) {
    return {
      success: false,
      results: [],
      consoleLogs: [],
      summary: { total: 0, passed: 0, failed: 0, passRate: 0, serviceErrors: 0, effectiveTotal: 0 },
      error: "No test cases defined for this scenario",
    }
  }

  const fullCode = buildFullCode(options.code, options.scenario as ScenarioWithCodebase, language)

  return language === "python"
    ? executePythonClientSide(fullCode, testCases, options.scenario.id)
    : language === "sql"
      ? executeSqlClientSide(
          fullCode,
          testCases,
          options.scenario as unknown as SqlSingleFileScenario
        )
      : executeJsClientSide(fullCode, language, testCases, options.scenario.id)
}
