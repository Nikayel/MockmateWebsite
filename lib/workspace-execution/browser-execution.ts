import type { Scenario } from "@/lib/scenarios"
import type {
  DsaExecutionResult,
  WorkspaceExecutionResult,
  WorkspaceFileEdit,
  WorkspaceScenario,
} from "./types"
import { executeJsClientSide, executeWorkspaceScenarioJsClientSide } from "./js-sandbox"
import { executePythonClientSide, executeWorkspaceScenarioPythonClientSide } from "./python-sandbox"
import {
  executeSqlClientSide,
  executeWorkspaceScenarioSqlClientSide,
  type SqlSingleFileScenario,
} from "./sql-sandbox"
import { isWorkspaceScenario } from "./validators"

type BrowserExecutionResult = DsaExecutionResult | WorkspaceExecutionResult

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

function formatWorkspaceResult(result: WorkspaceExecutionResult): BrowserExecutionResult {
  return {
    ...result,
    results: result.results.map((item) => ({
      description: `${item.suite}: ${item.name}`,
      passed: item.passed,
      input: item.suite,
      expected: "pass",
      actual: item.passed ? "pass" : "fail",
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
