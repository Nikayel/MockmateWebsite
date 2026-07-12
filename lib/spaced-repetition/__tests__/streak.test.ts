import { describe, expect, it } from "vitest"
import { reconcileStreak, advanceStreak } from "../streak"

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

describe("advanceStreak (DUP-4 shared write-side helper)", () => {
  it("increments on a one-day gap (consecutive calendar day)", () => {
    expect(advanceStreak(5, daysAgo(1), TZ, NOW)).toBe(6)
  })

  it("does NOT change on a same-day gap (idempotent for repeat writes)", () => {
    expect(advanceStreak(5, daysAgo(0), TZ, NOW)).toBe(5)
  })

  it("resets to 1 when more than one day was missed (gap 2)", () => {
    expect(advanceStreak(5, daysAgo(2), TZ, NOW)).toBe(1)
    expect(advanceStreak(12, daysAgo(9), TZ, NOW)).toBe(1)
  })

  it("does NOT change on a negative gap (out-of-order / clock skew, gap -1)", () => {
    // A future last-session timestamp must never silently reset a valid streak.
    expect(advanceStreak(5, daysAgo(-1), TZ, NOW)).toBe(5)
  })

  it("starts a new streak at 1 when there is no previous session", () => {
    expect(advanceStreak(0, null, TZ, NOW)).toBe(1)
    expect(advanceStreak(5, undefined, TZ, NOW)).toBe(1)
  })

  it("is idempotent when two writers fire for one session", () => {
    // First writer: last session was yesterday -> advance 5 -> 6, and it writes
    // last_session_at = now. Second writer then reads that fresh timestamp.
    const first = advanceStreak(5, daysAgo(1), TZ, NOW)
    expect(first).toBe(6)
    const second = advanceStreak(first, daysAgo(0), TZ, NOW)
    expect(second).toBe(6)
  })

  it("uses the user's timezone, not UTC, for the calendar-day gap", () => {
    // PST is UTC-8 (no DST in February). These two instants share a UTC calendar
    // day but straddle PST midnight (08:00Z), so in the user's timezone it is a
    // NEW local day and the streak must advance. A naive UTC diff would be 0.
    const last = "2026-02-15T07:00:00Z" // PST: Feb 14, 23:00
    const now = new Date("2026-02-15T09:00:00Z") // PST: Feb 15, 01:00
    expect(advanceStreak(5, last, TZ, now)).toBe(6)

    // Reverse: two instants in DIFFERENT UTC days but the SAME PST day. A naive
    // UTC diff would be 1 (increment); timezone-aware it is the same local day so
    // the streak must stay unchanged.
    const lastSame = "2026-02-14T23:00:00Z" // PST: Feb 14, 15:00
    const nowSame = new Date("2026-02-15T06:00:00Z") // PST: Feb 14, 22:00
    expect(advanceStreak(5, lastSame, TZ, nowSame)).toBe(5)
  })
})
