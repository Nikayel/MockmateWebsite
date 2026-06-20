export interface FeedbackTestResult {
  description?: string
  passed?: boolean
  actual?: unknown
  error?: string | null
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
