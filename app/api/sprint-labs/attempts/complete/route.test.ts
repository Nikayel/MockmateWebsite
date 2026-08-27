/**
 * Route-level tests for POST /api/sprint-labs/attempts/complete. Same mock
 * style as ../route.test.ts: everything mocked except the real Zod schema
 * and the real `requireTierForSprint` (its dependency `requireTierForUser`
 * is mocked).
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
  completeSprintLabAttempt: vi.fn(),
}))

vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: mocks.verifyAuth }))
vi.mock("@/lib/feature-flags", () => ({ getFlagAsync: mocks.getFlagAsync }))
vi.mock("@/lib/rate-limit", () => ({ apiRateLimit: mocks.apiRateLimit }))
vi.mock("@/lib/quota-enforcement", () => ({ requireTierForUser: mocks.requireTierForUser }))
vi.mock("@/lib/logger", () => ({ logger: { error: mocks.loggerError } }))
vi.mock("@/lib/sprint-labs/runs", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/sprint-labs/runs")>("@/lib/sprint-labs/runs")
  return { ...actual, getSprintLabRun: mocks.getSprintLabRun }
})

vi.mock("@/lib/sprint-labs/grading/attempts-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/sprint-labs/grading/attempts-service")>(
    "@/lib/sprint-labs/grading/attempts-service"
  )
  return { ...actual, completeSprintLabAttempt: mocks.completeSprintLabAttempt }
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
  variantId: "v0-x",
  ioCaseOutputs: {},
  probeResults: {},
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: USER })
  mocks.getFlagAsync.mockResolvedValue(true)
  mocks.apiRateLimit.mockResolvedValue(null)
  mocks.requireTierForUser.mockResolvedValue({ allowed: true })
  mocks.getSprintLabRun.mockResolvedValue(null)
})

describe("POST /api/sprint-labs/attempts/complete", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.verifyAuth.mockResolvedValue({ authenticated: false })
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(401)
    expect(mocks.completeSprintLabAttempt).not.toHaveBeenCalled()
  })

  it("returns 404 when the flag is off", async () => {
    mocks.getFlagAsync.mockResolvedValue(false)
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(404)
  })

  it("returns 400 when the body fails schema validation", async () => {
    const { POST } = await import("./route")
    const response = (await POST(createRequest({ runId: "run1" }))) as unknown as StubResponse
    expect(response.status).toBe(400)
    expect(mocks.completeSprintLabAttempt).not.toHaveBeenCalled()
  })

  it("defaults optional fields via the real schema (thin body still validates)", async () => {
    mocks.completeSprintLabAttempt.mockResolvedValue({ attempt: {}, submissionsRemaining: 4 })
    const { POST } = await import("./route")
    const minimalBody = { runId: "run1", ticketKey: "MER-201", attemptId: "a1", variantId: "v0-x" }
    const response = (await POST(createRequest(minimalBody))) as unknown as StubResponse
    expect(response.status).toBe(200)
    expect(mocks.completeSprintLabAttempt).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({ ioCaseOutputs: {}, probeResults: {}, filesTouched: [] })
    )
  })

  it("gates on Pro when the resolved run is already at sprint >= 2", async () => {
    mocks.getSprintLabRun.mockResolvedValue({ id: "run1", currentSprint: 2, userId: USER })
    mocks.requireTierForUser.mockResolvedValue({
      allowed: false,
      response: { status: 403, data: { error: "Pro feature required" } },
    })
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(403)
    expect(mocks.completeSprintLabAttempt).not.toHaveBeenCalled()
  })

  it("delegates to the service and returns its outcome, including R11 review comments when present", async () => {
    mocks.completeSprintLabAttempt.mockResolvedValue({
      attempt: { finalized: true },
      submissionsRemaining: 4,
      reviewComments: [{ id: "c1", body: "text" }],
    })
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(200)
    expect(response.data).toEqual(
      expect.objectContaining({ reviewComments: [{ id: "c1", body: "text" }] })
    )
  })

  it("maps a STALE_ATTEMPT service error to 409", async () => {
    mocks.completeSprintLabAttempt.mockRejectedValue(new Error("STALE_ATTEMPT"))
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(409)
  })

  it("maps an unrecognized error to a logged 500", async () => {
    mocks.completeSprintLabAttempt.mockRejectedValue(new Error("boom"))
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(500)
    expect(mocks.loggerError).toHaveBeenCalledTimes(1)
  })

  it("maps a run-ownership error from requireOwnedActiveRun to 404, not a bare 500", async () => {
    mocks.completeSprintLabAttempt.mockRejectedValue(new Error("NOT_FOUND"))
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(404)
    expect(mocks.loggerError).not.toHaveBeenCalled()
  })
})
