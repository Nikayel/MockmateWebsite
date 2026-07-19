import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  apiRateLimit: vi.fn(),
  verifyAuth: vi.fn(),
  mintEphemeralDeepgramKey: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  apiRateLimit: mocks.apiRateLimit,
}))

vi.mock("@/lib/auth-helpers", () => ({
  verifyAuth: mocks.verifyAuth,
}))

vi.mock("@/lib/voice/deepgram-management", () => ({
  mintEphemeralDeepgramKey: mocks.mintEphemeralDeepgramKey,
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: mocks.loggerWarn,
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

describe("/api/voice/token", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.apiRateLimit.mockResolvedValue(null) // allowed
    mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: "user-1" })
    vi.stubEnv("DEEPGRAM_API_KEY", "account-key-secret")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns the ephemeral key when minting succeeds", async () => {
    mocks.mintEphemeralDeepgramKey.mockResolvedValue("ephemeral-key")
    const { GET } = await import("./route")

    const response = (await GET(createRequest())) as unknown as StubResponse

    expect(response.status).toBe(200)
    expect(response.data?.apiKey).toBe("ephemeral-key")
    expect(mocks.mintEphemeralDeepgramKey).toHaveBeenCalledWith("account-key-secret")
  })

  it("returns 503 and NEVER the account key when minting is unavailable", async () => {
    mocks.mintEphemeralDeepgramKey.mockResolvedValue(null)
    const { GET } = await import("./route")

    const response = (await GET(createRequest())) as unknown as StubResponse

    expect(response.status).toBe(503)
    expect(response.data?.apiKey).toBeUndefined()
    expect(JSON.stringify(response.data)).not.toContain("account-key-secret")
    expect(mocks.loggerError).toHaveBeenCalled()
  })

  it("returns 503 when DEEPGRAM_API_KEY is not configured", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "")
    const { GET } = await import("./route")

    const response = await GET(createRequest())

    expect(response.status).toBe(503)
    expect(mocks.mintEphemeralDeepgramKey).not.toHaveBeenCalled()
  })

  it("returns 401 for unauthenticated requests", async () => {
    mocks.verifyAuth.mockResolvedValue({ authenticated: false })
    const { GET } = await import("./route")

    const response = await GET(createRequest())

    expect(response.status).toBe(401)
    expect(mocks.mintEphemeralDeepgramKey).not.toHaveBeenCalled()
  })

  it("short-circuits when the rate limiter blocks the request", async () => {
    const limited = new Response(null, { status: 429 })
    mocks.apiRateLimit.mockResolvedValue(limited)
    const { GET } = await import("./route")

    const response = await GET(createRequest())

    expect(response.status).toBe(429)
    expect(mocks.verifyAuth).not.toHaveBeenCalled()
  })
})
