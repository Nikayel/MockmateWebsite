import { describe, it, expect } from "vitest"
import { resolveAuditDateRange } from "../audit"

/**
 * The regression these tests exist for: the audit route applied the operator's
 * `endDate` as an inclusive `timestamp <= new Date("2026-08-07")`. A date-only
 * string parses to 00:00:00 UTC, so an inclusive bound at that instant matched
 * only the single midnight tick and excluded every entry from the day the
 * operator actually asked to see. An audit log that silently omits the most
 * recent day is worse than one that errors, because nothing on screen says so.
 */
describe("resolveAuditDateRange", () => {
  /** Unwrap a range that is expected to resolve, failing loudly if it did not. */
  function range(start: string | null, end: string | null) {
    const result = resolveAuditDateRange(start, end)
    if (!result.ok) {
      throw new Error(`expected a resolved range, got ${result.field}: ${result.message}`)
    }
    return result.range
  }

  it("includes the entire final day of a date-only range", () => {
    const { from, until } = range("2026-08-01", "2026-08-07")

    expect(from?.toISOString()).toBe("2026-08-01T00:00:00.000Z")
    // Exclusive upper bound at the NEXT midnight, so all of 2026-08-07 is in.
    expect(until?.toISOString()).toBe("2026-08-08T00:00:00.000Z")

    // The entry that the inclusive `<=` bound used to drop.
    const lastMomentOfFinalDay = new Date("2026-08-07T23:59:59.999Z")
    expect(lastMomentOfFinalDay.getTime()).toBeLessThan(until!.getTime())
    expect(lastMomentOfFinalDay.getTime()).toBeGreaterThanOrEqual(from!.getTime())
  })

  it("still excludes the day after the requested range", () => {
    const { until } = range("2026-08-01", "2026-08-07")

    // A half-open bound must not quietly widen the range by a day either.
    expect(new Date("2026-08-08T00:00:00.000Z").getTime()).toBeGreaterThanOrEqual(until!.getTime())
  })

  it("covers a single-day range where start and end are the same date", () => {
    const { from, until } = range("2026-08-07", "2026-08-07")

    expect(from?.toISOString()).toBe("2026-08-07T00:00:00.000Z")
    expect(until?.toISOString()).toBe("2026-08-08T00:00:00.000Z")

    const midday = new Date("2026-08-07T12:00:00.000Z")
    expect(midday.getTime()).toBeGreaterThanOrEqual(from!.getTime())
    expect(midday.getTime()).toBeLessThan(until!.getTime())
  })

  it("treats a full timestamp as the named instant, not the whole day", () => {
    const { until } = range(null, "2026-08-07T12:00:00.000Z")

    // Only far enough past the instant to keep the bound inclusive for the
    // operator while the query bound stays exclusive.
    expect(until?.toISOString()).toBe("2026-08-07T12:00:00.001Z")
  })

  it("leaves an absent bound null rather than inventing one", () => {
    expect(range(null, null)).toEqual({ from: null, until: null })
    expect(range(undefined as unknown as null, "  ")).toEqual({ from: null, until: null })
  })

  it("rejects an unparseable bound by name instead of passing an Invalid Date on", () => {
    const badStart = resolveAuditDateRange("not-a-date", null)
    expect(badStart.ok).toBe(false)
    expect(badStart.ok === false && badStart.field).toBe("startDate")

    const badEnd = resolveAuditDateRange(null, "2026-13-45")
    expect(badEnd.ok).toBe(false)
    expect(badEnd.ok === false && badEnd.field).toBe("endDate")
  })

  it("rejects an inverted range", () => {
    const inverted = resolveAuditDateRange("2026-08-07", "2026-08-01")
    expect(inverted.ok).toBe(false)
    expect(inverted.ok === false && inverted.field).toBe("range")
  })

  it("accepts a range whose start and end are the same day", () => {
    // The inverted-range guard compares against the EXCLUSIVE bound, so a
    // same-day range must not be mistaken for start-after-end.
    expect(resolveAuditDateRange("2026-08-07", "2026-08-07").ok).toBe(true)
  })
})
