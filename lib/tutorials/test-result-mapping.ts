/**
 * Pure mapping from a client-runner result row (single-file `testCases` shape or workspace
 * `__WORKSPACE_TEST_RESULTS__` shape) to a `TestResultsPanel` row. Extracted from the run hook so
 * the hidden-test masking contract (HANDOFF §C) can be unit-tested without React.
 */
import type { TestResult } from "@/components/interview/TestResultsPanel"

export type RawResultRow = {
  description?: string
  suite?: string
  name?: string
  passed: boolean
  input?: unknown
  expected?: unknown
  actual?: unknown
  error: string | null
  isHidden?: boolean
}

/** Map one runner row to a panel row, masking hidden workspace tests (no source/assertion leak). */
export function mapResultRow(row: RawResultRow): TestResult {
  // Hidden tests still execute, but their source, suite/name, and assertion text must never reach
  // the UI — surface only pass/fail behind a generic label.
  if (row.isHidden) {
    return {
      description: "Hidden test",
      passed: row.passed,
      input: null,
      expected: "pass",
      actual: row.passed ? "pass" : "fail",
      error: row.passed
        ? null
        : "A hidden test failed. Your code didn't satisfy a requirement that isn't shown here.",
    }
  }

  const description =
    row.description ?? (row.suite && row.name ? `${row.suite}: ${row.name}` : (row.name ?? "Test"))
  return {
    description,
    passed: row.passed,
    input: row.input ?? row.suite ?? null,
    expected: row.expected ?? "pass",
    actual: row.actual ?? (row.passed ? "pass" : "fail"),
    error: row.error,
  }
}
