import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"

vi.unmock("next/server")
const mocks = vi.hoisted(() => ({ auth: vi.fn(), limit: vi.fn(), next: vi.fn() }))
vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: mocks.auth }))
vi.mock("@/lib/rate-limiting", () => ({ enforceRateLimitPolicy: mocks.limit }))
vi.mock("@/lib/agents/recommendations/next-practice.server", () => ({
  getNextPractice: mocks.next,
}))
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }))
import { GET } from "./route"

const request = (id = "session") =>
  new NextRequest(
    `https://example.com/api/recommendations/next-practice?sessionId=${encodeURIComponent(id)}&userId=forged`
  )
beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue({ authenticated: true, userId: "owner" })
  mocks.limit.mockResolvedValue(null)
  mocks.next.mockResolvedValue({ status: "no_match" })
})

describe("GET next practice", () => {
  it("authenticates before any work and never caches the response", async () => {
    mocks.auth.mockResolvedValue({ authenticated: false })
    const response = await GET(request())
    expect(response.status).toBe(401)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    expect(mocks.next).not.toHaveBeenCalled()
    expect(mocks.limit).not.toHaveBeenCalled()
  })

  it.each(["", "a/b", "a\n", " space", "x".repeat(201)])(
    "rejects invalid session ID %j",
    async (id) => {
      const response = await GET(request(id))
      expect(response.status).toBe(400)
      expect(response.headers.get("Cache-Control")).toContain("no-store")
      expect(mocks.next).not.toHaveBeenCalled()
    }
  )

  it("uses verified identity and the shared per-user rate limit", async () => {
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: "no_match" })
    expect(mocks.next).toHaveBeenCalledWith("owner", "session")
    expect(mocks.limit).toHaveBeenCalledWith("api", "next-practice:owner")
    expect(response.headers.get("Cache-Control")).toContain("no-store")
  })

  it("preserves a rate-limit refusal without invoking the engine", async () => {
    mocks.limit.mockResolvedValue(
      NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: { "Retry-After": "30" },
        }
      )
    )
    const response = await GET(request())
    expect(response.status).toBe(429)
    expect(response.headers.get("Retry-After")).toBe("30")
    expect(response.headers.get("Cache-Control")).toContain("no-store")
    expect(mocks.next).not.toHaveBeenCalled()
  })

  it.each([
    ["not_found", 404],
    ["unavailable", 503],
    ["not_ready", 200],
  ] as const)("maps %s to %i without caching", async (status, code) => {
    mocks.next.mockResolvedValue({ status })
    const response = await GET(request())
    expect(response.status).toBe(code)
    expect(await response.json()).toEqual({ status })
    expect(response.headers.get("Cache-Control")).toContain("no-store")
  })

  it.each(["auth", "limit", "next"] as const)(
    "contains %s failures without leaking internals",
    async (stage) => {
      mocks[stage].mockRejectedValue(new Error("private database details"))
      const response = await GET(request())
      expect(response.status).toBe(503)
      expect(await response.json()).toEqual({ status: "unavailable" })
      expect(response.headers.get("Cache-Control")).toContain("no-store")
    }
  )
})
