/**
 * Tests for verification linking: pass/fail threshold parity with
 * actual_retention, idempotence, and event emission.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

const h = vi.hoisted(() => ({
  pendingDocs: [] as { data: Record<string, unknown>; updateSpy: ReturnType<typeof vi.fn> }[],
  eventSetSpy: vi.fn(() => Promise.resolve()),
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: (name: string) => {
      if (name === "learner_model_challenges") {
        const query = {
          where: () => query,
          get: async () => ({
            empty: h.pendingDocs.length === 0,
            docs: h.pendingDocs.map((d) => ({
              data: () => d.data,
              ref: { update: d.updateSpy },
            })),
          }),
        }
        return query
      }
      // learner_model_events
      return { doc: () => ({ set: h.eventSetSpy }) }
    },
  },
}))

import {
  resolveVerificationForReview,
  isVerificationPassed,
  VERIFICATION_PASS_THRESHOLD,
} from "../verification"

const pendingChallenge = (overrides: Record<string, unknown> = {}) => ({
  id: "u1_two-sum_1",
  user_id: "u1",
  problem_id: "two-sum",
  reason: "typo",
  condition: "open",
  status: "pending_verification",
  ...overrides,
})

beforeEach(() => {
  h.pendingDocs = []
  h.eventSetSpy.mockClear()
})

describe("isVerificationPassed", () => {
  it("uses the same >=56 bar as actual_retention", () => {
    expect(VERIFICATION_PASS_THRESHOLD).toBe(56)
    expect(isVerificationPassed(56)).toBe(true)
    expect(isVerificationPassed(55.9)).toBe(false)
  })
})

describe("resolveVerificationForReview", () => {
  it("marks pending challenges verified with the outcome and logs the event", async () => {
    const updateSpy = vi.fn(() => Promise.resolve())
    h.pendingDocs = [{ data: pendingChallenge(), updateSpy }]

    const resolved = await resolveVerificationForReview("u1", "two-sum", {
      masteryScore: 82,
      reviewedAt: "2026-07-30T10:00:00.000Z",
    })

    expect(resolved).toBe(1)
    expect(updateSpy).toHaveBeenCalledWith({
      status: "verified",
      verification: {
        reviewed_at: "2026-07-30T10:00:00.000Z",
        mastery_score: 82,
        passed: true,
        research_event_id: null,
      },
    })

    expect(h.eventSetSpy).toHaveBeenCalledTimes(1)
    const event = h.eventSetSpy.mock.calls[0][0] as unknown as {
      event_type: string
      payload: Record<string, unknown>
    }
    expect(event.event_type).toBe("olm_verification_completed")
    expect(event.payload.passed).toBe(true)
    expect(event.payload.reason).toBe("typo")
  })

  it("records a failed verification below the threshold", async () => {
    const updateSpy = vi.fn(() => Promise.resolve())
    h.pendingDocs = [{ data: pendingChallenge(), updateSpy }]

    await resolveVerificationForReview("u1", "two-sum", {
      masteryScore: 40,
      reviewedAt: "2026-07-30T10:00:00.000Z",
    })

    const payload = updateSpy.mock.calls[0][0] as unknown as {
      verification: { passed: boolean }
    }
    expect(payload.verification.passed).toBe(false)
  })

  it("is a no-op when nothing is pending (idempotent — verified docs never rematch)", async () => {
    h.pendingDocs = []
    const resolved = await resolveVerificationForReview("u1", "two-sum", {
      masteryScore: 82,
      reviewedAt: "2026-07-30T10:00:00.000Z",
    })
    expect(resolved).toBe(0)
    expect(h.eventSetSpy).not.toHaveBeenCalled()
  })
})
