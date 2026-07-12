/**
 * Regression tests for deferSingleProblem.
 *
 * Deferring is now a pure postponement, not a simulated "struggled" review:
 * - It must NOT penalize memory state (ease_factor / FSRS fields / mastery
 *   level / review_count are preserved by being omitted from the update).
 * - The new next_review_at is computed in UTC so a +N-day defer lands strictly
 *   after today's UTC day window and does not immediately re-surface as due.
 * - For FSRS, the embedded card is kept consistent with next_review_at.
 * - A missing mastery record returns false so the caller does not over-count.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

const h = vi.hoisted(() => ({
  updateSpy: vi.fn(() => Promise.resolve()),
  getSpy: vi.fn(() =>
    Promise.resolve({ exists: h.state.exists, data: () => h.state.data })
  ),
  state: { data: null as Record<string, unknown> | null, exists: true },
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: () => ({
      doc: () => ({
        collection: () => ({
          doc: () => ({
            get: h.getSpy,
            update: h.updateSpy,
          }),
        }),
      }),
    }),
  },
}))

import { deferSingleProblem } from "../scheduler"

const utcTodayWindowEnd = () => {
  const d = new Date()
  d.setUTCHours(23, 59, 59, 999)
  return d
}

describe("deferSingleProblem", () => {
  beforeEach(() => {
    h.updateSpy.mockClear()
    h.updateSpy.mockImplementation(() => Promise.resolve())
    h.getSpy.mockClear()
    h.state.exists = true
    h.state.data = {
      interval_days: 4,
      next_review_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // overdue
      review_count: 3,
      mastery_level: "learning",
      confidence: 0.7,
      ease_factor: 2.5,
      last_reviewed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      scores_history: [80, 60, 90],
    }
  })

  it("reschedules to a UTC date strictly after today's window and does not penalize (SM-2)", async () => {
    const ok = await deferSingleProblem("u1", "dsa-two-sum", "medium", 1, "sm2")
    expect(ok).toBe(true)
    expect(h.updateSpy).toHaveBeenCalledTimes(1)

    const update = h.updateSpy.mock.calls[0][0] as Record<string, unknown>
    expect(new Date(update.next_review_at as string).getTime()).toBeGreaterThan(
      utcTodayWindowEnd().getTime()
    )
    expect(update.interval_days).toBe(1)
    expect(update.last_deferred_at).toBeTypeOf("string")

    // No memory-state penalty: these fields are preserved by omission.
    expect(update).not.toHaveProperty("ease_factor")
    expect(update).not.toHaveProperty("mastery_level")
    expect(update).not.toHaveProperty("confidence")
    expect(update).not.toHaveProperty("review_count")
  })

  it("keeps the embedded FSRS card consistent with next_review_at", async () => {
    h.state.data = {
      ...(h.state.data as Record<string, unknown>),
      fsrs_difficulty: 6,
      fsrs_stability: 12,
      fsrs_lapses: 1,
      fsrs_state: JSON.stringify({
        difficulty: 6,
        stability: 12,
        state: "Review",
        reps: 3,
        lapses: 1,
        scheduledDays: 4,
        elapsedDays: 5,
      }),
    }

    const ok = await deferSingleProblem("u1", "dsa-two-sum", "medium", 2, "fsrs")
    expect(ok).toBe(true)

    const update = h.updateSpy.mock.calls[0][0] as Record<string, unknown>
    const card = JSON.parse(update.fsrs_state as string)
    expect(new Date(card.nextReview).toISOString()).toBe(update.next_review_at)
    expect(card.scheduledDays).toBe(2)
    expect(card.elapsedDays).toBe(0)
    // Memory state carried through untouched.
    expect(card.stability).toBe(12)
    expect(card.difficulty).toBe(6)
    expect(card.lapses).toBe(1)
  })

  it("returns false and does not write when no mastery record exists", async () => {
    h.state.exists = false
    const ok = await deferSingleProblem("u1", "missing-problem", "hard", 1, "fsrs")
    expect(ok).toBe(false)
    expect(h.updateSpy).not.toHaveBeenCalled()
  })

  // PERF-S5: the batch-defer path passes knownToExist for items that came from
  // the due-query snapshot, so the SM-2 fast path can skip the per-item read.
  it("SM-2 with knownToExist writes directly WITHOUT reading the doc first", async () => {
    const ok = await deferSingleProblem("u1", "dsa-two-sum", "medium", 1, "sm2", {
      knownToExist: true,
    })
    expect(ok).toBe(true)
    expect(h.getSpy).not.toHaveBeenCalled()
    expect(h.updateSpy).toHaveBeenCalledTimes(1)

    const update = h.updateSpy.mock.calls[0][0] as Record<string, unknown>
    expect(update.interval_days).toBe(1)
    expect(update.last_deferred_at).toBeTypeOf("string")
    // Still a pure postponement: no memory-state penalty.
    expect(update).not.toHaveProperty("ease_factor")
  })

  it("SM-2 knownToExist returns false when the write rejects (concurrent delete)", async () => {
    // No preceding read means a doc deleted between the due query and the write
    // surfaces as an update rejection, which must NOT be counted as deferred.
    h.updateSpy.mockRejectedValueOnce(new Error("NOT_FOUND"))
    const ok = await deferSingleProblem("u1", "dsa-two-sum", "medium", 1, "sm2", {
      knownToExist: true,
    })
    expect(ok).toBe(false)
  })

  it("FSRS still reads the doc even with knownToExist (needs the card to sync)", async () => {
    h.state.data = {
      ...(h.state.data as Record<string, unknown>),
      fsrs_difficulty: 6,
      fsrs_stability: 12,
      fsrs_lapses: 1,
      fsrs_state: JSON.stringify({
        difficulty: 6,
        stability: 12,
        state: "Review",
        reps: 3,
        lapses: 1,
        scheduledDays: 4,
        elapsedDays: 5,
      }),
    }

    const ok = await deferSingleProblem("u1", "dsa-two-sum", "medium", 2, "fsrs", {
      knownToExist: true,
    })
    expect(ok).toBe(true)
    expect(h.getSpy).toHaveBeenCalledTimes(1)

    const update = h.updateSpy.mock.calls[0][0] as Record<string, unknown>
    const card = JSON.parse(update.fsrs_state as string)
    expect(new Date(card.nextReview).toISOString()).toBe(update.next_review_at)
    expect(card.scheduledDays).toBe(2)
  })
})
