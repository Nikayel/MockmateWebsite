/**
 * Tests for POST /api/learner-model/challenge: gates, black-box rejection,
 * and the record → amend → merge-correction → events sequence.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import type { NextRequest } from "next/server"

const h = vi.hoisted(() => {
  class MockChallengeError extends Error {
    constructor(
      message: string,
      public readonly status: number
    ) {
      super(message)
    }
  }
  return {
    MockChallengeError,
    verifyAuth: vi.fn(),
    requireTierForUser: vi.fn(),
    getFlag: vi.fn(),
    createChallenge: vi.fn(),
    findPendingChallenge: vi.fn(() => Promise.resolve(null)),
    updateChallengeCorrection: vi.fn(() => Promise.resolve()),
    amendForChallenge: vi.fn(),
    logLearnerModelEvent: vi.fn(() => Promise.resolve()),
  }
})

vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: h.verifyAuth }))
vi.mock("@/lib/quota-enforcement", () => ({ requireTierForUser: h.requireTierForUser }))
vi.mock("@/lib/feature-flags", () => ({ getFlag: h.getFlag }))
vi.mock("@/lib/learner-model/challenges", () => ({
  createChallenge: h.createChallenge,
  findPendingChallenge: h.findPendingChallenge,
  updateChallengeCorrection: h.updateChallengeCorrection,
  ChallengeError: h.MockChallengeError,
}))
vi.mock("@/lib/learner-model/amendment", () => ({
  amendForChallenge: h.amendForChallenge,
}))
vi.mock("@/lib/learner-model/events", () => ({
  logLearnerModelEvent: h.logLearnerModelEvent,
  LEARNER_MODEL_EVENTS: {
    CORRECTION_APPLIED: "olm_correction_applied",
    VERIFICATION_SCHEDULED: "olm_verification_scheduled",
  },
}))

import { POST } from "./route"

const postRequest = (body: Record<string, unknown>) =>
  ({
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  }) as unknown as NextRequest

type StubResponse = { status: number; data: Record<string, unknown> }
const asStub = (res: unknown) => res as unknown as StubResponse

const challenge = {
  id: "u1_two-sum_1",
  problem_id: "two-sum",
  correction: null,
  status: "pending_verification",
}
const correction = {
  type: "rerate",
  corrected_rating: 3,
  amendment_source: "event_snapshot",
  before: { stability: 1, next_review_at: "x", lapses: 1 },
  after: { stability: 8, next_review_at: "y", lapses: 0 },
  verification_due_at: "2026-07-30T09:00:00.000Z",
}

beforeEach(() => {
  h.verifyAuth.mockReset()
  h.requireTierForUser.mockReset()
  h.getFlag.mockReset()
  h.createChallenge.mockReset()
  // Default: nothing pending, so the idempotency guard falls through.
  h.findPendingChallenge.mockReset()
  h.findPendingChallenge.mockResolvedValue(null)
  h.amendForChallenge.mockReset()
  h.updateChallengeCorrection.mockClear()
  h.logLearnerModelEvent.mockClear()

  h.verifyAuth.mockResolvedValue({ authenticated: true, userId: "u1" })
  h.requireTierForUser.mockResolvedValue({ response: null })
  h.getFlag.mockImplementation((flag: string) => flag === "OPEN_LEARNER_MODEL")
  h.createChallenge.mockResolvedValue({ challenge, mastery: { problem_id: "two-sum" } })
  h.amendForChallenge.mockResolvedValue({ correction })
})

describe("POST /api/learner-model/challenge", () => {
  it("does not apply a second correction while one is still pending", async () => {
    // amendForChallenge re-rates from the card's CURRENT state and pulls a
    // verification review, so it is not idempotent. The client disables Submit in
    // flight, but a lost response sends the user round the retry path with the first
    // challenge already recorded — and double-correcting a card is exactly the kind
    // of unprincipled move this feature exists to disprove.
    h.findPendingChallenge.mockResolvedValue(challenge)

    const res = asStub(await POST(postRequest({ problem_id: "two-sum", reason: "typo" })))

    expect(res.data.already_pending).toBe(true)
    expect(res.data.challenge).toEqual(challenge)
    // The three writes that must NOT happen twice.
    expect(h.createChallenge).not.toHaveBeenCalled()
    expect(h.amendForChallenge).not.toHaveBeenCalled()
    expect(h.updateChallengeCorrection).not.toHaveBeenCalled()
  })

  it("checks for a pending challenge before recording a new one", async () => {
    // Order matters: the guard is worthless if it runs after createChallenge.
    await POST(postRequest({ problem_id: "two-sum", reason: "typo" }))
    expect(h.findPendingChallenge).toHaveBeenCalledWith("u1", "two-sum")
    expect(h.findPendingChallenge.mock.invocationCallOrder[0]).toBeLessThan(
      h.createChallenge.mock.invocationCallOrder[0]
    )
  })

  it("records, amends, merges the correction, and logs both events", async () => {
    const res = asStub(await POST(postRequest({ problem_id: "two-sum", reason: "typo" })))

    expect(h.createChallenge).toHaveBeenCalledWith(
      "u1",
      { problem_id: "two-sum", reason: "typo" },
      "open"
    )
    expect(h.amendForChallenge).toHaveBeenCalledWith(
      "u1",
      "two-sum",
      { problem_id: "two-sum" },
      "typo"
    )
    expect(h.updateChallengeCorrection).toHaveBeenCalledWith("u1_two-sum_1", correction)

    const eventTypes = h.logLearnerModelEvent.mock.calls.map((c) => c[1])
    expect(eventTypes).toEqual(["olm_correction_applied", "olm_verification_scheduled"])

    expect(res.data.success).toBe(true)
    expect((res.data.challenge as Record<string, unknown>).correction).toEqual(correction)
  })

  it("rejects invalid reasons with 400 before any writes", async () => {
    const res = await POST(postRequest({ problem_id: "two-sum", reason: "vibes" }))
    expect(res.status).toBe(400)
    expect(h.createChallenge).not.toHaveBeenCalled()
  })

  it("propagates ChallengeError statuses (black-box 403, unknown card 404)", async () => {
    h.createChallenge.mockRejectedValue(new h.MockChallengeError("nope", 403))
    const res = await POST(postRequest({ problem_id: "two-sum", reason: "typo" }))
    expect(res.status).toBe(403)
    expect(h.amendForChallenge).not.toHaveBeenCalled()
  })

  it("401s unauthenticated requests", async () => {
    h.verifyAuth.mockResolvedValue({ authenticated: false, error: "no" })
    const res = await POST(postRequest({ problem_id: "two-sum", reason: "typo" }))
    expect(res.status).toBe(401)
    expect(h.createChallenge).not.toHaveBeenCalled()
  })
})
