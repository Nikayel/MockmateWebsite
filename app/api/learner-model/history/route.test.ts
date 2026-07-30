/**
 * Tests for GET /api/learner-model/history: query validation and the
 * black-box 403 (no evidence for the control condition).
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import type { NextRequest } from "next/server"

const h = vi.hoisted(() => ({
  verifyAuth: vi.fn(),
  requireTierForUser: vi.fn(),
  getFlag: vi.fn(),
  getCardEvidence: vi.fn(),
}))

vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: h.verifyAuth }))
vi.mock("@/lib/quota-enforcement", () => ({ requireTierForUser: h.requireTierForUser }))
vi.mock("@/lib/feature-flags", () => ({ getFlag: h.getFlag }))
vi.mock("@/lib/learner-model/evidence", () => ({ getCardEvidence: h.getCardEvidence }))

import { GET } from "./route"

const requestWith = (query: string) =>
  ({
    headers: { get: () => null },
    url: `http://localhost/api/learner-model/history${query}`,
  }) as unknown as NextRequest

type StubResponse = { status: number; data: Record<string, unknown> }
const asStub = (res: unknown) => res as unknown as StubResponse

beforeEach(() => {
  h.verifyAuth.mockReset()
  h.requireTierForUser.mockReset()
  h.getFlag.mockReset()
  h.getCardEvidence.mockReset()

  h.verifyAuth.mockResolvedValue({ authenticated: true, userId: "u1" })
  h.requireTierForUser.mockResolvedValue({ response: null })
  h.getFlag.mockImplementation((flag: string) => flag === "OPEN_LEARNER_MODEL")
  h.getCardEvidence.mockResolvedValue([{ event_id: "e1" }])
})

describe("GET /api/learner-model/history", () => {
  it("returns evidence for a valid problem_id", async () => {
    const res = asStub(await GET(requestWith("?problem_id=two-sum")))
    expect(h.getCardEvidence).toHaveBeenCalledWith("u1", "two-sum")
    expect(res.data.problem_id).toBe("two-sum")
    expect(res.data.evidence).toEqual([{ event_id: "e1" }])
  })

  it("400s when problem_id is missing", async () => {
    const res = await GET(requestWith(""))
    expect(res.status).toBe(400)
    expect(h.getCardEvidence).not.toHaveBeenCalled()
  })

  it("403s black-box users — the control gets no evidence", async () => {
    h.getFlag.mockReturnValue(true) // both flags on
    const res = await GET(requestWith("?problem_id=two-sum"))
    expect(res.status).toBe(403)
    expect(h.getCardEvidence).not.toHaveBeenCalled()
  })

  it("401s unauthenticated requests", async () => {
    h.verifyAuth.mockResolvedValue({ authenticated: false, error: "no" })
    const res = await GET(requestWith("?problem_id=two-sum"))
    expect(res.status).toBe(401)
  })
})
