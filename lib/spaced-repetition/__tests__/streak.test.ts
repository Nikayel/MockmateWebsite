import { describe, expect, it } from "vitest"
import { reconcileStreak } from "../streak"

const TZ = "America/Los_Angeles"
// A fixed "now" well away from any DST transition so calendar-day math is unambiguous.
// 2026-02-15T20:00:00Z == 12:00 PST.
const NOW = new Date("2026-02-15T20:00:00Z")

/** ISO timestamp N calendar days before NOW, at the same wall-clock time (stays inside PST). */
function daysAgo(n: number): string {
  const d = new Date(NOW)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString()
}

describe("reconcileStreak (chore #4)", () => {
  it("keeps the streak when the last session was today (gap 0)", () => {
    expect(reconcileStreak(5, daysAgo(0), TZ, NOW)).toBe(5)
  })

  it("keeps the streak when the last session was yesterday (gap 1 — still alive)", () => {
    expect(reconcileStreak(5, daysAgo(1), TZ, NOW)).toBe(5)
  })

  it("breaks the streak to 0 when more than one day was missed (gap > 1)", () => {
    expect(reconcileStreak(5, daysAgo(2), TZ, NOW)).toBe(0)
    expect(reconcileStreak(12, daysAgo(10), TZ, NOW)).toBe(0)
  })

  it("returns 0 for a zero / absent stored streak", () => {
    expect(reconcileStreak(0, daysAgo(0), TZ, NOW)).toBe(0)
    expect(reconcileStreak(undefined, daysAgo(0), TZ, NOW)).toBe(0)
    expect(reconcileStreak(null, daysAgo(2), TZ, NOW)).toBe(0)
  })

  it("keeps the stored value when there is no last session recorded", () => {
    expect(reconcileStreak(3, null, TZ, NOW)).toBe(3)
    expect(reconcileStreak(3, undefined, TZ, NOW)).toBe(3)
  })
})
