import { describe, expect, it } from "vitest"
import { computeClaimDeadline, filedOnDate } from "../../src/domain/claim"

describe("filedOnDate", () => {
  it("computes the filed-on day in the tenant's own zone for a mid-day filing", () => {
    expect(
      filedOnDate({ createdAt: "2026-06-15T18:00:00.000Z", timeZone: "America/Chicago" })
    ).toBe("2026-06-15")
  })

  it("lands on the 1st, not the last day of the previous month, for a claim filed just after local midnight", () => {
    // America/Chicago observes CDT (UTC-5) in July. A fixed, always-winter offset of UTC-6
    // would read this same instant as 2026-06-30 23:20 - the previous month.
    expect(
      filedOnDate({ createdAt: "2026-07-01T05:20:00.000Z", timeZone: "America/Chicago" })
    ).toBe("2026-07-01")
  })

  it("adjusts correctly for a tenant in a half-hour offset zone", () => {
    // America/St_Johns observes NDT (UTC-2:30) in July - a whole-hour-offset implementation
    // (or one that rounds the half hour away) would misplace this claim by a day.
    expect(
      filedOnDate({ createdAt: "2026-07-15T02:45:00.000Z", timeZone: "America/St_Johns" })
    ).toBe("2026-07-15")
  })

  it("still works for a tenant on plain UTC", () => {
    expect(filedOnDate({ createdAt: "2026-01-15T12:00:00.000Z", timeZone: "UTC" })).toBe(
      "2026-01-15"
    )
  })

  it("computes the correct filed-on day in winter, when standard time and daylight time agree less often", () => {
    expect(
      filedOnDate({ createdAt: "2026-01-31T23:00:00.000Z", timeZone: "America/Chicago" })
    ).toBe("2026-01-31")
  })
})

describe("computeClaimDeadline", () => {
  it("lands on the correct calendar day across a spring daylight-saving transition", () => {
    // Filed 2026-02-04 23:15 America/Chicago (CST). A 30-day deadline computed by adding
    // milliseconds to the raw instant crosses 2026-03-08's spring-forward transition and comes
    // out a day later than the calendar says.
    expect(
      computeClaimDeadline({
        createdAt: "2026-02-05T05:15:00.000Z",
        timeZone: "America/Chicago",
        days: 30,
      })
    ).toBe("2026-03-06")
  })

  it("lands on the correct calendar day across a fall daylight-saving transition", () => {
    // Filed 2026-10-02 America/Chicago (CDT). A 30-day deadline crosses 2026-11-01's
    // fall-back transition.
    expect(
      computeClaimDeadline({
        createdAt: "2026-10-02T15:00:00.000Z",
        timeZone: "America/Chicago",
        days: 30,
      })
    ).toBe("2026-11-01")
  })

  it("matches pure calendar-day addition on the filed-on date", () => {
    expect(
      computeClaimDeadline({ createdAt: "2026-01-01T12:00:00.000Z", timeZone: "UTC", days: 10 })
    ).toBe("2026-01-11")
  })
})
