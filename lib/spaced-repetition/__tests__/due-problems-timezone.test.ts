/**
 * EDGE-11 regression tests.
 *
 * "Due Today" must be bucketed by the user's LOCAL calendar day, not the
 * server's UTC day. An item whose next_review_at is still "today" in UTC but is
 * "tomorrow" in the user's timezone must land in `upcoming`, not `due_today`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { getEndOfDayInTimezone } from "@/lib/email/timezone"

const LA = "America/Los_Angeles"

const h = vi.hoisted(() => ({
  problems: [] as Record<string, unknown>[],
  profile: null as Record<string, unknown> | null,
  learningState: null as Record<string, unknown> | null,
}))

// Mock Firestore. The problems query ignores filters and returns h.problems, so
// the test exercises the in-memory bucketing (the thing EDGE-11 fixes).
vi.mock("@/lib/firebase-admin", () => {
  const makeQuery = () => {
    const q: {
      where: () => typeof q
      orderBy: () => typeof q
      get: () => Promise<{ docs: { data: () => Record<string, unknown> }[] }>
    } = {
      where: () => q,
      orderBy: () => q,
      get: () =>
        Promise.resolve({ docs: h.problems.map((d) => ({ data: () => d })) }),
    }
    return q
  }
  return {
    adminDb: {
      collection: (name: string) => ({
        doc: () => {
          if (name === "problem_mastery") {
            return { collection: () => makeQuery() }
          }
          if (name === "profiles") {
            return {
              get: () => Promise.resolve({ exists: !!h.profile, data: () => h.profile }),
            }
          }
          // user_learning_state
          return {
            get: () =>
              Promise.resolve({ exists: !!h.learningState, data: () => h.learningState }),
          }
        },
      }),
    },
  }
})

// Mock the algorithm router so getDueProblems does not touch real Firestore /
// FSRS math; the retention estimate is irrelevant to the bucketing assertions.
vi.mock("@/lib/spaced-repetition/algorithm-router", () => ({
  getUserAlgorithm: () => Promise.resolve("sm2"),
  reconstructState: () => ({ fsrs_state: null }),
  estimateRetentionForAlgorithm: () => 0.9,
  calculateNextReview: vi.fn(),
  createInitialState: vi.fn(),
  prepareStateForStorage: vi.fn(),
}))

import { getDueProblems } from "../scheduler"

function problem(id: string, nextReviewAt: string): Record<string, unknown> {
  return {
    problem_id: id,
    scenario_id: id,
    title: id,
    pattern: "two-pointers",
    difficulty: "medium",
    ease_factor: 2.5,
    interval_days: 1,
    review_count: 1,
    next_review_at: nextReviewAt,
    last_score: 70,
    average_score: 70,
    best_score: 70,
    scores_history: [70],
    first_seen_at: "2026-02-01T00:00:00Z",
    last_reviewed_at: "2026-02-14T00:00:00Z",
    time_spent_minutes: 10,
    hints_used_total: 0,
    mastery_level: "learning",
    confidence: 0.5,
  }
}

describe("getEndOfDayInTimezone", () => {
  it("returns the UTC instant of local end-of-day (PST = UTC-8)", () => {
    // now: Feb 14 18:00 PST (= Feb 15 02:00 UTC). Local end of day is Feb 14
    // 23:59:59.999 PST == Feb 15 07:59:59.999 UTC.
    const now = new Date("2026-02-15T02:00:00Z")
    expect(getEndOfDayInTimezone(now, LA, 0).toISOString()).toBe("2026-02-15T07:59:59.999Z")
  })

  it("advances by whole local calendar days", () => {
    const now = new Date("2026-02-15T02:00:00Z") // Feb 14 local
    // +1 local day -> end of Feb 15 PST == Feb 16 07:59:59.999 UTC.
    expect(getEndOfDayInTimezone(now, LA, 1).toISOString()).toBe("2026-02-16T07:59:59.999Z")
  })
})

describe("getDueProblems local-day bucketing (EDGE-11)", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Feb 14 18:00 PST. UTC calendar day is Feb 15; local calendar day is Feb 14.
    vi.setSystemTime(new Date("2026-02-15T02:00:00Z"))
    h.problems = []
    h.profile = { notification_preferences: { timezone: LA } }
    h.learningState = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("puts an item due tomorrow-local (but today-UTC) in upcoming, not due_today", async () => {
    // due-tomorrow-local: Feb 15 09:00 PST == Feb 15 17:00 UTC. Same UTC day as
    // now, but the NEXT local calendar day.
    const tomorrowLocal = problem("due-tomorrow-local", "2026-02-15T17:00:00Z")
    // due-later-today-local: Feb 14 22:00 PST == Feb 15 06:00 UTC. Same local day.
    const laterTodayLocal = problem("due-later-today-local", "2026-02-15T06:00:00Z")
    h.problems = [tomorrowLocal, laterTodayLocal]

    const result = await getDueProblems("u1", {
      includeUpcoming: true,
      upcomingDays: 7,
      timezone: LA,
    })

    const todayIds = result.due_today.map((d) => d.problem_id)
    const upcomingIds = result.upcoming.map((d) => d.problem_id)

    // The crux: a naive UTC bucketing would have mislabeled this as due_today.
    expect(todayIds).not.toContain("due-tomorrow-local")
    expect(upcomingIds).toContain("due-tomorrow-local")

    // Sanity: an item still due later in the local day IS due_today, and its
    // calendar days_until_review is 0 (same local day), while the tomorrow item
    // reads as 1 day out.
    expect(todayIds).toContain("due-later-today-local")
    const tomorrowItem = result.upcoming.find((d) => d.problem_id === "due-tomorrow-local")
    expect(tomorrowItem?.days_until_review).toBe(1)
  })

  it("resolves the timezone from the user's profile when not passed explicitly", async () => {
    // Same tomorrow-local item, but rely on the profile (America/Los_Angeles) so
    // the internal resolveUserTimezone path is exercised.
    h.problems = [problem("due-tomorrow-local", "2026-02-15T17:00:00Z")]

    const result = await getDueProblems("u1", { includeUpcoming: true, upcomingDays: 7 })

    expect(result.due_today.map((d) => d.problem_id)).not.toContain("due-tomorrow-local")
    expect(result.upcoming.map((d) => d.problem_id)).toContain("due-tomorrow-local")
  })
})
