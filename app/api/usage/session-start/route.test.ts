import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  apiRateLimit: vi.fn(),
  verifyAuth: vi.fn(),
  recordSessionStartAdmin: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  apiRateLimit: mocks.apiRateLimit,
}))

vi.mock("@/lib/auth-helpers", () => ({
  verifyAuth: mocks.verifyAuth,
}))

vi.mock("@/lib/quota/session-start-admin", () => ({
  recordSessionStartAdmin: mocks.recordSessionStartAdmin,
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    error: mocks.loggerError,
  },
}))

function createRequest(): NextRequest {
  return {
    headers: {
      get: (name: string) => (name === "Authorization" ? "Bearer valid-token" : null),
    },
  } as unknown as NextRequest
}

// The global vitest setup stubs NextResponse.json as a plain { data, status } object.
type StubResponse = { status: number; data?: Record<string, unknown> }

describe("/api/usage/session-start", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.apiRateLimit.mockResolvedValue(null) // allowed
    mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: "user-1" })
  })

  it("records a session start for the VERIFIED user and returns the result", async () => {
    mocks.recordSessionStartAdmin.mockResolvedValue({
      success: true,
      usedPaidSession: true,
      freeOpensRemaining: 10,
      sessionsUsed: 1,
      sessionsLimit: 8,
    })
    const { POST } = await import("./route")

    const response = (await POST(createRequest())) as unknown as StubResponse

    expect(response.status).toBe(200)
    expect(response.data?.usedPaidSession).toBe(true)
    expect(response.data?.freeOpensRemaining).toBe(10)
    expect(mocks.recordSessionStartAdmin).toHaveBeenCalledWith("user-1")
  })

  it("returns 403 with the quota snapshot when the limit is reached", async () => {
    mocks.recordSessionStartAdmin.mockResolvedValue({
      success: false,
      usedPaidSession: false,
      freeOpensRemaining: 0,
      sessionsUsed: 8,
      sessionsLimit: 8,
      code: "LIMIT_REACHED",
    })
    const { POST } = await import("./route")

    const response = (await POST(createRequest())) as unknown as StubResponse

    expect(response.status).toBe(403)
    expect(response.data?.error).toBe("Session limit exceeded")
    expect(response.data?.sessionsUsed).toBe(8)
  })

  it("returns 401 for unauthenticated requests without touching quota", async () => {
    mocks.verifyAuth.mockResolvedValue({ authenticated: false })
    const { POST } = await import("./route")

    const response = (await POST(createRequest())) as unknown as StubResponse

    expect(response.status).toBe(401)
    expect(mocks.recordSessionStartAdmin).not.toHaveBeenCalled()
  })

  it("short-circuits when the rate limiter blocks the request", async () => {
    const limited = new Response(null, { status: 429 })
    mocks.apiRateLimit.mockResolvedValue(limited)
    const { POST } = await import("./route")

    const response = (await POST(createRequest())) as unknown as { status: number }

    expect(response.status).toBe(429)
    expect(mocks.verifyAuth).not.toHaveBeenCalled()
  })

  it("returns 500 and logs when the writer throws", async () => {
    mocks.recordSessionStartAdmin.mockRejectedValue(new Error("firestore down"))
    const { POST } = await import("./route")

    const response = (await POST(createRequest())) as unknown as StubResponse

    expect(response.status).toBe(500)
    expect(mocks.loggerError).toHaveBeenCalled()
  })
})
