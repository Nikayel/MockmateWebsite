import { describe, expect, it } from "vitest"
import { calculateFeedbackTestMetrics } from "../test-result-metrics"

describe("calculateFeedbackTestMetrics", () => {
  it("counts only valid execution results toward pass totals", () => {
    const metrics = calculateFeedbackTestMetrics([
      { description: "passes", passed: true },
      { description: "fails", passed: false, actual: "3" },
      { description: "busy", passed: false, error: "Code execution service is busy" },
      { description: "timeout", passed: false, error: "Execution timed out" },
      { description: "unavailable", passed: false, error: "Service unavailable" },
      { description: "null actual", passed: false, error: "Worker crashed", actual: "null" },
    ])

    expect(metrics.testsPassed).toBe(1)
    expect(metrics.testsTotal).toBe(2)
    expect(metrics.serviceErrorCount).toBe(4)
    expect(metrics.validTests.map((test) => test.description)).toEqual(["passes", "fails"])
    expect(metrics.serviceErrorTests.map((test) => test.description)).toEqual([
      "busy",
      "timeout",
      "unavailable",
      "null actual",
    ])
  })

  it("treats missing test results as zero tests", () => {
    expect(calculateFeedbackTestMetrics(undefined)).toEqual({
      validTests: [],
      serviceErrorTests: [],
      testsPassed: 0,
      testsTotal: 0,
      serviceErrorCount: 0,
    })
  })
})
