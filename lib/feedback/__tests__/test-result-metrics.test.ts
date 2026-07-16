import { describe, expect, it } from "vitest"
import { calculateFeedbackTestMetrics, describeFailingTest } from "../test-result-metrics"

describe("describeFailingTest", () => {
  it("uses the real expected/actual pair for DSA cases", () => {
    expect(describeFailingTest({ description: "two sum", expected: [0, 1], actual: [1, 0] })).toBe(
      "two sum: expected [0,1], got [1,0]"
    )
  })

  it("falls back to the assert message when there is no comparison", () => {
    // Workspace suites and packs carry no expected/actual; `error` is the signal.
    expect(describeFailingTest({ description: "tests: rollup", error: "assert 2 == 1" })).toBe(
      "tests: rollup: assert 2 == 1"
    )
  })

  it("never emits 'expected undefined, got undefined'", () => {
    const line = describeFailingTest({ description: "workspace: check" })
    expect(line).not.toContain("undefined")
    expect(line).toBe("workspace: check: did not pass")
  })

  it("keeps a falsy-but-real expected value", () => {
    expect(describeFailingTest({ description: "d", expected: false, actual: true })).toBe(
      "d: expected false, got true"
    )
  })
})

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

  it("does not classify normal assertion failures as service errors", () => {
    const metrics = calculateFeedbackTestMetrics([
      {
        description: "wrong output",
        passed: false,
        error: "Expected [0,1] but received []",
        actual: "[]",
      },
    ])

    expect(metrics.testsPassed).toBe(0)
    expect(metrics.testsTotal).toBe(1)
    expect(metrics.serviceErrorCount).toBe(0)
  })

  it("keeps null actual values valid when there is no execution error", () => {
    const metrics = calculateFeedbackTestMetrics([
      {
        description: "valid null output",
        passed: true,
        actual: "null",
      },
    ])

    expect(metrics.testsPassed).toBe(1)
    expect(metrics.testsTotal).toBe(1)
    expect(metrics.serviceErrorCount).toBe(0)
  })
})
