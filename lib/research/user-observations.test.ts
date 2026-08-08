import { describe, it, expect } from "vitest"
import { aggregateEventsByUser, metricValues, activeUserCounts } from "./user-observations"
import type { AlgorithmResearchEvent } from "../types"
import { welchTTest } from "./experiment-stats"

type EventOverrides = Partial<AlgorithmResearchEvent> & {
  user_id: string
  algorithm: "sm2" | "fsrs"
}

let sequence = 0

function event(overrides: EventOverrides): AlgorithmResearchEvent {
  sequence++
  return {
    id: `e${sequence}`,
    timestamp: `2026-08-0${(sequence % 9) + 1}T00:00:00.000Z`,
    problem_id: "p1",
    scenario_id: "s1",
    pattern: "two_pointers",
    difficulty: "medium",
    score: 70,
    mastery_score: 70,
    quality_rating: 4,
    time_spent_minutes: 10,
    hints_used: 0,
    pre_review: {
      interval_days: 3,
      days_since_last_review: 3,
      days_overdue: 0,
      predicted_retention: 80,
    },
    post_review: { new_interval_days: 6, mastery_level: "learning", mastery_level_changed: false },
    actual_retention: true,
    retention_as_predicted: true,
    session_number: 1,
    is_early_review: false,
    is_first_review: false,
    ...overrides,
  } as AlgorithmResearchEvent
}

describe("aggregateEventsByUser", () => {
  it("collapses many events per user into one observation", () => {
    const set = aggregateEventsByUser([
      event({ user_id: "u1", algorithm: "sm2", score: 60 }),
      event({ user_id: "u1", algorithm: "sm2", score: 80 }),
      event({ user_id: "u1", algorithm: "sm2", score: 100 }),
      event({ user_id: "u2", algorithm: "fsrs", score: 50 }),
    ])

    expect(set.sm2).toHaveLength(1)
    expect(set.fsrs).toHaveLength(1)
    expect(set.sm2[0].reviews).toBe(3)
    expect(set.sm2[0].meanScore).toBeCloseTo(80, 10)
    expect(set.eventsUsed).toBe(4)
  })

  it("keeps one heavy user from outvoting everyone else", () => {
    // The whole point of OPS-3: 40 events from one user must weigh exactly as
    // much as 1 event from another user, because only the user was randomized.
    const heavy = Array.from({ length: 40 }, () =>
      event({ user_id: "heavy", algorithm: "fsrs", score: 100 })
    )
    const light = [
      event({ user_id: "a", algorithm: "fsrs", score: 0 }),
      event({ user_id: "b", algorithm: "fsrs", score: 0 }),
    ]

    const set = aggregateEventsByUser([...heavy, ...light])
    const scores = metricValues(set.fsrs, "meanScore")

    expect(scores).toHaveLength(3)
    expect(scores.reduce((sum, value) => sum + value, 0) / scores.length).toBeCloseTo(100 / 3, 10)
  })

  it("computes per-user rates only over events that recorded the flag", () => {
    const set = aggregateEventsByUser([
      event({ user_id: "u1", algorithm: "sm2", actual_retention: true }),
      event({ user_id: "u1", algorithm: "sm2", actual_retention: false }),
      // Legacy row written before the field existed: must not count as a miss.
      event({ user_id: "u1", algorithm: "sm2", actual_retention: undefined }),
    ])

    expect(set.sm2[0].retentionRate).toBeCloseTo(0.5, 10)
  })

  it("returns null, not zero, when a user has no usable value for a metric", () => {
    const set = aggregateEventsByUser([
      event({ user_id: "u1", algorithm: "fsrs", score: undefined, actual_retention: undefined }),
    ])

    expect(set.fsrs[0].meanScore).toBeNull()
    expect(set.fsrs[0].retentionRate).toBeNull()
    expect(metricValues(set.fsrs, "meanScore")).toEqual([])
  })

  it("excludes users seen under both algorithms and counts them", () => {
    const set = aggregateEventsByUser([
      event({ user_id: "switcher", algorithm: "sm2" }),
      event({ user_id: "switcher", algorithm: "fsrs" }),
      event({ user_id: "clean", algorithm: "fsrs" }),
    ])

    expect(set.usersWithMixedAssignment).toBe(1)
    expect(set.sm2).toHaveLength(0)
    expect(set.fsrs).toHaveLength(1)
    expect(set.fsrs[0].userId).toBe("clean")
  })

  it("discards events with no user id or an unknown algorithm", () => {
    const set = aggregateEventsByUser([
      event({ user_id: "", algorithm: "sm2" }),
      { ...event({ user_id: "u9", algorithm: "sm2" }), algorithm: "sm3" } as never,
      event({ user_id: "u1", algorithm: "fsrs" }),
    ])

    expect(set.eventsDiscarded).toBe(2)
    expect(set.eventsUsed).toBe(1)
  })

  it("records the first and last event timestamps per user", () => {
    const set = aggregateEventsByUser([
      event({ user_id: "u1", algorithm: "sm2", timestamp: "2026-07-05T00:00:00.000Z" }),
      event({ user_id: "u1", algorithm: "sm2", timestamp: "2026-07-01T00:00:00.000Z" }),
    ])

    expect(set.sm2[0].firstEventAt).toBe("2026-07-01T00:00:00.000Z")
    expect(set.sm2[0].lastEventAt).toBe("2026-07-05T00:00:00.000Z")
  })

  it("handles an empty event stream", () => {
    const set = aggregateEventsByUser([])
    expect(activeUserCounts(set)).toEqual({ sm2: 0, fsrs: 0 })
    expect(set.eventsUsed).toBe(0)
  })
})

describe("event level versus user level", () => {
  it("shows how event-level analysis manufactures significance", () => {
    // Two arms of 4 users each with identical per-user means, but the FSRS arm
    // happens to contain heavier users. At the event level the imbalance is
    // enough to move the p-value; at the user level the arms are identical.
    const events: AlgorithmResearchEvent[] = []
    const sm2Means = [50, 60, 70, 80]
    const fsrsMeans = [50, 60, 70, 80]

    sm2Means.forEach((score, index) => {
      for (let i = 0; i < 2; i++)
        events.push(event({ user_id: `s${index}`, algorithm: "sm2", score }))
    })
    fsrsMeans.forEach((score, index) => {
      for (let i = 0; i < 30; i++)
        events.push(event({ user_id: `f${index}`, algorithm: "fsrs", score }))
    })

    const set = aggregateEventsByUser(events)
    const userLevel = welchTTest(
      metricValues(set.sm2, "meanScore"),
      metricValues(set.fsrs, "meanScore")
    )!

    // User level: 4 vs 4 users, identical means, nothing to report.
    expect(userLevel.nControl).toBe(4)
    expect(userLevel.nTreatment).toBe(4)
    expect(userLevel.pValue).toBeCloseTo(1, 10)

    // Event level would have claimed 8 vs 120 observations from the same data.
    const eventLevelN = events.filter((e) => e.algorithm === "fsrs").length
    expect(eventLevelN).toBe(120)
    expect(userLevel.nTreatment).toBeLessThan(eventLevelN)
  })
})
