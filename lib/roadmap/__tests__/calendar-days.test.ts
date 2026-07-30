import { describe, expect, it } from "vitest"
import { calendarDaysUntil, calendarDaysRemaining } from "../calendar-days"

/**
 * The property that matters: the answer must not depend on the time of day the
 * page happens to render. The five hand-rolled copies this replaces measured from
 * the current instant, so a roadmap could tick from "3 days" to "2 days" purely
 * because the user reloaded in the evening.
 */
describe("calendarDaysUntil", () => {
  it("counts today as 0 regardless of the hour", () => {
    const target = "2026-08-01T00:00:00"
    expect(calendarDaysUntil(target, new Date(2026, 7, 1, 0, 1))).toBe(0)
    expect(calendarDaysUntil(target, new Date(2026, 7, 1, 13, 45))).toBe(0)
    expect(calendarDaysUntil(target, new Date(2026, 7, 1, 23, 59))).toBe(0)
  })

  it("is stable across the whole day for a future date", () => {
    const target = new Date(2026, 7, 10)
    const hours = [0, 6, 12, 18, 23].map((h) => calendarDaysUntil(target, new Date(2026, 7, 1, h)))
    expect(new Set(hours).size).toBe(1)
    expect(hours[0]).toBe(9)
  })

  it("ignores a time component on the target", () => {
    // The instant-based form these replace gave different answers for these two.
    const from = new Date(2026, 7, 1, 9, 0)
    expect(calendarDaysUntil(new Date(2026, 7, 3, 0, 0), from)).toBe(2)
    expect(calendarDaysUntil(new Date(2026, 7, 3, 23, 30), from)).toBe(2)
  })

  it("returns negative days for a past date so expiry can be detected", () => {
    expect(calendarDaysUntil(new Date(2026, 6, 29), new Date(2026, 7, 1))).toBe(-3)
  })

  it("returns 1 for tomorrow and -1 for yesterday", () => {
    const from = new Date(2026, 7, 1, 15, 0)
    expect(calendarDaysUntil(new Date(2026, 7, 2, 1, 0), from)).toBe(1)
    expect(calendarDaysUntil(new Date(2026, 6, 31, 23, 0), from)).toBe(-1)
  })

  it("accepts ISO strings, epoch millis and Date objects alike", () => {
    const from = new Date(2026, 7, 1)
    const target = new Date(2026, 7, 6)
    expect(calendarDaysUntil(target, from)).toBe(5)
    expect(calendarDaysUntil(target.getTime(), from)).toBe(5)
  })

  it("returns null rather than NaN for unparseable input", () => {
    expect(calendarDaysUntil("not a date")).toBeNull()
    expect(calendarDaysUntil(new Date(2026, 7, 1), "nonsense")).toBeNull()
  })

  it("does not mutate a Date passed in", () => {
    const target = new Date(2026, 7, 10, 14, 30)
    const before = target.getTime()
    calendarDaysUntil(target, new Date(2026, 7, 1))
    expect(target.getTime()).toBe(before)
  })

  it("counts whole days across a DST boundary", () => {
    // US DST spring forward 2026-03-08: that local day is 23 hours long, which is
    // exactly where a plain floor/ceil of the quotient loses a day.
    expect(calendarDaysUntil(new Date(2026, 2, 9), new Date(2026, 2, 7))).toBe(2)
    expect(calendarDaysUntil(new Date(2026, 2, 8), new Date(2026, 2, 7))).toBe(1)
  })
})

describe("calendarDaysRemaining", () => {
  it("clamps a past date to 0 instead of counting down past zero", () => {
    expect(calendarDaysRemaining(new Date(2026, 6, 20), new Date(2026, 7, 1))).toBe(0)
  })

  it("passes future dates through unchanged", () => {
    expect(calendarDaysRemaining(new Date(2026, 7, 8), new Date(2026, 7, 1))).toBe(7)
  })

  it("keeps null distinguishable from zero", () => {
    expect(calendarDaysRemaining("not a date")).toBeNull()
  })
})
