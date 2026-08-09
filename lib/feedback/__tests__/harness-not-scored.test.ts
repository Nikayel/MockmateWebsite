import { describe, expect, it } from "vitest"

import { calculateFeedbackTestMetrics } from "../test-result-metrics"

/**
 * A failure inside our own test harness must not be scored against the candidate.
 *
 * When the sandbox was missing `assert.deepEqual`, a candidate who had actually fixed the bug
 * was recorded as failing. The exclusion list here only knew about the runner being
 * unreachable, so "assert.deepEqual is not a function" counted as a genuine failed test. The
 * resulting pass rate drives every score floor, the feedback prompt, and, through
 * calculateMasteryScore, the spaced-repetition schedule.
 */

const harnessFailure = { passed: false, error: "assert.deepEqual is not a function" }
const realFailure = { passed: false, error: "Expected deep equality, got [0,2] vs []" }
const pass = { passed: true, error: null }

describe("harness failures are not scored", () => {
  it("excludes them from the tally instead of counting them as failures", () => {
    const metrics = calculateFeedbackTestMetrics([pass, pass, harnessFailure, harnessFailure])

    // What shipped: 2 passed of 4, a 50% pass rate for a candidate whose code was correct.
    expect(metrics.testsPassed).toBe(2)
    expect(metrics.testsTotal).toBe(2)
    expect(metrics.serviceErrorCount).toBe(2)
  })

  it("still counts a genuine wrong answer against them", () => {
    // The exclusion must be narrow. An assertion that ran and failed is the candidate's.
    const metrics = calculateFeedbackTestMetrics([pass, realFailure])

    expect(metrics.testsPassed).toBe(1)
    expect(metrics.testsTotal).toBe(2)
    expect(metrics.serviceErrorCount).toBe(0)
  })

  it("reports nothing scoreable when the harness broke every test", () => {
    // Zero of zero, not zero of five. A caller can then tell "not assessed" from "failed".
    const metrics = calculateFeedbackTestMetrics([harnessFailure, harnessFailure, harnessFailure])

    expect(metrics.testsTotal).toBe(0)
    expect(metrics.testsPassed).toBe(0)
  })

  it("keeps excluding an unreachable runner, which is what it already did", () => {
    const metrics = calculateFeedbackTestMetrics([
      pass,
      { passed: false, error: "The service is busy, please try again" },
    ])

    expect(metrics.testsTotal).toBe(1)
    expect(metrics.serviceErrorCount).toBe(1)
  })
})
