import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getUpstashRateLimiter = vi.fn()
const loggerError = vi.fn()

vi.mock("../upstash", () => ({ getUpstashRateLimiter }))
vi.mock("@/lib/logger", () => ({
  logger: { error: loggerError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

function limiterResult(result: {
  success: boolean
  limit: number
  remaining: number
  reset: number
  reason?: "timeout"
}) {
  return { limit: vi.fn().mockResolvedValue({ ...result, pending: Promise.resolve() }) }
}

describe("rate-limit enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("NODE_ENV", "production")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("allows a successful decision", async () => {
    getUpstashRateLimiter.mockReturnValue(
      limiterResult({ success: true, limit: 20, remaining: 19, reset: Date.now() + 60_000 })
    )
    const { enforceRateLimitPolicy } = await import("../enforce")

    await expect(enforceRateLimitPolicy("chatFree", "user:one")).resolves.toBeNull()
  })

  it("returns a consistent 429 response", async () => {
    getUpstashRateLimiter.mockReturnValue(
      limiterResult({ success: false, limit: 20, remaining: 0, reset: Date.now() + 30_000 })
    )
    const { enforceRateLimitPolicy } = await import("../enforce")

    const response = await enforceRateLimitPolicy("chatFree", "user:one")
    expect(response?.status).toBe(429)
    expect(response?.headers.get("Retry-After")).toBe("30")
    expect(response?.headers.get("RateLimit-Limit")).toBe("20")
    expect((response as unknown as { data: unknown }).data).toMatchObject({
      code: "RATE_LIMIT_EXCEEDED",
    })
  })

  it("fails open for an interview policy when Redis times out", async () => {
    getUpstashRateLimiter.mockReturnValue(
      limiterResult({ success: true, limit: 20, remaining: 20, reset: 0, reason: "timeout" })
    )
    const { enforceRateLimitPolicy } = await import("../enforce")

    await expect(enforceRateLimitPolicy("chatFree", "user:one")).resolves.toBeNull()
    expect(loggerError).toHaveBeenCalledWith("Rate-limit store timed out", {
      policyName: "chatFree",
    })
  })

  it("fails open for an interview policy when Redis is not configured in production", async () => {
    getUpstashRateLimiter.mockReturnValue(null)
    const { enforceRateLimitPolicy } = await import("../enforce")

    await expect(enforceRateLimitPolicy("chatFree", "user:one")).resolves.toBeNull()
    expect(loggerError).toHaveBeenCalledWith("Rate-limit store is not configured", {
      policyName: "chatFree",
    })
  })

  it("fails closed for a destructive policy when Redis is unavailable", async () => {
    getUpstashRateLimiter.mockReturnValue(null)
    const { enforceRateLimitPolicy } = await import("../enforce")

    const response = await enforceRateLimitPolicy("accountDeletion", "user:one")
    expect(response?.status).toBe(503)
    expect((response as unknown as { data: unknown }).data).toMatchObject({
      code: "RATE_LIMIT_UNAVAILABLE",
    })
  })

  it("fails open for inexpensive policies when Redis throws", async () => {
    getUpstashRateLimiter.mockReturnValue({
      limit: vi.fn().mockRejectedValue(new Error("redis unavailable")),
    })
    const { enforceRateLimitPolicy } = await import("../enforce")

    await expect(enforceRateLimitPolicy("api", "user:one")).resolves.toBeNull()
    expect(loggerError).toHaveBeenCalledWith(
      "Rate-limit check failed",
      expect.objectContaining({ policyName: "api" })
    )
  })
})
