import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  verifyAuth: vi.fn(),
  getAccountOverview: vi.fn(),
}))

vi.mock("@/lib/auth-helpers", () => ({
  verifyAuth: mocks.verifyAuth,
}))

vi.mock("@/lib/account/overview.server", () => ({
  getAccountOverview: mocks.getAccountOverview,
}))

type StubResponse = {
  status: number
  data: Record<string, unknown>
  headers: Map<string, string>
}

function request(): NextRequest {
  return {
    headers: { get: () => "Bearer valid-token" },
  } as unknown as NextRequest
}

describe("GET /api/account/overview", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: "user-1" })
  })

  it("returns a no-store entitlement and quota snapshot for the verified user", async () => {
    mocks.getAccountOverview.mockResolvedValue({
      status: "ready",
      overview: {
        profile: { id: "user-1", subscription_tier: "pro" },
        usage: {
          used: 2,
          limit: 100,
          allowed: true,
          periodEnd: "2026-10-01",
          freeOpensRemaining: 0,
        },
      },
    })
    const { GET } = await import("./route")

    const response = (await GET(request())) as unknown as StubResponse

    expect(response.status).toBe(200)
    expect(response.data.status).toBe("ready")
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(mocks.getAccountOverview).toHaveBeenCalledWith("user-1")
  })

  it("does not expose an entitlement snapshot without verified authentication", async () => {
    mocks.verifyAuth.mockResolvedValue({ authenticated: false, userId: null })
    const { GET } = await import("./route")

    const response = (await GET(request())) as unknown as StubResponse

    expect(response.status).toBe(401)
    expect(mocks.getAccountOverview).not.toHaveBeenCalled()
  })

  it("returns an explicit retryable state when the overview service is unavailable", async () => {
    mocks.getAccountOverview.mockResolvedValue({
      status: "unavailable",
      message: "We couldn't load your account details. Please try again.",
    })
    const { GET } = await import("./route")

    const response = (await GET(request())) as unknown as StubResponse

    expect(response.status).toBe(503)
    expect(response.data.status).toBe("unavailable")
  })
})
