/**
 * Regression test: updateUserProblemMastery must not clobber scheduler-owned
 * fields on spaced-repetition docs.
 *
 * Background: this writer runs on every session completion (both DSA and SD)
 * against the same problem_mastery docs the SR schedulers write. It used to
 * overwrite mastery_level with its own score heuristic and re-increment
 * review_count, racing the scheduler. The ownership rule under test:
 * docs with scheduling state (next_review_at) keep the scheduler's
 * mastery_level/review_count; docs the SR system never touched still get the
 * heuristic values.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

const h = vi.hoisted(() => ({
  txGet: vi.fn(),
  txSet: vi.fn(),
  txUpdate: vi.fn(),
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: () => ({
      doc: () => ({
        collection: () => ({
          doc: () => ({ id: "mastery-ref" }),
        }),
      }),
    }),
    runTransaction: (fn: (t: unknown) => Promise<unknown>) =>
      fn({ get: h.txGet, set: h.txSet, update: h.txUpdate }),
  },
}))

import { updateUserProblemMastery } from "../session-metrics"
import type { SessionSummary } from "../session-metrics"

const summary = {
  userId: "u1",
  scenarioId: "two-sum",
  pattern: "arrays-hashing",
  difficulty: "medium",
  performanceScore: 90,
  completedAt: "2026-07-29T12:00:00.000Z",
} as unknown as SessionSummary

beforeEach(() => {
  h.txGet.mockReset()
  h.txSet.mockClear()
  h.txUpdate.mockClear()
})

describe("updateUserProblemMastery scheduler-field ownership", () => {
  it("does NOT write mastery_level/review_count on scheduler-owned docs", async () => {
    h.txGet.mockResolvedValue({
      exists: true,
      data: () => ({
        next_review_at: "2026-08-05T09:00:00.000Z", // scheduler state present
        mastery_level: "reviewing",
        review_count: 7,
        total_score: 400,
        best_score: 85,
      }),
    })

    await updateUserProblemMastery(summary)

    expect(h.txUpdate).toHaveBeenCalledTimes(1)
    const payload = h.txUpdate.mock.calls[0][1] as Record<string, unknown>
    expect(payload).not.toHaveProperty("mastery_level")
    expect(payload).not.toHaveProperty("review_count")
    // Its own aggregates still update.
    expect(payload.last_score).toBe(90)
    expect(payload.best_score).toBe(90)
    expect(payload.total_score).toBe(490)
  })

  it("still writes the heuristic fields on docs the SR system never scheduled", async () => {
    h.txGet.mockResolvedValue({
      exists: true,
      data: () => ({
        // no next_review_at — pure session-metrics record
        review_count: 2,
        total_score: 150,
        best_score: 80,
      }),
    })

    await updateUserProblemMastery(summary)

    const payload = h.txUpdate.mock.calls[0][1] as Record<string, unknown>
    expect(payload.review_count).toBe(3)
    expect(payload).toHaveProperty("mastery_level")
  })

  it("create path is unchanged (SR initializer takes over later)", async () => {
    h.txGet.mockResolvedValue({ exists: false, data: () => null })

    await updateUserProblemMastery(summary)

    expect(h.txSet).toHaveBeenCalledTimes(1)
    const payload = h.txSet.mock.calls[0][1] as Record<string, unknown>
    expect(payload.review_count).toBe(1)
    expect(payload).toHaveProperty("mastery_level")
  })
})
