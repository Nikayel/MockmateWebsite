/**
 * Tests for the evidence mapper and event-id/stripping helpers of the
 * study harness.
 */

import { describe, it, expect, vi } from "vitest"

const h = vi.hoisted(() => ({
  setSpy: vi.fn(() => Promise.resolve()),
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: () => ({
      doc: () => ({ set: h.setSpy }),
    }),
  },
}))

import { mapResearchEventToEvidenceRow } from "../evidence"
import { buildLearnerModelEventId, logLearnerModelEvent } from "../events"
import type { AlgorithmResearchEvent } from "../../types"

describe("mapResearchEventToEvidenceRow", () => {
  it("maps a full research event into an evidence row", () => {
    const event = {
      id: "u1_two-sum_1",
      timestamp: "2026-07-20T10:00:00.000Z",
      score: 82,
      mastery_score: 78,
      quality_rating: 4,
      hints_used: 1,
      is_first_review: false,
      actual_retention: true,
      pre_review: {
        interval_days: 4,
        days_since_last_review: 4,
        days_overdue: 0,
        stability: 4.2,
        predicted_retention: 91,
      },
      post_review: {
        new_interval_days: 9,
        new_stability: 9.1,
        mastery_level: "reviewing",
        mastery_level_changed: false,
      },
    } as unknown as AlgorithmResearchEvent & { id: string }

    const row = mapResearchEventToEvidenceRow(event)

    expect(row).toMatchObject({
      event_id: "u1_two-sum_1",
      mastery_score: 78,
      quality_rating: 4,
      hints_used: 1,
      predicted_retention: 91,
      actual_retention: true,
      interval_before_days: 4,
      interval_after_days: 9,
      stability_before: 4.2,
      stability_after: 9.1,
      mastery_level_after: "reviewing",
    })
  })

  it("tolerates sparse legacy events (all optional fields null)", () => {
    const row = mapResearchEventToEvidenceRow({
      timestamp: "2026-07-20T10:00:00.000Z",
    } as unknown as AlgorithmResearchEvent)

    expect(row.score).toBeNull()
    expect(row.predicted_retention).toBeNull()
    expect(row.interval_before_days).toBeNull()
    expect(row.stability_after).toBeNull()
    expect(row.is_first_review).toBe(false)
  })
})

describe("event id + stripping", () => {
  it("builds deterministic ids", () => {
    expect(buildLearnerModelEventId("u1", "olm_model_viewed", 1234)).toBe(
      "u1_olm_model_viewed_1234"
    )
  })

  it("strips undefined payload values before writing", async () => {
    await logLearnerModelEvent("u1", "olm_model_viewed", "open", {
      kept: 1,
      dropped: undefined,
    })

    expect(h.setSpy).toHaveBeenCalledTimes(1)
    const written = h.setSpy.mock.calls[0][0] as unknown as {
      payload: Record<string, unknown>
      condition: string
    }
    expect(written.payload).toEqual({ kept: 1 })
    expect(written.condition).toBe("open")
  })

  it("never throws when the write fails", async () => {
    h.setSpy.mockRejectedValueOnce(new Error("firestore down"))
    await expect(logLearnerModelEvent("u1", "olm_model_viewed", "open")).resolves.toBeUndefined()
  })
})
