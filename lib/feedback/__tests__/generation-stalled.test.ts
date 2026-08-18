import { describe, it, expect } from "vitest"
import { isFeedbackGenerationStalled, FEEDBACK_STALL_THRESHOLD_MS } from "../generation-stalled"

const NOW = Date.parse("2026-08-18T12:00:00.000Z")
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString()

describe("isFeedbackGenerationStalled", () => {
  it("is false while a fresh completion is still being scored", () => {
    expect(isFeedbackGenerationStalled("processing", minutesAgo(1), NOW)).toBe(false)
    expect(isFeedbackGenerationStalled("pending", minutesAgo(4), NOW)).toBe(false)
  })

  it("is true once a completed session has sat in a non-terminal state past the threshold", () => {
    expect(isFeedbackGenerationStalled("processing", minutesAgo(6), NOW)).toBe(true)
    expect(isFeedbackGenerationStalled("pending", minutesAgo(60), NOW)).toBe(true)
    // Ruthie's exact case: completed 2026-08-16, viewed days later.
    expect(isFeedbackGenerationStalled("processing", "2026-08-16T22:18:25.114Z", NOW)).toBe(true)
  })

  it("is false for terminal or absent statuses regardless of age", () => {
    expect(isFeedbackGenerationStalled("complete", minutesAgo(60), NOW)).toBe(false)
    expect(isFeedbackGenerationStalled("failed", minutesAgo(60), NOW)).toBe(false)
    expect(isFeedbackGenerationStalled(undefined, minutesAgo(60), NOW)).toBe(false)
  })

  it("is false when the session never completed (still being taken)", () => {
    expect(isFeedbackGenerationStalled("processing", undefined, NOW)).toBe(false)
    expect(isFeedbackGenerationStalled("pending", null, NOW)).toBe(false)
  })

  it("tolerates Date objects and garbage timestamps", () => {
    expect(isFeedbackGenerationStalled("processing", new Date(NOW - 10 * 60_000), NOW)).toBe(true)
    expect(isFeedbackGenerationStalled("processing", "not-a-date", NOW)).toBe(false)
  })

  it("exposes a sane threshold", () => {
    expect(FEEDBACK_STALL_THRESHOLD_MS).toBe(5 * 60_000)
  })
})
