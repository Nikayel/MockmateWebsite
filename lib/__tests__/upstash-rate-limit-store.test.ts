import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Covers the atomic EVAL increment that replaced the racy GET-then-SET pair
 * (2026-08-17). Redis is mocked at the fetch layer: the store speaks Upstash's
 * REST protocol (POST a JSON command array, read {result}).
 */

const loggerError = vi.fn()

type FetchCall = [string, { headers: Record<string, string>; body: string }]

function upstashFetch(result: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({
    ok,
    status,
    statusText: ok ? "OK" : "Service Unavailable",
    json: async () => ({ result }),
  }))
}

async function importStore(fetchImpl: unknown) {
  vi.resetModules()
  vi.unstubAllEnvs()
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake-db.upstash.example")
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token")
  vi.stubGlobal("fetch", fetchImpl)
  loggerError.mockReset()
  vi.doMock("../logger", () => ({
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: loggerError },
  }))
  const mod = await import("../rate-limit")
  return new mod.UpstashRateLimitStore()
}

const WINDOW = { interval: 60_000, uniqueTokenPerInterval: 500, maxRequests: 5 }

describe("UpstashRateLimitStore.increment", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-17T12:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("sends one atomic EVAL instead of the old racy GET-then-SET pair", async () => {
    const now = Date.now()
    const fetchMock = upstashFetch(JSON.stringify({ count: 1, resetTime: now + 60_000 }))
    const store = await importStore(fetchMock)

    await store.increment("rl:chat:ip:1.2.3.4", WINDOW)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as FetchCall
    expect(url).toBe("https://fake-db.upstash.example")
    expect(init.headers.Authorization).toBe("Bearer test-token")

    const command = JSON.parse(init.body) as string[]
    expect(command[0]).toBe("EVAL")
    expect(command[1]).toContain("redis.call('SET'")
    expect(command[2]).toBe("1") // one key
    expect(command[3]).toBe("rl:chat:ip:1.2.3.4")
    expect(command[4]).toBe(String(now))
    expect(command[5]).toBe("60000")
  })

  it("allows requests inside the window and counts down the remaining budget", async () => {
    const now = Date.now()
    const store = await importStore(
      upstashFetch(JSON.stringify({ count: 3, resetTime: now + 30_000 }))
    )

    const result = await store.increment("rl:api:ip:1.2.3.4", WINDOW)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
    expect(result.resetTime).toBe(now + 30_000)
    expect(result.retryAfter).toBeUndefined()
  })

  it("blocks past the limit with retryAfter derived from the window end", async () => {
    const now = Date.now()
    const store = await importStore(
      upstashFetch(JSON.stringify({ count: 6, resetTime: now + 30_000 }))
    )

    const result = await store.increment("rl:api:ip:1.2.3.4", WINDOW)

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBe(30)
  })

  it("fails open with a SINGLE error log when Upstash is unreachable", async () => {
    // The archived-database incident: DNS gone, fetch rejects. The old GET-then-SET
    // implementation logged TWO Sentry-bound errors per request here.
    const store = await importStore(
      vi.fn(async () => {
        throw new TypeError("fetch failed")
      })
    )

    const result = await store.increment("rl:api:ip:1.2.3.4", WINDOW)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(WINDOW.maxRequests)
    expect(loggerError).toHaveBeenCalledTimes(1)
    expect(loggerError).toHaveBeenCalledWith(
      "Upstash increment error, falling back to allow",
      expect.objectContaining({ key: "rl:api:ip:1.2.3.4" })
    )
  })

  it("fails open when Upstash answers with an error status", async () => {
    const store = await importStore(upstashFetch(null, false, 503))

    const result = await store.increment("rl:api:ip:1.2.3.4", WINDOW)

    expect(result.allowed).toBe(true)
    expect(loggerError).toHaveBeenCalledTimes(1)
  })
})
