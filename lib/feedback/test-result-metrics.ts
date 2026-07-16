export interface FeedbackTestResult {
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

function isServiceErrorTest(test: FeedbackTestResult): boolean {
  const error = test.error || ""

  return (
    error.includes("service is busy") ||
    error.includes("timed out") ||
    error.includes("Service unavailable") ||
    (Boolean(test.error) && test.actual === "null")
  )
}

export function calculateFeedbackTestMetrics(
  testResults: FeedbackTestResult[] | undefined
): FeedbackTestMetrics {
  const tests = Array.isArray(testResults) ? testResults : []
  const serviceErrorTests = tests.filter(isServiceErrorTest)
  const validTests = tests.filter((test) => !isServiceErrorTest(test))

  return {
    validTests,
    serviceErrorTests,
    testsPassed: validTests.filter((test) => test.passed === true).length,
    testsTotal: validTests.length,
    serviceErrorCount: serviceErrorTests.length,
  }
}
