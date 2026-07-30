import { describe, it, expect } from "vitest"
import {
  clampPracticeMinutes,
  isTruncatedDuration,
  MAX_SESSION_PRACTICE_MINUTES,
} from "../session-duration"

const START = "2026-07-29T10:00:00.000Z"
/** `START` plus `minutes`, as an ISO string. */
const after = (minutes: number) => new Date(Date.parse(START) + minutes * 60_000).toISOString()

describe("clampPracticeMinutes", () => {
  it("returns the real duration for an ordinary session", () => {
    expect(clampPracticeMinutes(START, after(37))).toBe(37)
  })

  it("rounds to the nearest minute", () => {
    expect(clampPracticeMinutes(START, after(12.4))).toBe(12)
    expect(clampPracticeMinutes(START, after(12.6))).toBe(13)
  })

  it("counts a session that lands exactly on the ceiling", () => {
    expect(clampPracticeMinutes(START, after(MAX_SESSION_PRACTICE_MINUTES))).toBe(
      MAX_SESSION_PRACTICE_MINUTES
    )
  })

  // The bug this module exists for: a workspace left open overnight or resumed from
  // autosave days later used to book its entire idle gap as practice time.
  it("truncates a tab left open overnight", () => {
    expect(clampPracticeMinutes(START, after(16 * 60))).toBe(MAX_SESSION_PRACTICE_MINUTES)
  })

  it("truncates a session finished a week later", () => {
    expect(clampPracticeMinutes(START, after(7 * 24 * 60))).toBe(MAX_SESSION_PRACTICE_MINUTES)
  })

  it("bounds a whole inflated history to a believable total", () => {
    // 40 sessions each spanning ~3 days used to sum past 2,800 hours.
    const sessions = Array.from({ length: 40 }, () =>
      clampPracticeMinutes(START, after(3 * 24 * 60))
    )
    const totalHours = sessions.reduce((a, b) => a + b, 0) / 60
    expect(totalHours).toBe((40 * MAX_SESSION_PRACTICE_MINUTES) / 60)
    expect(totalHours).toBeLessThan(100)
  })

  // Clock skew between a client-stamped start and a server-stamped completion used to
  // produce a negative that silently subtracted from the user's lifetime total.
  it("returns 0 when completion precedes start", () => {
    expect(clampPracticeMinutes(after(30), START)).toBe(0)
  })

  it("returns 0 for a zero-length session", () => {
    expect(clampPracticeMinutes(START, START)).toBe(0)
  })

  it.each([
    ["both missing", null, null],
    ["missing start", null, after(30)],
    ["missing completion", START, null],
    ["undefined completion", START, undefined],
    ["unparseable start", "not-a-date", after(30)],
    ["unparseable completion", START, "not-a-date"],
    ["empty string", "", after(30)],
  ])("returns 0 when %s", (_label, start, end) => {
    expect(clampPracticeMinutes(start, end)).toBe(0)
  })

  it("accepts Date objects and epoch milliseconds", () => {
    expect(clampPracticeMinutes(new Date(START), new Date(after(20)))).toBe(20)
    expect(clampPracticeMinutes(Date.parse(START), Date.parse(after(20)))).toBe(20)
  })

  it("never returns a negative or non-finite value", () => {
    const inputs = [null, undefined, "", "x", START, after(-500), after(99999), 0, NaN]
    for (const start of inputs) {
      for (const end of inputs) {
        const result = clampPracticeMinutes(start as never, end as never)
        expect(Number.isFinite(result)).toBe(true)
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThanOrEqual(MAX_SESSION_PRACTICE_MINUTES)
      }
    }
  })
})

describe("isTruncatedDuration", () => {
  it("is false for a session inside the ceiling", () => {
    expect(isTruncatedDuration(START, after(45))).toBe(false)
  })

  it("is false exactly at the ceiling", () => {
    expect(isTruncatedDuration(START, after(MAX_SESSION_PRACTICE_MINUTES))).toBe(false)
  })

  it("is true one minute past the ceiling", () => {
    expect(isTruncatedDuration(START, after(MAX_SESSION_PRACTICE_MINUTES + 1))).toBe(true)
  })

  it("is false for degenerate input, so no '+' is shown on an unknown duration", () => {
    expect(isTruncatedDuration(null, after(30))).toBe(false)
    expect(isTruncatedDuration(after(30), START)).toBe(false)
  })
})
