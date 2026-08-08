import { describe, it, expect } from "vitest"
import {
  MAX_TREND_DAYS,
  buildFunnelStages,
  buildFunnelTrend,
  computeCohortConversionRates,
  describeWindow,
  earliestDate,
  isWithinWindow,
  ratePercent,
  resolveTrendRange,
  selectSignupCohort,
  summarizeCohortFunnel,
  toDate,
} from "../funnel-metrics"

/**
 * The funnel used to mix windows: signups and sessions were scoped to the
 * selected range while "Subscribed" counted every pro profile ever created,
 * status-agnostic. That let "complete to subscribe" print above 100%, which is
 * the tell that the numerator was drawn from a larger population than the
 * denominator. These tests pin the single-population rule.
 */

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

describe("selectSignupCohort", () => {
  const now = new Date("2026-08-07T00:00:00.000Z")
  const startDate = new Date(now.getTime() - 30 * DAY)

  it("keeps only profiles created inside the window", () => {
    const cohort = selectSignupCohort(
      [
        { userId: "recent", createdAt: new Date(now.getTime() - 2 * DAY).toISOString() },
        { userId: "old", createdAt: new Date(now.getTime() - 90 * DAY).toISOString() },
      ],
      startDate
    )
    expect([...cohort]).toEqual(["recent"])
  })

  it("takes every profile when the window is all time", () => {
    const cohort = selectSignupCohort(
      [
        { userId: "recent", createdAt: new Date(now.getTime() - 2 * DAY).toISOString() },
        { userId: "old", createdAt: new Date(now.getTime() - 900 * DAY).toISOString() },
      ],
      null
    )
    expect(cohort.size).toBe(2)
  })

  it("drops profiles with no usable created_at instead of dating them to 1970", () => {
    const cohort = selectSignupCohort(
      [
        { userId: "undated" },
        { userId: "garbage", createdAt: "not-a-date" },
        { userId: "ok", createdAt: new Date(now.getTime() - DAY).toISOString() },
      ],
      startDate
    )
    expect([...cohort]).toEqual(["ok"])
  })

  it("accepts Firestore Timestamp objects as well as ISO strings", () => {
    const stamp = { toDate: () => new Date(now.getTime() - DAY) }
    const cohort = selectSignupCohort([{ userId: "stamped", createdAt: stamp }], startDate)
    expect(cohort.has("stamped")).toBe(true)
  })
})

describe("summarizeCohortFunnel", () => {
  it("counts people once, not sessions, at every stage", () => {
    const counts = summarizeCohortFunnel(
      ["a", "b"],
      [
        { user_id: "a", completed_at: "2026-08-01T00:00:00.000Z" },
        { user_id: "a", completed_at: "2026-08-02T00:00:00.000Z" },
        { user_id: "a" },
        { user_id: "b" },
      ],
      []
    )
    expect(counts.signups).toBe(2)
    expect(counts.startedSession).toBe(2)
    expect(counts.completedSession).toBe(1)
  })

  it("ignores sessions from users outside the cohort, including guests", () => {
    const counts = summarizeCohortFunnel(
      ["a"],
      [
        { user_id: "a", completed_at: "2026-08-01T00:00:00.000Z" },
        { user_id: "outsider", completed_at: "2026-08-01T00:00:00.000Z" },
        { completed_at: "2026-08-01T00:00:00.000Z" },
      ],
      ["a", "outsider"]
    )
    expect(counts.startedSession).toBe(1)
    expect(counts.completedSession).toBe(1)
    expect(counts.subscribed).toBe(1)
  })

  it("keeps a subscriber who never completed a round out of the nested funnel", () => {
    // This is the exact shape that used to push complete-to-subscribe over
    // 100%: a paying user with no completed round in the window.
    const counts = summarizeCohortFunnel(
      ["payer", "finisher"],
      [{ user_id: "finisher" }],
      ["payer", "finisher"]
    )
    expect(counts.completedSession).toBe(0)
    expect(counts.subscribed).toBe(0)
    expect(counts.subscribedWithoutCompletedSession).toBe(2)
  })

  it("never lets a stage exceed the stage above it", () => {
    const cohort = ["u1", "u2", "u3", "u4", "u5"]
    const counts = summarizeCohortFunnel(
      cohort,
      [
        { user_id: "u1", completed_at: "2026-08-01T00:00:00.000Z" },
        { user_id: "u2" },
        { user_id: "u3", completed_at: "2026-08-01T00:00:00.000Z" },
        { user_id: "ghost", completed_at: "2026-08-01T00:00:00.000Z" },
      ],
      ["u1", "u3", "u4", "ghost"]
    )
    expect(counts.signups).toBeGreaterThanOrEqual(counts.startedSession)
    expect(counts.startedSession).toBeGreaterThanOrEqual(counts.completedSession)
    expect(counts.completedSession).toBeGreaterThanOrEqual(counts.subscribed)
  })
})

