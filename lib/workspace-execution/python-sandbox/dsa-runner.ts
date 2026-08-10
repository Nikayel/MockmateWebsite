import type { DsaExecutionResult, DsaTestResult } from "../types"
import { validateResultEnhanced } from "@/lib/validators"
import { stripComments } from "../js-sandbox/comments"
import { buildPythonWrapper } from "./dsa-wrapper"
import { sanitizePythonTraceback } from "./traceback"
import { runPythonInWorker } from "./worker-runner"

export async function executePythonClientSide(
  code: string,
  testCases: unknown[],
  scenarioId: string
): Promise<DsaExecutionResult> {
  const results: DsaTestResult[] = []
  const consoleLogs: DsaExecutionResult["consoleLogs"] = []

  try {
    const cleanCode = stripComments(code, "python")
    // Errors are sanitized at birth so every consumer — the console, the test rows, the
    // interviewer's context — sees candidate-space line numbers and no Pyodide internals.
    const userCodeLineCount = code.split("\n").length

    for (let index = 0; index < testCases.length; index++) {
      const testCase = testCases[index] as {
        description?: string
        input?: unknown
        expected?: unknown
      }
      const wrappedCode = buildPythonWrapper(code, testCase, cleanCode, scenarioId)
      const runResult = await runPythonInWorker(wrappedCode)

      consoleLogs.push(...runResult.logs)

      if (!runResult.success || runResult.error) {
        results.push({
          description: testCase.description || `Test case ${index + 1}`,
          input: testCase.input,
          expected: testCase.expected,
          actual: null,
          passed: false,
          error: runResult.error
            ? sanitizePythonTraceback(runResult.error, userCodeLineCount)
            : "Execution failed",
        })
        continue
      }

      const validation = validateResultEnhanced(
        runResult.result,
        testCase as any,
        scenarioId,
        "python"
      )

      results.push({
        description: testCase.description || `Test case ${index + 1}`,
        input: testCase.input,
        expected: testCase.expected,
        actual: runResult.result,
        passed: validation.passed,
        error: validation.reason || null,
      })
    }

    const passedCount = results.filter((result) => result.passed).length
    const totalCount = results.length

    return {
      success: passedCount === totalCount,
      results,
      consoleLogs,
      summary: {
        total: totalCount,
        passed: passedCount,
        failed: totalCount - passedCount,
        passRate: totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0,
        serviceErrors: 0,
        effectiveTotal: totalCount,
      },
      error: null,
    }
  } catch (error) {
    return {
      success: false,
      results: [],
      consoleLogs,
      summary: { total: 0, passed: 0, failed: 0, passRate: 0, serviceErrors: 0, effectiveTotal: 0 },
      error: error instanceof Error ? error.message : "Failed to execute Python client-side",
    }
  }
}
