import {
  isScoreableTest,
  type ExecutionTestObservation,
} from "@/lib/workspace-execution/test-outcomes"
import { z } from "zod"

export const feedbackTestResultsSchema = z
  .array(
    z
      .object({
        sourceRevision: z.string().max(128).optional(),
        passed: z.boolean(),
        description: z.string().max(2000).optional(),
        error: z.string().max(20000).nullable().optional(),
        failureKind: z.enum(["candidate", "candidate-timeout", "service", "harness"]).optional(),
        expected: z.unknown().optional(),
        actual: z.unknown().optional(),
      })
      .passthrough()
  )
  .max(500)

export interface FeedbackTestResult extends ExecutionTestObservation {
  description?: string
  passed?: boolean
  expected?: unknown
  actual?: unknown
  error?: string | null
}

/**
 * One line describing a failing test for the feedback prompt.
 *
 * Only DSA cases carry an expected/actual pair. Workspace suites and packs report
 * an assert message instead, and formatting those unconditionally produced
 * "expected undefined, got undefined" — worse than the "expected pass, got fail"
 * it replaced, because it reads as a bug to the model while hiding the real
 * signal, which is `error`.
 */
export function describeFailingTest(test: FeedbackTestResult): string {
  const label = test.description ?? "test"

  if (test.expected !== undefined || test.actual !== undefined) {
    return `${label}: expected ${JSON.stringify(test.expected)}, got ${JSON.stringify(test.actual)}`
  }
  if (test.error) {
    return `${label}: ${test.error}`
  }
  return `${label}: did not pass`
}

export interface FeedbackTestMetrics {
  validTests: FeedbackTestResult[]
  serviceErrorTests: FeedbackTestResult[]
  testsPassed: number
  testsTotal: number
  serviceErrorCount: number
}

/**
 * Tests that never actually judged the candidate's code, and so must not be scored.
 *
 * This covered only the runner being unreachable. A fault in our own test harness produces a
 * test that equally never ran, and those WERE scored: with three of five rows failing on
 * "assert.deepEqual is not a function", a candidate who had fixed the real bug was recorded
 * at 2/5. That number reaches every score floor, the feedback prompt, and, through
 * calculateMasteryScore, the spaced-repetition schedule, where it cost 36 points of mastery.
 */
export function calculateFeedbackTestMetrics(
  testResults: FeedbackTestResult[] | undefined
): FeedbackTestMetrics {
  const tests = Array.isArray(testResults) ? testResults : []
  const serviceErrorTests = tests.filter((test) => !isScoreableTest(test))
  const validTests = tests.filter(isScoreableTest)

  return {
    validTests,
    serviceErrorTests,
    testsPassed: validTests.filter((test) => test.passed === true).length,
    testsTotal: validTests.length,
    serviceErrorCount: serviceErrorTests.length,
  }
}