describe("computeCohortConversionRates", () => {
  it("cannot produce a rate above 100% for any nested cohort", () => {
    // Exhaustive over a small grid of nested counts: if the summarizer keeps
    // the nesting, no ratio can break the ceiling.
    for (let signups = 0; signups <= 6; signups++) {
      for (let started = 0; started <= signups; started++) {
        for (let completed = 0; completed <= started; completed++) {
          for (let subscribed = 0; subscribed <= completed; subscribed++) {
            const rates = computeCohortConversionRates({
              signups,
              startedSession: started,
              completedSession: completed,
              subscribed,
              subscribedWithoutCompletedSession: 0,
            })
            for (const value of Object.values(rates)) {
              expect(value).toBeGreaterThanOrEqual(0)
              expect(value).toBeLessThanOrEqual(100)
            }
          }
        }
      }
    }
  })

  it("returns 0 rather than NaN or Infinity on an empty cohort", () => {
    const rates = computeCohortConversionRates({
      signups: 0,
      startedSession: 0,
      completedSession: 0,
      subscribed: 0,
      subscribedWithoutCompletedSession: 0,
    })
    expect(rates).toEqual({
      signupToSession: 0,
      sessionToComplete: 0,
      completeToSubscribe: 0,
      overallConversion: 0,
    })
  })

  it("measures overall conversion against signups, not against a modelled top stage", () => {
    const rates = computeCohortConversionRates({
      signups: 200,
      startedSession: 100,
      completedSession: 50,
      subscribed: 10,
      subscribedWithoutCompletedSession: 0,
    })
    expect(rates.signupToSession).toBe(50)
    expect(rates.sessionToComplete).toBe(50)
    expect(rates.completeToSubscribe).toBe(20)
    expect(rates.overallConversion).toBe(5)
  })
})

describe("buildFunnelStages", () => {
  it("emits four measured stages and no visits stage", () => {
    const stages = buildFunnelStages({
      signups: 10,
      startedSession: 8,
      completedSession: 5,
      subscribed: 1,
      subscribedWithoutCompletedSession: 0,
    })
    expect(stages.map((stage) => stage.name)).toEqual([
      "Signed up",
      "Started a round",
      "Completed a round",
      "Subscribed",
    ])
    expect(stages.every((stage) => !/view|visit/i.test(stage.name))).toBe(true)
    expect(stages.map((stage) => stage.value)).toEqual([10, 8, 5, 1])
  })
})

describe("ratePercent", () => {
  it("treats a zero or negative denominator as no data", () => {
    expect(ratePercent(5, 0)).toBe(0)
    expect(ratePercent(5, -1)).toBe(0)
  })
})

describe("isWithinWindow", () => {
  it("includes the boundary instant", () => {
    const start = new Date("2026-08-01T00:00:00.000Z")
    expect(isWithinWindow("2026-08-01T00:00:00.000Z", start)).toBe(true)
    expect(isWithinWindow("2026-07-31T23:59:59.000Z", start)).toBe(false)
  })
})

describe("toDate", () => {
  it("returns null for values that are not dates", () => {
    expect(toDate(null)).toBeNull()
    expect(toDate(undefined)).toBeNull()
    expect(toDate({})).toBeNull()
    expect(toDate("nonsense")).toBeNull()
  })
})

