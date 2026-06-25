import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const runTransaction = vi.fn()
const getUserUsageSummary = vi.fn()
const loggerError = vi.fn()

async function importRateLimiter(env: Record<string, string | undefined>) {
  vi.resetModules()
  vi.unstubAllEnvs()
  vi.stubEnv("NODE_ENV", env.NODE_ENV || "production")

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      vi.stubEnv(key, "")
    } else {
      vi.stubEnv(key, value)
    }
  }

  runTransaction.mockReset()
  getUserUsageSummary.mockReset()
  getUserUsageSummary.mockResolvedValue(null)
  loggerError.mockReset()

  vi.doMock("../firebase-admin", () => ({
    adminDb: {
      runTransaction,
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn(),
        })),
      })),
    },
  }))
  vi.doMock("../usage-tracking", () => ({
    getUserUsageSummary,
  }))
  vi.doMock("../logger", () => ({
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: loggerError,
      debug: vi.fn(),
    },
  }))

  return import("../rate-limiter")
}

describe("production rate limiter fallback", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("fails open to in-memory tracking when Redis is not configured in production", async () => {
    const rateLimiter = await importRateLimiter({
      NODE_ENV: "production",
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
      USE_DISTRIBUTED_RATE_LIMIT: undefined,
    })

    const result = await rateLimiter.checkRateLimit("prod-user", "free", 100)
    await rateLimiter.startRequestTracking("prod-user", 100)
    await rateLimiter.endRequestTracking("prod-user")

    expect(result.allowed).toBe(true)
    expect(runTransaction).not.toHaveBeenCalled()
    expect(loggerError).toHaveBeenCalledWith(
      "[Rate Limiter] Production Redis is not configured; failing open with in-memory tracking"
    )
  })

  it("does not fall back to Firestore transactions when Redis calls fail in production", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        statusText: "service unavailable",
        json: async () => [],
      }))
    )

    const rateLimiter = await importRateLimiter({
      NODE_ENV: "production",
      UPSTASH_REDIS_REST_URL: "https://redis.example.com",
      UPSTASH_REDIS_REST_TOKEN: "token",
      USE_DISTRIBUTED_RATE_LIMIT: "true",
    })

    const result = await rateLimiter.checkRateLimit("redis-failure-user", "free", 100)
    await rateLimiter.startRequestTracking("redis-failure-user", 100)
    await rateLimiter.endRequestTracking("redis-failure-user")

    expect(result.allowed).toBe(true)
    expect(runTransaction).not.toHaveBeenCalled()
    expect(loggerError).toHaveBeenCalledWith(
      "Failed to get Redis rate limit state, falling back",
      expect.objectContaining({ fallback: "memory" })
    )
  })
})
