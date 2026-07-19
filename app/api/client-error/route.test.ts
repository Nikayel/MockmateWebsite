import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  apiRateLimit: vi.fn(),
  verifyAuth: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  apiRateLimit: mocks.apiRateLimit,
}))

vi.mock("@/lib/auth-helpers", () => ({
  verifyAuth: mocks.verifyAuth,
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    error: mocks.loggerError,
  },
}))

// The global vitest.setup.ts mock of next/server only stubs NextResponse.json,
// but this route also returns `new NextResponse(null, { status: 204 })`
// (body-less ack). Override per-file with a constructible mock.
vi.mock("next/server", () => {
  class MockNextResponse {
    private readonly body: unknown
    status: number

    constructor(body: unknown = null, init?: { status?: number }) {
      this.body = body
      this.status = init?.status ?? 200
    }

    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init)
    }

    async json() {
      return this.body
    }

    async text() {
      return this.body == null ? "" : String(this.body)
    }
  }

  class MockNextRequest {}

  return { NextResponse: MockNextResponse, NextRequest: MockNextRequest }
})

function createRequest(
  body: unknown,
  options: { authHeader?: string | null; contentLength?: string; invalidJson?: boolean } = {}
): NextRequest {
  const { authHeader = null, contentLength, invalidJson = false } = options
  return {
    headers: {
      get: (name: string) => {
        if (name === "Authorization") return authHeader
        if (name === "content-length") return contentLength ?? null
        if (name === "user-agent") return "vitest-agent"
        return null
      },
    },
    json: () =>
      invalidJson ? Promise.reject(new SyntaxError("Unexpected token")) : Promise.resolve(body),
  } as unknown as NextRequest
}

describe("/api/client-error", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.apiRateLimit.mockResolvedValue(null) // allowed
    mocks.verifyAuth.mockResolvedValue({ authenticated: false, userId: null })
  })

  it("returns 204 for a valid minimal anonymous payload and logs it", async () => {
    const { POST } = await import("./route")

    const response = await POST(createRequest({ message: "boom" }))

    expect(response.status).toBe(204)
    // Never echoes the payload back.
    expect(await response.text()).toBe("")
    expect(mocks.loggerError).toHaveBeenCalledWith(
      "[ClientError] boom",
      expect.objectContaining({ endpoint: "/api/client-error", source: "unknown" })
    )
    // No token present: auth is never attempted, report still accepted.
    expect(mocks.verifyAuth).not.toHaveBeenCalled()
  })

  it("returns 400 with a generic body when the message has the wrong type", async () => {
    const { POST } = await import("./route")

    const response = await POST(createRequest({ message: 12345, stack: ["not", "a", "string"] }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Invalid report" })
    expect(mocks.loggerError).not.toHaveBeenCalled()
  })

  it("returns 400 when the message is missing", async () => {
    const { POST } = await import("./route")

    const response = await POST(createRequest({ stack: "at somewhere" }))

    expect(response.status).toBe(400)
    expect(mocks.loggerError).not.toHaveBeenCalled()
  })

  it("returns 400 when the body is not valid JSON", async () => {
    const { POST } = await import("./route")

    const response = await POST(createRequest(undefined, { invalidJson: true }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Invalid report" })
    expect(mocks.loggerError).not.toHaveBeenCalled()
  })

  it("returns 400 for a source outside the known enum", async () => {
    const { POST } = await import("./route")

    const response = await POST(createRequest({ message: "boom", source: "made-up-source" }))

    expect(response.status).toBe(400)
    expect(mocks.loggerError).not.toHaveBeenCalled()
  })

  it("truncates over-length fields instead of rejecting them", async () => {
    const { POST } = await import("./route")

    const response = await POST(
      createRequest({
        message: "m".repeat(3000),
        stack: "s".repeat(9000),
        url: `https://example.test/${"u".repeat(600)}`,
        source: "window-error",
        componentStack: "c".repeat(9000),
      })
    )

    expect(response.status).toBe(204)
    expect(mocks.loggerError).toHaveBeenCalledTimes(1)
    const [loggedMessage, loggedContext] = mocks.loggerError.mock.calls[0]
    expect(loggedMessage).toBe(`[ClientError] ${"m".repeat(2000)}`)
    expect(loggedContext.stack).toHaveLength(8000)
    expect(loggedContext.componentStack).toHaveLength(8000)
    expect(loggedContext.url).toHaveLength(500)
    expect(loggedContext.source).toBe("window-error")
  })

  it("rejects oversized bodies via content-length before parsing", async () => {
    const { POST } = await import("./route")

    const response = await POST(
      createRequest({ message: "boom" }, { contentLength: String(1024 * 1024) })
    )

    expect(response.status).toBe(400)
    expect(mocks.loggerError).not.toHaveBeenCalled()
  })

  it("attaches userId when a valid bearer token is present", async () => {
    mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: "user-1" })
    const { POST } = await import("./route")

    const response = await POST(
      createRequest({ message: "boom", source: "react-boundary" }, { authHeader: "Bearer token" })
    )

    expect(response.status).toBe(204)
    expect(mocks.verifyAuth).toHaveBeenCalledTimes(1)
    expect(mocks.loggerError).toHaveBeenCalledWith(
      "[ClientError] boom",
      expect.objectContaining({ userId: "user-1", source: "react-boundary" })
    )
  })

  it("still accepts the report when token verification fails", async () => {
    mocks.verifyAuth.mockResolvedValue({ authenticated: false, userId: null, error: "expired" })
    const { POST } = await import("./route")

    const response = await POST(
      createRequest({ message: "boom" }, { authHeader: "Bearer stale-token" })
    )

    expect(response.status).toBe(204)
    const [, loggedContext] = mocks.loggerError.mock.calls[0]
    expect(loggedContext.userId).toBeUndefined()
  })

  it("short-circuits when the rate limiter blocks the request", async () => {
    const blocked = { status: 429 } as unknown as Awaited<ReturnType<typeof mocks.apiRateLimit>>
    mocks.apiRateLimit.mockResolvedValue(blocked)
    const { POST } = await import("./route")

    const response = await POST(createRequest({ message: "boom" }))

    expect(response).toBe(blocked)
    expect(mocks.verifyAuth).not.toHaveBeenCalled()
    expect(mocks.loggerError).not.toHaveBeenCalled()
  })
})
