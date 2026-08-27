/**
 * Route-level tests for POST /api/sprint-labs/attempts/review. Same mock
 * style as ../route.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  verifyAuth: vi.fn(),
  getFlagAsync: vi.fn(),
  apiRateLimit: vi.fn(),
  requireTierForUser: vi.fn(),
  loggerError: vi.fn(),
  getSprintLabRun: vi.fn(),
  reviewSprintLabAttempt: vi.fn(),
}))

vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: mocks.verifyAuth }))
vi.mock("@/lib/feature-flags", () => ({ getFlagAsync: mocks.getFlagAsync }))
vi.mock("@/lib/rate-limit", () => ({ apiRateLimit: mocks.apiRateLimit }))
vi.mock("@/lib/quota-enforcement", () => ({ requireTierForUser: mocks.requireTierForUser }))
vi.mock("@/lib/logger", () => ({ logger: { error: mocks.loggerError } }))
vi.mock("@/lib/sprint-labs/runs", () => ({ getSprintLabRun: mocks.getSprintLabRun }))

vi.mock("@/lib/sprint-labs/grading/attempts-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/sprint-labs/grading/attempts-service")>(
    "@/lib/sprint-labs/grading/attempts-service"
  )
  return { ...actual, reviewSprintLabAttempt: mocks.reviewSprintLabAttempt }
})

function createRequest(body: unknown): NextRequest {
  return {
    headers: { get: (name: string) => (name === "Authorization" ? "Bearer valid-token" : null) },
    json: () => Promise.resolve(body),
  } as unknown as NextRequest
}

type StubResponse = { status: number; data?: Record<string, unknown> }

const USER = "user-1"
const VALID_BODY = {
  runId: "run1",
  ticketKey: "MER-201",
  attemptId: "a1",
  decisions: [{ commentId: "c1", decision: "accept" }],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: USER })
  mocks.getFlagAsync.mockResolvedValue(true)
  mocks.apiRateLimit.mockResolvedValue(null)
  mocks.requireTierForUser.mockResolvedValue({ allowed: true })
  mocks.getSprintLabRun.mockResolvedValue(null)
})

describe("POST /api/sprint-labs/attempts/review", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.verifyAuth.mockResolvedValue({ authenticated: false })
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(401)
    expect(mocks.reviewSprintLabAttempt).not.toHaveBeenCalled()
  })

  it("returns 404 when the flag is off", async () => {
    mocks.getFlagAsync.mockResolvedValue(false)
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(404)
  })

  it("returns 400 when decisions is empty (schema requires at least one)", async () => {
    const { POST } = await import("./route")
    const response = (await POST(
      createRequest({ ...VALID_BODY, decisions: [] })
    )) as unknown as StubResponse
    expect(response.status).toBe(400)
    expect(mocks.reviewSprintLabAttempt).not.toHaveBeenCalled()
  })

  it("returns 400 for an invalid decision value", async () => {
    const { POST } = await import("./route")
    const response = (await POST(
      createRequest({ ...VALID_BODY, decisions: [{ commentId: "c1", decision: "maybe" }] })
    )) as unknown as StubResponse
    expect(response.status).toBe(400)
  })

  it("gates on Pro when the resolved run is already at sprint >= 2", async () => {
    mocks.getSprintLabRun.mockResolvedValue({ id: "run1", currentSprint: 4, userId: USER })
    mocks.requireTierForUser.mockResolvedValue({
      allowed: false,
      response: { status: 403, data: { error: "Pro feature required" } },
    })
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(403)
    expect(mocks.reviewSprintLabAttempt).not.toHaveBeenCalled()
  })

  it("releases correctness + referenceDiff when the service reports the attempt finalized", async () => {
    mocks.reviewSprintLabAttempt.mockResolvedValue({
      scores: { verification: 90 },
      finalized: true,
      released: { review: [{ id: "c1", correct: true }], referenceDiff: "diff --git ..." },
    })
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(200)
    expect(response.data?.released).toBeDefined()
  })

  it("omits release fields when the service reports the attempt is not finalized", async () => {
    mocks.reviewSprintLabAttempt.mockResolvedValue({
      scores: { verification: 90 },
      finalized: false,
    })
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.data?.released).toBeUndefined()
  })

  it("maps NOT_REVIEW_ONLY to 400", async () => {
    mocks.reviewSprintLabAttempt.mockRejectedValue(new Error("NOT_REVIEW_ONLY"))
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(400)
  })

  it("maps ALREADY_REVIEWED to 409", async () => {
    mocks.reviewSprintLabAttempt.mockRejectedValue(new Error("ALREADY_REVIEWED"))
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(409)
  })

  it("maps an unrecognized error to a logged 500", async () => {
    mocks.reviewSprintLabAttempt.mockRejectedValue(new Error("boom"))
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(500)
    expect(mocks.loggerError).toHaveBeenCalledTimes(1)
  })
})
