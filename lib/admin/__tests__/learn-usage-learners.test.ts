import { describe, it, expect, vi } from "vitest"

// learn-usage-views pulls in the Firestore/Auth clients transitively; the function under
// test is pure over already-scanned rows, so the admin SDK never has to initialize.
vi.mock("@/lib/firebase-admin", () => ({ adminDb: {}, adminAuth: {} }))

import { aggregateLearnerRows } from "../learn-usage-views"
import type { LearnDailyUsage } from "@/lib/tutorials/learn-time"

function dailyRow(overrides: Partial<LearnDailyUsage>): LearnDailyUsage {
  return {
    user_id: "user-a",
    day: "2026-08-15",
    total_active_ms: 60_000,
    opens: 2,
    by_course_ms: { python: 60_000 },
    by_lesson_ms: { "py-l1-m1-lesson": 60_000 },
    ...overrides,
  }
}

describe("aggregateLearnerRows", () => {
  it("sums time, opens, and courses per user, one distinct day per row", () => {
    const rows = [
      dailyRow({ day: "2026-08-14", total_active_ms: 120_000, by_course_ms: { python: 120_000 } }),
      dailyRow({
        day: "2026-08-15",
        total_active_ms: 30_000,
        opens: 1,
        by_course_ms: { "system-design": 30_000 },
      }),
    ]

    const [learner] = aggregateLearnerRows(rows)
    expect(learner).toEqual({
      userId: "user-a",
      activeMs: 150_000,
      opens: 3,
      activeDays: 2,
      byCourseMs: { python: 120_000, "system-design": 30_000 },
      lastActiveDay: "2026-08-15",
    })
  })

  it("orders learners by active time, most first", () => {
    const rows = [
      dailyRow({ user_id: "light", total_active_ms: 10_000 }),
      dailyRow({ user_id: "heavy", total_active_ms: 500_000 }),
      dailyRow({ user_id: "medium", total_active_ms: 90_000 }),
    ]

    expect(aggregateLearnerRows(rows).map((r) => r.userId)).toEqual(["heavy", "medium", "light"])
  })

  it("tracks the latest day even when rows arrive out of order", () => {
    const rows = [
      dailyRow({ day: "2026-08-16" }),
      dailyRow({ day: "2026-08-02" }),
      dailyRow({ day: "2026-08-10" }),
    ]

    const [learner] = aggregateLearnerRows(rows)
    expect(learner.lastActiveDay).toBe("2026-08-16")
    expect(learner.activeDays).toBe(3)
  })

  it("skips rows without a user or day instead of inventing a learner", () => {
    const rows = [
      dailyRow({ user_id: "" }),
      dailyRow({ day: "" }),
      dailyRow({ user_id: "real-user" }),
    ]

    const learners = aggregateLearnerRows(rows)
    expect(learners).toHaveLength(1)
    expect(learners[0].userId).toBe("real-user")
  })

  it("treats malformed numeric fields as zero rather than poisoning totals", () => {
    const rows = [
      dailyRow({
        user_id: "user-b",
        total_active_ms: undefined as unknown as number,
        opens: undefined as unknown as number,
        by_course_ms: { python: Number.NaN, "system-design": 45_000 },
      }),
    ]

    const [learner] = aggregateLearnerRows(rows)
    expect(learner.activeMs).toBe(0)
    expect(learner.opens).toBe(0)
    expect(learner.byCourseMs).toEqual({ "system-design": 45_000 })
  })
})
