import { describe, expect, it } from "vitest"
import { summarizeActivationCohort } from "../firestore-helpers"

/**
 * Activation (council-fixed definition): a user who signed up inside the
 * cohort window is ACTIVATED when their FIRST scored round — same
 * scored-complete semantics as WCSR — completed within 24h of signup.
 * The rate is the investor-quoted number, so the bucketing must be exact:
 * earliest scored round wins regardless of input order, unscored rounds
 * never count, and out-of-window signups stay out of the denominator.
 */

const WINDOW_START = new Date("2026-06-18T00:00:00.000Z")

function scoredSession(userId: string, completedAt: string) {
  return {
    user_id: userId,
    completed_at: completedAt,
    feedback_status: "complete",
    performance_score: 80,
  }
}

describe("summarizeActivationCohort", () => {
  it("activates a signup whose first scored round completed within 24h (inclusive boundary)", () => {
    const summary = summarizeActivationCohort(
      [
        { userId: "u-fast", createdAt: "2026-07-01T00:00:00.000Z" },
        { userId: "u-boundary", createdAt: "2026-07-02T00:00:00.000Z" },
      ],
      [
        scoredSession("u-fast", "2026-07-01T03:00:00.000Z"),
        // Exactly 24h after signup still counts (<=, not <).
        scoredSession("u-boundary", "2026-07-03T00:00:00.000Z"),
      ],
      { signupSince: WINDOW_START }
    )

    expect(summary).toEqual({ signups: 2, activated: 2, rate: 100 })
  })

  it("uses the EARLIEST scored round regardless of input order", () => {
    const summary = summarizeActivationCohort(
      [{ userId: "u1", createdAt: "2026-07-01T00:00:00.000Z" }],
      [
        // Later round listed first; the +2h round must still win.
        scoredSession("u1", "2026-07-05T00:00:00.000Z"),
        scoredSession("u1", "2026-07-01T02:00:00.000Z"),
      ],
      { signupSince: WINDOW_START }
    )

    expect(summary.activated).toBe(1)
  })

  it("does not activate when the first scored round is later than 24h", () => {
    const summary = summarizeActivationCohort(
      [{ userId: "u-slow", createdAt: "2026-07-01T00:00:00.000Z" }],
      [scoredSession("u-slow", "2026-07-02T06:00:00.000Z")],
      { signupSince: WINDOW_START }
    )

    expect(summary).toEqual({ signups: 1, activated: 0, rate: 0 })
  })

  it("ignores unscored rounds (pending/failed feedback) when finding the first scored round", () => {
    const summary = summarizeActivationCohort(
      [{ userId: "u1", createdAt: "2026-07-01T00:00:00.000Z" }],
      [
        // Completed_at within 24h but never scored — must not activate.
        {
          user_id: "u1",
          completed_at: "2026-07-01T01:00:00.000Z",
          feedback_status: "pending",
        },
        {
          user_id: "u1",
          completed_at: "2026-07-01T02:00:00.000Z",
          feedback_status: "failed",
          performance_score: 40,
        },
        // The actual first SCORED round lands outside the window.
        scoredSession("u1", "2026-07-03T00:00:00.000Z"),
      ],
      { signupSince: WINDOW_START }
    )

    expect(summary.activated).toBe(0)
  })

  it("counts legacy pre-feedback_status docs with a persisted score as scored", () => {
    const summary = summarizeActivationCohort(
      [{ userId: "u-legacy", createdAt: "2026-07-01T00:00:00.000Z" }],
      [
        {
          user_id: "u-legacy",
          completed_at: "2026-07-01T05:00:00.000Z",
          performance_score: 71,
        },
      ],
      { signupSince: WINDOW_START }
    )

    expect(summary.activated).toBe(1)
  })

  it("excludes signups before the window from the denominator", () => {
    const summary = summarizeActivationCohort(
      [
        { userId: "u-old", createdAt: "2026-05-01T00:00:00.000Z" },
        { userId: "u-new", createdAt: "2026-07-01T00:00:00.000Z" },
      ],
      [
        scoredSession("u-old", "2026-05-01T01:00:00.000Z"),
        scoredSession("u-new", "2026-07-01T01:00:00.000Z"),
      ],
      { signupSince: WINDOW_START }
    )

    expect(summary).toEqual({ signups: 1, activated: 1, rate: 100 })
  })

  it("keeps signups with no scored round in the denominator only", () => {
    const summary = summarizeActivationCohort(
      [
        { userId: "u-active", createdAt: "2026-07-01T00:00:00.000Z" },
        { userId: "u-lurker", createdAt: "2026-07-02T00:00:00.000Z" },
        { userId: "u-started-only", createdAt: "2026-07-03T00:00:00.000Z" },
      ],
      [
        scoredSession("u-active", "2026-07-01T01:00:00.000Z"),
        // Session without user_id must be skipped, not crash the summary.
        { completed_at: "2026-07-03T01:00:00.000Z", feedback_status: "complete" },
      ],
      { signupSince: WINDOW_START }
    )

    expect(summary).toEqual({ signups: 3, activated: 1, rate: 33.3 })
  })

  it("returns a zeroed summary when there are no signups in the window", () => {
    expect(
      summarizeActivationCohort([], [scoredSession("u1", "2026-07-01T01:00:00.000Z")], {
        signupSince: WINDOW_START,
      })
    ).toEqual({ signups: 0, activated: 0, rate: 0 })
  })

  it("handles Firestore Timestamp-like createdAt and completed_at values", () => {
    const summary = summarizeActivationCohort(
      [
        {
          userId: "u-ts",
          createdAt: { toDate: () => new Date("2026-07-01T00:00:00.000Z") },
        },
      ],
      [
        {
          user_id: "u-ts",
          completed_at: { toDate: () => new Date("2026-07-01T04:00:00.000Z") },
          feedback_status: "complete",
          performance_score: 90,
        },
      ],
      { signupSince: WINDOW_START }
    )

    expect(summary).toEqual({ signups: 1, activated: 1, rate: 100 })
  })
})
