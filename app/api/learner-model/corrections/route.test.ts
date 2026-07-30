/**
 * Tests for GET /api/learner-model/corrections: auth, condition gating
 * (no trace for black-box — the trace IS the intervention), and mapping.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import type { NextRequest } from "next/server"

const h = vi.hoisted(() => ({
  verifyAuth: vi.fn(),
  requireTierForUser: vi.fn(),
  getFlag: vi.fn(),
  getRecentChallenges: vi.fn(),
}))

vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: h.verifyAuth }))
vi.mock("@/lib/quota-enforcement", () => ({ requireTierForUser: h.requireTierForUser }))
vi.mock("@/lib/feature-flags", () => ({ getFlag: h.getFlag }))
vi.mock("@/lib/learner-model/verification", () => ({
  getRecentChallenges: h.getRecentChallenges,
}))

import { GET } from "./route"

const request = { headers: { get: () => null } } as unknown as NextRequest
type StubResponse = { status: number; data: { corrections: Record<string, unknown>[] } }
const asStub = (res: unknown) => res as unknown as StubResponse

beforeEach(() => {
  h.verifyAuth.mockReset()
  h.requireTierForUser.mockReset()
  h.getFlag.mockReset()
  h.getRecentChallenges.mockReset()

  h.verifyAuth.mockResolvedValue({ authenticated: true, userId: "u1" })
  h.requireTierForUser.mockResolvedValue({ response: null })
  h.getFlag.mockImplementation((flag: string) => flag === "OPEN_LEARNER_MODEL")
  h.getRecentChallenges.mockResolvedValue([])
})

describe("GET /api/learner-model/corrections", () => {
  it("maps challenge docs to the banner shape", async () => {
    h.getRecentChallenges.mockResolvedValue([
      {
        id: "c1",
        problem_id: "two-sum",
        scenario_id: "two-sum",
        title: "Two Sum",
        reason: "typo",
        created_at: "2026-07-29T10:00:00.000Z",
        status: "verified",
        correction: { type: "rerate", verification_due_at: "2026-07-30T09:00:00.000Z" },
        verification: { passed: true },
      },
    ])

    const res = asStub(await GET(request))
    expect(res.data.corrections).toEqual([
      {
        id: "c1",
        problem_id: "two-sum",
        scenario_id: "two-sum",
        title: "Two Sum",
        reason: "typo",
        created_at: "2026-07-29T10:00:00.000Z",
        status: "verified",
        correction_type: "rerate",
        verification_due_at: "2026-07-30T09:00:00.000Z",
        passed: true,
      },
    ])
  })

  it("returns an empty trace for black-box users without querying", async () => {
    h.getFlag.mockReturnValue(true) // both flags on → black box
    const res = asStub(await GET(request))
    expect(res.data.corrections).toEqual([])
    expect(h.getRecentChallenges).not.toHaveBeenCalled()
  })

  it("401s unauthenticated requests", async () => {
    h.verifyAuth.mockResolvedValue({ authenticated: false, error: "no" })
    const res = await GET(request)
    expect(res.status).toBe(401)
    expect(h.getRecentChallenges).not.toHaveBeenCalled()
  })
})