describe("describeWindow", () => {
  it("names every selectable range so a stage never renders without its scope", () => {
    expect(describeWindow("7d")).toBe("last 7 days")
    expect(describeWindow("30d")).toBe("last 30 days")
    expect(describeWindow("90d")).toBe("last 90 days")
    expect(describeWindow("all")).toBe("all time")
  })
})

describe("resolveTrendRange", () => {
  const now = new Date("2026-08-07T12:00:00.000Z")

  it("uses the selected range start when there is one", () => {
    const start = new Date(now.getTime() - 30 * DAY)
    const range = resolveTrendRange(start, new Date("2020-01-01T00:00:00.000Z"), now)
    expect(range.start).toEqual(start)
    expect(range.days).toBe(31)
    expect(range.truncated).toBe(false)
  })

  it("charts from the first event on the all-time range, not from a week ago", () => {
    // The bug: a null start date fell back to now - 7 days, so picking "All"
    // charted a week under a heading that claimed all time.
    const earliest = new Date(now.getTime() - 45 * DAY)
    const range = resolveTrendRange(null, earliest, now)
    expect(range.start).toEqual(earliest)
    expect(range.days).toBe(46)
  })

  it("caps an ancient all-time range and admits the truncation", () => {
    const range = resolveTrendRange(null, new Date("2015-01-01T00:00:00.000Z"), now)
    expect(range.days).toBe(MAX_TREND_DAYS)
    expect(range.truncated).toBe(true)
  })

  it("collapses to a single day when there is no data at all", () => {
    const range = resolveTrendRange(null, null, now)
    expect(range.days).toBe(1)
    expect(range.start).toEqual(now)
  })

  it("never returns a start in the future", () => {
    const range = resolveTrendRange(new Date(now.getTime() + 10 * DAY), null, now)
    expect(range.start.getTime()).toBeLessThanOrEqual(now.getTime())
    expect(range.days).toBe(1)
  })
})

describe("buildFunnelTrend", () => {
  const now = new Date("2026-08-07T12:00:00.000Z")
  const range = resolveTrendRange(new Date(now.getTime() - 2 * DAY), null, now)

  it("emits one point per day of the range, in order", () => {
    const points = buildFunnelTrend([], [], range)
    expect(points.map((point) => point.date)).toEqual(["2026-08-05", "2026-08-06", "2026-08-07"])
  })

  it("buckets signups, starts, and completions on their own day", () => {
    const points = buildFunnelTrend(
      ["2026-08-06T01:00:00.000Z", "2026-08-06T23:00:00.000Z"],
      [
        { started_at: "2026-08-06T02:00:00.000Z", completed_at: "2026-08-06T03:00:00.000Z" },
        { started_at: "2026-08-07T02:00:00.000Z" },
      ],
      range
    )
    expect(points[1]).toEqual({ date: "2026-08-06", signups: 2, sessions: 1, completed: 1 })
    expect(points[2]).toEqual({ date: "2026-08-07", signups: 0, sessions: 1, completed: 0 })
  })

  it("drops events outside the range instead of folding them into the edge bucket", () => {
    const points = buildFunnelTrend(
      ["2020-01-01T00:00:00.000Z"],
      [{ started_at: "2020-01-01T00:00:00.000Z", completed_at: "2020-01-01T00:00:00.000Z" }],
      range
    )
    const total = points.reduce(
      (sum, point) => sum + point.signups + point.sessions + point.completed,
      0
    )
    expect(total).toBe(0)
  })

  it("never counts a completion without its session start", () => {
    const points = buildFunnelTrend([], [{ completed_at: "2026-08-06T03:00:00.000Z" }], range)
    expect(points.every((point) => point.completed <= point.sessions)).toBe(true)
  })
})

describe("earliestDate", () => {
  it("finds the oldest parseable value and ignores the rest", () => {
    expect(
      earliestDate(["2026-08-07T00:00:00.000Z", null, "nonsense", "2024-02-01T00:00:00.000Z"])
    ).toEqual(new Date("2024-02-01T00:00:00.000Z"))
  })

  it("returns null when nothing parses", () => {
    expect(earliestDate(["nonsense", undefined])).toBeNull()
  })
})
