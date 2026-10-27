import { describe, expect, it } from "vitest"
import { feedbackJobDueTime, isFeedbackJobDue } from "../job-state"

const timestamp = (value: number) => ({ toMillis: () => value })

describe("feedback job schedule", () => {
  it("claims a queued job only after its backoff expires", () => {
    expect(isFeedbackJobDue("queued", timestamp(1_000), undefined, 999)).toBe(false)
    expect(isFeedbackJobDue("queued", timestamp(1_000), undefined, 1_000)).toBe(true)
    expect(feedbackJobDueTime("queued", timestamp(1_000), undefined)).toBe(1_000)
  })

  it("reclaims inline and worker jobs after their lease expires", () => {
    for (const status of ["inline", "processing"]) {
      expect(isFeedbackJobDue(status, undefined, timestamp(2_000), 1_999)).toBe(false)
      expect(isFeedbackJobDue(status, undefined, timestamp(2_000), 2_000)).toBe(true)
    }
  })

  it("does not claim terminal or malformed jobs", () => {
    expect(isFeedbackJobDue("complete", timestamp(0), timestamp(0), 10)).toBe(false)
    expect(isFeedbackJobDue("failed", timestamp(0), timestamp(0), 10)).toBe(false)
    expect(isFeedbackJobDue("queued", undefined, undefined, 10)).toBe(false)
  })
})
