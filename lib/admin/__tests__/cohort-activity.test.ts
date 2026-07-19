import { describe, expect, it } from "vitest"
import { cohortPeriodKey, collectLearnActivityPeriods } from "../cohort-activity"

/**
 * The "incl. Learn" retention split ORs the session activity map with the
 * Learn activity map, so the two MUST bucket into identical period keys.
 * Midday-UTC fixtures keep local-timezone runs off day boundaries.
 */

describe("cohortPeriodKey", () => {
  it("buckets weekly keys to the same week start across the week", () => {
    // 2026-07-12 is a Sunday (date-fns default week start); the 13th/15th fall in its week.
    const sunday = cohortPeriodKey(new Date("2026-07-12T12:00:00.000Z"), "weekly")
    expect(cohortPeriodKey(new Date("2026-07-13T12:00:00.000Z"), "weekly")).toBe(sunday)
    expect(cohortPeriodKey(new Date("2026-07-15T12:00:00.000Z"), "weekly")).toBe(sunday)
    // The previous week buckets differently.
    expect(cohortPeriodKey(new Date("2026-07-08T12:00:00.000Z"), "weekly")).not.toBe(sunday)
  })

  it("buckets monthly keys to yyyy-MM", () => {
    expect(cohortPeriodKey(new Date("2026-07-15T12:00:00.000Z"), "monthly")).toBe("2026-07")
    expect(cohortPeriodKey(new Date("2026-06-15T12:00:00.000Z"), "monthly")).toBe("2026-06")
  })
})

describe("collectLearnActivityPeriods", () => {
  it("collects every progress timestamp into the user's period set", () => {
    const activity = collectLearnActivityPeriods(
      [
        {
          userId: "u1",
          startedAt: "2026-07-01T12:00:00.000Z",
          updatedAt: "2026-07-15T12:00:00.000Z",
          completedAt: "2026-07-15T12:30:00.000Z",
        },
      ],
      "weekly"
    )

    const periods = activity.get("u1")
    expect(periods).toBeDefined()
    // startedAt week + updatedAt/completedAt week (same week) = 2 distinct periods.
    expect(periods!.size).toBe(2)
    expect(periods!.has(cohortPeriodKey(new Date("2026-07-01T12:00:00.000Z"), "weekly"))).toBe(true)
    expect(periods!.has(cohortPeriodKey(new Date("2026-07-15T12:00:00.000Z"), "weekly"))).toBe(true)
  })

  it("buckets identically to session activity for the same period (merge compatibility)", () => {
    const sessionStartedAt = new Date("2026-07-14T12:00:00.000Z")
    const activity = collectLearnActivityPeriods(
      [{ userId: "u1", updatedAt: "2026-07-15T12:00:00.000Z" }],
      "weekly"
    )

    // A session earlier in the same week lands in the same bucket, so the
    // route's OR merge (sessionActive || learnActive) sees one period.
    expect(activity.get("u1")!.has(cohortPeriodKey(sessionStartedAt, "weekly"))).toBe(true)
  })

  it("groups same-month timestamps into one monthly period", () => {
    const activity = collectLearnActivityPeriods(
      [
        {
          userId: "u1",
          startedAt: "2026-07-01T12:00:00.000Z",
          updatedAt: "2026-07-28T12:00:00.000Z",
        },
      ],
      "monthly"
    )

    expect(activity.get("u1")).toEqual(new Set(["2026-07"]))
  })

  it("skips docs without a userId and unparseable timestamps instead of guessing", () => {
    const activity = collectLearnActivityPeriods(
      [
        { startedAt: "2026-07-01T12:00:00.000Z" },
        { userId: "", updatedAt: "2026-07-01T12:00:00.000Z" },
        { userId: "u1", startedAt: "not-a-date", updatedAt: undefined },
      ],
      "weekly"
    )

    expect(activity.size).toBe(0)
  })

  it("handles Firestore Timestamp-like values", () => {
    const activity = collectLearnActivityPeriods(
      [
        {
          userId: "u1",
          completedAt: { toDate: () => new Date("2026-07-15T12:00:00.000Z") },
        },
      ],
      "monthly"
    )

    expect(activity.get("u1")).toEqual(new Set(["2026-07"]))
  })
})
