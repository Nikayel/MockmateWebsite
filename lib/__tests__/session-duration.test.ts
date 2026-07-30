import { describe, it, expect } from "vitest"
import {
  clampPracticeMinutes,
  clampPracticeMinutesValue,
  clampPracticeMinutesFromSeconds,
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

/**
 * The client-timer path. `timeSpentMinutes` comes from the interview workspace's
 * elapsed timer and reaches the server as request input, then gets accumulated
 * with FieldValue.increment into lifetime totals that admin/research renders as
 * hours. It never touches started_at/completed_at, so it needs its own ceiling.
 */
describe("clampPracticeMinutesValue", () => {
  it("passes an ordinary session through unchanged", () => {
    expect(clampPracticeMinutesValue(42)).toBe(42)
  })

  it("truncates a left-open tab at the ceiling", () => {
    expect(clampPracticeMinutesValue(60 * 26)).toBe(MAX_SESSION_PRACTICE_MINUTES)
  })

  it("allows exactly the ceiling", () => {
    expect(clampPracticeMinutesValue(MAX_SESSION_PRACTICE_MINUTES)).toBe(
      MAX_SESSION_PRACTICE_MINUTES
    )
  })

  it("collapses values that would corrupt a running total", () => {
    // A negative would subtract from a lifetime total via FieldValue.increment.
    expect(clampPracticeMinutesValue(-30)).toBe(0)
    expect(clampPracticeMinutesValue(0)).toBe(0)
    expect(clampPracticeMinutesValue(Number.NaN)).toBe(0)
    expect(clampPracticeMinutesValue(Number.POSITIVE_INFINITY)).toBe(0)
  })

  it("rejects non-numbers a client could send in a JSON body", () => {
    expect(clampPracticeMinutesValue("90" as unknown)).toBe(0)
    expect(clampPracticeMinutesValue(null)).toBe(0)
    expect(clampPracticeMinutesValue(undefined)).toBe(0)
    expect(clampPracticeMinutesValue({} as unknown)).toBe(0)
  })

  it("returns whole minutes", () => {
    expect(clampPracticeMinutesValue(12.4)).toBe(12)
    expect(clampPracticeMinutesValue(12.6)).toBe(13)
  })

  it("is always finite and within [0, MAX]", () => {
    const inputs = [-1e9, -1, 0, 0.4, 1, 44, 90, 91, 1e9, Number.NaN, Number.POSITIVE_INFINITY]
    for (const input of inputs) {
      const result = clampPracticeMinutesValue(input)
      expect(Number.isFinite(result)).toBe(true)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(MAX_SESSION_PRACTICE_MINUTES)
    }
  })
})

describe("clampPracticeMinutesFromSeconds", () => {
  it("converts an elapsed timer to minutes", () => {
    expect(clampPracticeMinutesFromSeconds(1800)).toBe(30)
  })

  it("truncates an overnight timer at the ceiling", () => {
    expect(clampPracticeMinutesFromSeconds(60 * 60 * 14)).toBe(MAX_SESSION_PRACTICE_MINUTES)
  })

  it("collapses degenerate input", () => {
    expect(clampPracticeMinutesFromSeconds(-60)).toBe(0)
    expect(clampPracticeMinutesFromSeconds(Number.NaN)).toBe(0)
    expect(clampPracticeMinutesFromSeconds(undefined)).toBe(0)
  })

  it("agrees with the timestamp path for the same elapsed time", () => {
    const minutes = 37
    expect(clampPracticeMinutesFromSeconds(minutes * 60)).toBe(
      clampPracticeMinutes(START, after(minutes))
    )
  })
})
