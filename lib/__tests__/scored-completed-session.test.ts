import { describe, expect, it } from "vitest"
import {
  isScoredCompletedSession,
  summarizeSessionFunnelCounts,
} from "../firestore-helpers"

/**
 * WCSR (weekly completed-scored-rounds) counts only rounds that were completed
 * AND scored. This matters because markSessionEvaluating() stamps completed_at
 * the moment evaluation STARTS, so pending/processing/failed rounds carry a
 * completed_at with no score. Counting completed_at alone (the old behavior)
 * inflated every "completed" metric with unscored and failed rounds.
 */
describe("isScoredCompletedSession", () => {
  it("counts a completed round whose feedback finished", () => {
    expect(
      isScoredCompletedSession({
        completed_at: "2026-07-10T00:00:00.000Z",
        feedback_status: "complete",
        performance_score: 82,
      })
    ).toBe(true)
  })

  it("excludes a round still being evaluated (completed_at set, feedback pending)", () => {
    expect(
      isScoredCompletedSession({
        completed_at: "2026-07-10T00:00:00.000Z",
        feedback_status: "pending",
      })
    ).toBe(false)
  })

  it("excludes a round whose feedback generation failed", () => {
    expect(
      isScoredCompletedSession({
        completed_at: "2026-07-10T00:00:00.000Z",
        feedback_status: "failed",
        performance_score: 40,
      })
    ).toBe(false)
  })

  it("excludes a round that never completed", () => {
    expect(
      isScoredCompletedSession({
        started_at: "2026-07-10T00:00:00.000Z",
      } as { completed_at?: unknown })
    ).toBe(false)
  })

  it("falls back to a persisted score for pre-feedback_status docs", () => {
    // Older docs predate the feedback_status field entirely.
    expect(
      isScoredCompletedSession({
        completed_at: "2026-01-01T00:00:00.000Z",
        performance_score: 71,
      })
    ).toBe(true)
  })

  it("excludes a pre-feedback_status doc that has no persisted score", () => {
    expect(
      isScoredCompletedSession({
        completed_at: "2026-01-01T00:00:00.000Z",
      })
    ).toBe(false)
  })
})

describe("summarizeSessionFunnelCounts", () => {
  it("does not let guest sessions inflate registered counts", () => {
    const counts = summarizeSessionFunnelCounts([
      // Registered, completed + scored
      {
        is_guest: false,
        completed_at: "2026-07-10T00:00:00.000Z",
        feedback_status: "complete",
        performance_score: 80,
      },
      // Registered, started only
      { completed_at: undefined },
      // Guest, completed + scored — must stay out of every registered tally
      {
        is_guest: true,
        completed_at: "2026-07-11T00:00:00.000Z",
        feedback_status: "complete",
        performance_score: 90,
      },
      // Guest, started only
      { is_guest: true },
    ])

    expect(counts.total).toBe(4)
    expect(counts.guest).toBe(2)
    expect(counts.registered).toBe(2)
    // Completed/scored totals include the guest; registered splits exclude it.
    expect(counts.completed).toBe(2)
    expect(counts.scored).toBe(2)
    expect(counts.guestCompleted).toBe(1)
    expect(counts.registeredCompleted).toBe(1)
    expect(counts.registeredScored).toBe(1)
  })

  it("treats a session with no is_guest flag as registered", () => {
    const counts = summarizeSessionFunnelCounts([
      { completed_at: "2026-07-10T00:00:00.000Z", feedback_status: "complete", performance_score: 70 },
    ])
    expect(counts.registered).toBe(1)
    expect(counts.guest).toBe(0)
    expect(counts.registeredScored).toBe(1)
  })

  it("returns zeroed counts for an empty session set", () => {
    expect(summarizeSessionFunnelCounts([])).toEqual({
      total: 0,
      completed: 0,
      scored: 0,
      guest: 0,
      guestCompleted: 0,
      registered: 0,
      registeredCompleted: 0,
      registeredScored: 0,
    })
  })
})
