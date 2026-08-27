/**
 * Route-level tests for POST /api/sprint-labs/attempts (open). Mocks every
 * module the route imports except the real `openAttemptInputSchema` (a Zod
 * schema is safe and worth exercising for real) and the real
 * `requireTierForSprint` (its only dependency, `requireTierForUser`, is
 * mocked here) — matching app/api/sprint-labs/runs/route.test.ts's
 * established style.
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
  openSprintLabAttempt: vi.fn(),
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
  return { ...actual, openSprintLabAttempt: mocks.openSprintLabAttempt }
})

function createRequest(body: unknown): NextRequest {
  return {
    headers: { get: (name: string) => (name === "Authorization" ? "Bearer valid-token" : null) },
    json: () => Promise.resolve(body),
  } as unknown as NextRequest
}

type StubResponse = { status: number; data?: Record<string, unknown> }

const USER = "user-1"
const VALID_BODY = { runId: "run1", ticketKey: "MER-201" }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: USER })
  mocks.getFlagAsync.mockResolvedValue(true)
  mocks.apiRateLimit.mockResolvedValue(null)
  mocks.requireTierForUser.mockResolvedValue({ allowed: true })
  mocks.getSprintLabRun.mockResolvedValue(null)
})

describe("POST /api/sprint-labs/attempts", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.verifyAuth.mockResolvedValue({ authenticated: false })
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(401)
    expect(mocks.openSprintLabAttempt).not.toHaveBeenCalled()
  })

  it("returns 404 (not 403) when the flag is off — an unlaunched surface reads as absent", async () => {
    mocks.getFlagAsync.mockResolvedValue(false)
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(404)
  })

  it("is rate limited before auth even runs", async () => {
    mocks.apiRateLimit.mockResolvedValue({ status: 429, data: { error: "Too many requests" } })
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(429)
    expect(mocks.verifyAuth).not.toHaveBeenCalled()
  })

  it("returns 400 on invalid JSON", async () => {
    const { POST } = await import("./route")
    const badRequest = {
      headers: { get: () => "Bearer valid-token" },
      json: () => Promise.reject(new Error("bad json")),
    } as unknown as NextRequest
    const response = (await POST(badRequest)) as unknown as StubResponse
    expect(response.status).toBe(400)
  })

  it("returns 400 when the body fails schema validation", async () => {
    const { POST } = await import("./route")
    const response = (await POST(createRequest({ runId: "" }))) as unknown as StubResponse
    expect(response.status).toBe(400)
    expect(mocks.openSprintLabAttempt).not.toHaveBeenCalled()
  })

  it("gates on Pro when the resolved run is already at sprint >= 2", async () => {
    mocks.getSprintLabRun.mockResolvedValue({ id: "run1", currentSprint: 3, userId: USER })
    mocks.requireTierForUser.mockResolvedValue({
      allowed: false,
      response: { status: 403, data: { error: "Pro feature required" } },
    })
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(403)
    expect(mocks.openSprintLabAttempt).not.toHaveBeenCalled()
  })

  it("delegates to the service and returns its result on success", async () => {
    mocks.openSprintLabAttempt.mockResolvedValue({ attemptId: "a1", variantId: "v0-x" })
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse & {
      data: { attemptId: string }
    }
    expect(response.status).toBe(200)
    expect(mocks.openSprintLabAttempt).toHaveBeenCalledWith(USER, VALID_BODY)
  })

  it("maps a BUDGET_EXCEEDED service error to 409", async () => {
    mocks.openSprintLabAttempt.mockRejectedValue(new Error("BUDGET_EXCEEDED"))
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(409)
  })

  it("surfaces retryAfterSeconds on a COOLDOWN_ACTIVE error", async () => {
    const cooldownError = new Error("COOLDOWN_ACTIVE") as Error & { retryAfterSeconds: number }
    cooldownError.retryAfterSeconds = 42
    mocks.openSprintLabAttempt.mockRejectedValue(cooldownError)
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(409)
    expect(response.data).toEqual(expect.objectContaining({ retryAfterSeconds: 42 }))
  })

  it("maps an unrecognized error to a logged 500", async () => {
    mocks.openSprintLabAttempt.mockRejectedValue(new Error("boom"))
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(500)
    expect(mocks.loggerError).toHaveBeenCalledTimes(1)
  })

  it("maps a run-ownership error from requireOwnedActiveRun (runs.ts's OWN vocabulary, not attempts-service's) to 403, not a bare 500", async () => {
    // openSprintLabAttempt calls requireOwnedActiveRun internally, which
    // throws runs.ts's error constants — the route must recognize those too.
    mocks.openSprintLabAttempt.mockRejectedValue(new Error("UNAUTHORIZED"))
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(403)
    expect(mocks.loggerError).not.toHaveBeenCalled()
  })
})
