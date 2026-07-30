/**
 * Tests for GET /api/learner-model: auth/tier gates, flag behavior, masking,
 * and the server-side view event.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import type { NextRequest } from "next/server"

const h = vi.hoisted(() => ({
  verifyAuth: vi.fn(),
  requireTierForUser: vi.fn(),
  getFlag: vi.fn(),
  buildLearnerModel: vi.fn(),
  maskForBlackBox: vi.fn(),
  logLearnerModelEvent: vi.fn(() => Promise.resolve()),
}))

vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: h.verifyAuth }))
vi.mock("@/lib/quota-enforcement", () => ({ requireTierForUser: h.requireTierForUser }))
vi.mock("@/lib/feature-flags", () => ({ getFlag: h.getFlag }))
vi.mock("@/lib/learner-model", () => ({
  buildLearnerModel: h.buildLearnerModel,
  maskForBlackBox: h.maskForBlackBox,
}))
vi.mock("@/lib/learner-model/events", () => ({
  logLearnerModelEvent: h.logLearnerModelEvent,
  LEARNER_MODEL_EVENTS: { MODEL_VIEWED: "olm_model_viewed" },
}))

import { GET } from "./route"

const request = { headers: { get: () => null } } as unknown as NextRequest

type StubResponse = { status: number; data: Record<string, unknown> }
const asStub = (res: unknown) => res as unknown as StubResponse

const openModel = {
  generated_at: "2026-07-29T12:00:00.000Z",
  condition: "open",
  challenges_enabled: true,
  total_cards: 3,
  concepts: [{ pattern: "graphs" }],
  systems: [],
}

beforeEach(() => {
  h.verifyAuth.mockReset()
  h.requireTierForUser.mockReset()
  h.getFlag.mockReset()
  h.buildLearnerModel.mockReset()
  h.maskForBlackBox.mockReset()
  h.logLearnerModelEvent.mockClear()

  h.verifyAuth.mockResolvedValue({ authenticated: true, userId: "u1" })
  h.requireTierForUser.mockResolvedValue({ response: null })
  h.getFlag.mockImplementation((flag: string) => flag === "OPEN_LEARNER_MODEL")
  h.buildLearnerModel.mockResolvedValue(openModel)
})

describe("GET /api/learner-model", () => {
  it("401s unauthenticated requests without building anything", async () => {
    h.verifyAuth.mockResolvedValue({ authenticated: false, error: "no token" })
    const res = await GET(request)
    expect(res.status).toBe(401)
    expect(h.buildLearnerModel).not.toHaveBeenCalled()
  })

  it("enforces the Pro tier gate", async () => {
    const gateResponse = { status: 402, data: { error: "upgrade" } }
    h.requireTierForUser.mockResolvedValue({ response: gateResponse })
    const res = await GET(request)
    expect(res).toBe(gateResponse)
    expect(h.buildLearnerModel).not.toHaveBeenCalled()
  })

  it("returns enabled:false when the kill switch is off", async () => {
    h.getFlag.mockReturnValue(false)
    const res = asStub(await GET(request))
    expect(res.data).toEqual({ enabled: false })
    expect(h.buildLearnerModel).not.toHaveBeenCalled()
  })

  it("returns the open model and logs a condition-stamped view event", async () => {
    const res = asStub(await GET(request))

    expect(res.data.enabled).toBe(true)
    expect(res.data.condition).toBe("open")
    expect(res.data.model).toBe(openModel)
    expect(h.maskForBlackBox).not.toHaveBeenCalled()

    expect(h.logLearnerModelEvent).toHaveBeenCalledWith("u1", "olm_model_viewed", "open", {
      total_cards: 3,
      concept_count: 1,
      systems_count: 0,
    })
  })

  it("masks the model for black-box users", async () => {
    h.getFlag.mockReturnValue(true) // both flags on
    const masked = { ...openModel, condition: "black_box", challenges_enabled: false }
    h.maskForBlackBox.mockReturnValue(masked)

    const res = asStub(await GET(request))

    expect(h.maskForBlackBox).toHaveBeenCalledWith(openModel)
    expect(res.data.condition).toBe("black_box")
    expect(h.logLearnerModelEvent).toHaveBeenCalledWith(
      "u1",
      "olm_model_viewed",
      "black_box",
      expect.any(Object)
    )
  })
})
