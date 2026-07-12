import { describe, expect, it } from "vitest"
import { calculateBillingPeriod } from "@/lib/firestore-helpers"

// EDGE-9: the anniversary billing period must ALWAYS contain the reference date.
// The old day-overflow bug (new Date(y, m, 31) overflowing into the next month)
// could produce a "current" period starting in the future that did not contain
// the reference date, so the quota lookup missed and a fresh sessions_used:0 doc
// was created — resetting the monthly cap ~4 weeks early every short month.
//
// Dates are built from explicit local components (not ISO strings) because the
// function reads signupDate.getDate() in local time; ISO parsing would make the
// test timezone-dependent.
function period(sig: [number, number, number], ref: [number, number, number]) {
  return calculateBillingPeriod({
    signupDate: new Date(sig[0], sig[1], sig[2]),
    referenceDate: new Date(ref[0], ref[1], ref[2], 12, 0, 0),
  })
}

describe("calculateAnniversaryPeriod day-overflow (EDGE-9)", () => {
  const cases: Array<{ sig: [number, number, number]; ref: [number, number, number]; note: string }> = [
    { sig: [2025, 0, 31], ref: [2025, 1, 10], note: "Jan 31 signup, Feb 10 (non-leap)" },
    { sig: [2025, 0, 31], ref: [2025, 2, 1], note: "Jan 31 signup, Mar 1" },
    { sig: [2024, 0, 31], ref: [2024, 1, 15], note: "Jan 31 signup, leap-Feb" },
    { sig: [2025, 0, 30], ref: [2025, 1, 15], note: "Jan 30 signup, Feb" },
    { sig: [2025, 0, 29], ref: [2025, 1, 28], note: "Jan 29 signup, Feb 28" },
    { sig: [2025, 2, 31], ref: [2025, 3, 15], note: "Mar 31 signup, Apr (30-day)" },
    { sig: [2025, 4, 31], ref: [2025, 5, 30], note: "May 31 signup, Jun 30" },
    { sig: [2025, 11, 31], ref: [2026, 1, 12], note: "Dec 31 signup, next-year Feb (year rollover)" },
    { sig: [2025, 0, 15], ref: [2025, 2, 20], note: "mid-month control (day <= 28)" },
  ]

  it.each(cases)("period contains the reference date: $note", ({ sig, ref }) => {
    const { periodStart, periodEnd } = period(sig, ref)
    const refTime = new Date(ref[0], ref[1], ref[2], 12, 0, 0).getTime()
    expect(periodStart.getTime()).toBeLessThanOrEqual(refTime)
    expect(periodEnd.getTime()).toBeGreaterThanOrEqual(refTime)
    expect(periodStart.getTime()).toBeLessThan(periodEnd.getTime())
  })

  it("adjacent periods abut exactly (periodEnd == next periodStart - 1ms)", () => {
    // Jan 31 signup: the Jan-anniversary period ends 1ms before the Feb one starts.
    const jan = period([2025, 0, 31], [2025, 1, 5]) // ref Feb 5 -> Jan 31..Feb 28-1ms
    const feb = period([2025, 0, 31], [2025, 2, 5]) // ref Mar 5 -> Feb 28..Mar 31-1ms
    expect(feb.periodStart.getTime()).toBe(jan.periodEnd.getTime() + 1)
  })
})
