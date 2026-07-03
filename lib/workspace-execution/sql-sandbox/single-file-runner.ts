import type { DsaExecutionResult, DsaTestResult } from "../types"
import { compareResultSets, type SqlResultSet } from "./comparator"
import { runSqlInWorker } from "./worker-runner"

/**
 * Single-query SQL grading (L1/L2). The scenario carries the seed DB and one expected result set
 * (adapted from a `SqlExercise` in `lib/tutorials/exercise-scenarios.ts`); the learner writes one
 * `SELECT`. We seed a fresh in-memory SQLite DB, run the SELECT, and compare `{ columns, rows }` to
 * the expected set — returning the exact `DsaExecutionResult` shape the Python/JS single-file paths
 * return, so `useExerciseRun` and the results UI consume it unchanged.
 */
interface SqlSingleFileTestCase {
  description?: string
  expected?: SqlResultSet
  orderMatters?: boolean
  caseInsensitive?: boolean
}

export interface SqlSingleFileScenario {
  id: string
  seedSql?: string
  caseInsensitive?: boolean
}

export async function executeSqlClientSide(
  code: string,
  testCases: unknown[],
  scenario: SqlSingleFileScenario
): Promise<DsaExecutionResult> {
  const testCase = (testCases[0] as SqlSingleFileTestCase) ?? {}
  const expected: SqlResultSet = testCase.expected ?? { columns: [], rows: [] }
  const description = testCase.description || "Result set matches the expected output"

  try {
    const runResult = await runSqlInWorker({
      mode: "single-file",
      seedSql: scenario.seedSql ?? "",
      code,
    })

    const consoleLogs = runResult.logs

    if (!runResult.success || runResult.error) {
      return singleResult(
        {
          description,
          input: null,
          expected,
          actual: null,
          passed: false,
          error: runResult.error || "Your query could not be executed.",
        },
        consoleLogs
      )
    }

    const actual = runResult.result as SqlResultSet | null
    const comparison = compareResultSets(expected, actual, {
      orderMatters: testCase.orderMatters,
      caseInsensitive: testCase.caseInsensitive ?? scenario.caseInsensitive,
    })

    return singleResult(
      {
        description,
        input: null,
        expected,
        actual,
        passed: comparison.passed,
        // A passing run may still carry an advisory (column-name drift); a failing run carries why.
        error: comparison.passed ? null : (comparison.reason ?? "Result set did not match."),
      },
      consoleLogs
    )
  } catch (error) {
    return {
      success: false,
      results: [],
      consoleLogs: [],
      summary: { total: 0, passed: 0, failed: 0, passRate: 0, serviceErrors: 0, effectiveTotal: 0 },
      error: error instanceof Error ? error.message : "Failed to execute SQL client-side",
    }
  }
}

function singleResult(
  result: DsaTestResult,
  consoleLogs: DsaExecutionResult["consoleLogs"]
): DsaExecutionResult {
  const passed = result.passed ? 1 : 0
  return {
    success: result.passed,
    results: [result],
    consoleLogs,
    summary: {
      total: 1,
      passed,
      failed: 1 - passed,
      passRate: passed * 100,
      serviceErrors: 0,
      effectiveTotal: 1,
    },
    error: null,
  }
}
