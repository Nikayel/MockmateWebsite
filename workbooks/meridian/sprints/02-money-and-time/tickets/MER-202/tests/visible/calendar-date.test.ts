import { describe, expect, it } from "vitest"
import { addCalendarDays } from "../../src/domain/calendar-date"
import { calendarDateFromISO } from "../../src/domain/calendar-date"
import { calendarDateInZone } from "../../src/domain/calendar-date"
import { calendarDateToISO } from "../../src/domain/calendar-date"
import { compareCalendarDates } from "../../src/domain/calendar-date"

describe("calendarDateFromISO / calendarDateToISO", () => {
  it("round-trips a calendar date through its ISO string", () => {
    expect(calendarDateFromISO("2026-03-08")).toEqual({ year: 2026, month: 3, day: 8 })
  })

  it("pads a single-digit month and day back to two digits", () => {
    expect(calendarDateToISO({ year: 2026, month: 1, day: 5 })).toBe("2026-01-05")
  })
})

describe("compareCalendarDates", () => {
  it("reports an earlier date as less than a later one", () => {
    expect(
      compareCalendarDates({
        a: { year: 2026, month: 1, day: 1 },
        b: { year: 2026, month: 1, day: 2 },
      })
    ).toBeLessThan(0)
  })

  it("reports two equal dates as equal", () => {
    expect(
      compareCalendarDates({
        a: { year: 2026, month: 6, day: 15 },
        b: { year: 2026, month: 6, day: 15 },
      })
    ).toBe(0)
  })

  it("reports a later date as greater than an earlier one", () => {
    expect(
      compareCalendarDates({
        a: { year: 2026, month: 3, day: 9 },
        b: { year: 2026, month: 3, day: 8 },
      })
    ).toBeGreaterThan(0)
  })
})

describe("addCalendarDays", () => {
  it("adds days within the same month", () => {
    expect(addCalendarDays({ date: { year: 2026, month: 1, day: 10 }, days: 5 })).toEqual({
      year: 2026,
      month: 1,
      day: 15,
    })
  })

  it("rolls over into the next month", () => {
    expect(addCalendarDays({ date: { year: 2026, month: 2, day: 6 }, days: 30 })).toEqual({
      year: 2026,
      month: 3,
      day: 8,
    })
  })

  it("rolls over into the next year", () => {
    expect(addCalendarDays({ date: { year: 2026, month: 12, day: 15 }, days: 20 })).toEqual({
      year: 2027,
      month: 1,
      day: 4,
    })
  })

  it("counts a leap-year February correctly", () => {
    expect(addCalendarDays({ date: { year: 2028, month: 1, day: 31 }, days: 29 })).toEqual({
      year: 2028,
      month: 2,
      day: 29,
    })
  })

  it("crosses a daylight-saving transition date with no change in behavior at all", () => {
    // Pure calendar arithmetic never reads a clock or a zone, so a transition landing inside
    // the window (America/Chicago springs forward on 2026-03-08) cannot perturb it.
    expect(addCalendarDays({ date: { year: 2026, month: 3, day: 1 }, days: 10 })).toEqual({
      year: 2026,
      month: 3,
      day: 11,
    })
  })
})

describe("calendarDateInZone", () => {
  it("returns the same calendar day as UTC for a tenant on UTC", () => {
    expect(calendarDateInZone("2026-06-15T10:00:00.000Z", "UTC")).toEqual({
      year: 2026,
      month: 6,
      day: 15,
    })
  })

  it("returns the correct calendar day for a tenant west of UTC near midnight", () => {
    // 2026-07-01T05:20:00Z is 2026-07-01 00:20 in America/Chicago (CDT, UTC-5 in July).
    expect(calendarDateInZone("2026-07-01T05:20:00.000Z", "America/Chicago")).toEqual({
      year: 2026,
      month: 7,
      day: 1,
    })
  })

  it("returns the correct calendar day for a tenant in a half-hour offset", () => {
    // 2026-07-15T02:45:00Z is 2026-07-15 00:15 in America/St_Johns (NDT, UTC-2:30 in July).
    expect(calendarDateInZone("2026-07-15T02:45:00.000Z", "America/St_Johns")).toEqual({
      year: 2026,
      month: 7,
      day: 15,
    })
  })
})
