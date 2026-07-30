/**
 * Tests for POST /api/learner-model/events: the client-event whitelist
 * (server-emitted event types must not be forgeable) and gating.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import type { NextRequest } from "next/server"

const h = vi.hoisted(() => ({
  verifyAuth: vi.fn(),
  requireTierForUser: vi.fn(),
  getFlag: vi.fn(),
  logLearnerModelEvent: vi.fn(() => Promise.resolve()),
}))

vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: h.verifyAuth }))
vi.mock("@/lib/quota-enforcement", () => ({ requireTierForUser: h.requireTierForUser }))
vi.mock("@/lib/feature-flags", () => ({ getFlag: h.getFlag }))
vi.mock("@/lib/learner-model/events", () => ({
  logLearnerModelEvent: h.logLearnerModelEvent,
  CLIENT_REPORTABLE_EVENTS: ["olm_concept_expanded", "olm_card_evidence_viewed", "olm_trace_shown"],
}))

import { POST } from "./route"

const postRequest = (body: Record<string, unknown>) =>
  ({
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  }) as unknown as NextRequest

beforeEach(() => {
  h.verifyAuth.mockReset()
  h.requireTierForUser.mockReset()
  h.getFlag.mockReset()
  h.logLearnerModelEvent.mockClear()

  h.verifyAuth.mockResolvedValue({ authenticated: true, userId: "u1" })
  h.requireTierForUser.mockResolvedValue({ response: null })
  h.getFlag.mockImplementation((flag: string) => flag === "OPEN_LEARNER_MODEL")
})

describe("POST /api/learner-model/events", () => {
  it("accepts whitelisted client events and stamps user/condition server-side", async () => {
    const res = await POST(
      postRequest({ event_type: "olm_concept_expanded", payload: { pattern: "graphs" } })
    )

    expect(res.status).toBe(200)
    expect(h.logLearnerModelEvent).toHaveBeenCalledWith("u1", "olm_concept_expanded", "open", {
      pattern: "graphs",
    })
  })

  it("rejects server-emitted event types (forge attempt) with 400", async () => {
    const res = await POST(postRequest({ event_type: "olm_correction_applied" }))
    expect(res.status).toBe(400)
    expect(h.logLearnerModelEvent).not.toHaveBeenCalled()
  })

  it("rejects malformed payload values", async () => {
    const res = await POST(
      postRequest({ event_type: "olm_concept_expanded", payload: { nested: { a: 1 } } })
    )
    expect(res.status).toBe(400)
  })

  it("stamps black_box condition for control-group users", async () => {
    h.getFlag.mockReturnValue(true) // both flags on
    await POST(postRequest({ event_type: "olm_trace_shown" }))
    expect(h.logLearnerModelEvent).toHaveBeenCalledWith("u1", "olm_trace_shown", "black_box", {})
  })

  it("401s unauthenticated requests", async () => {
    h.verifyAuth.mockResolvedValue({ authenticated: false, error: "no" })
    const res = await POST(postRequest({ event_type: "olm_trace_shown" }))
    expect(res.status).toBe(401)
    expect(h.logLearnerModelEvent).not.toHaveBeenCalled()
  })
})
