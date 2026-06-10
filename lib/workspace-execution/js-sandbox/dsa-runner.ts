import type { DsaExecutionResult, DsaTestResult } from "../types"
import { validateResultEnhanced } from "@/lib/validators"
import { stripComments } from "./comments"
import { transpileIfNeeded } from "./transpiler"
import { buildJsWrapper } from "./dsa-wrapper"
import { runInWorker } from "./worker-runner"

export async function executeJsClientSide(
  code: string,
  language: string,
  testCases: any[],
  scenarioId: string
): Promise<DsaExecutionResult> {
  const results: DsaTestResult[] = []
  let allPassed = true
  let allConsoleLogs: any[] = []

  try {
    const jsCode = await transpileIfNeeded(code, language)
    const cleanCode = stripComments(jsCode, "javascript")

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i]
      const wrappedCode = buildJsWrapper(jsCode, testCase, cleanCode, scenarioId)

      const runResult = await runInWorker({ code: wrappedCode })

      if (runResult.logs && runResult.logs.length > 0) {
        allConsoleLogs = [...allConsoleLogs, ...runResult.logs]
      }

      if (!runResult.success || runResult.error) {
        allPassed = false
        results.push({
          description: testCase.description || `Test case ${i + 1}`,
          input: testCase.input,
          expected: testCase.expected,
          actual: null,
          passed: false,
          error: runResult.error || "Execution failed",
        })
        continue
      }

      const parsedActual = runResult.result
      const validation = validateResultEnhanced(parsedActual, testCase, scenarioId, "javascript")

      if (!validation.passed) {
        allPassed = false
      }

      results.push({
        description: testCase.description || `Test case ${i + 1}`,
        input: testCase.input,
        expected: testCase.expected,
        actual: parsedActual,
        passed: validation.passed,
        error: validation.reason || null,
      })
    }

    const passedCount = results.filter((r) => r.passed).length
    const totalCount = results.length
    const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0

    return {
      success: allPassed,
      results,
      consoleLogs: allConsoleLogs,
      summary: {
        total: totalCount,
        passed: passedCount,
        failed: totalCount - passedCount,
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
      error: err instanceof Error ? err.message : "Failed to execute JavaScript client-side",
    }
  }
}
