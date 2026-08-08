/**
 * Edge rate limiter tests.
 *
 * This logic previously lived inside an Edge route handler and could not be
 * exercised without standing up the route, which is how a limiter that guards
 * five reasoning-model calls per request went unverified.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  checkEdgeRateLimit,
  __resetEdgeRateLimitCountersForTest,
  type EdgeRateWindow,
} from "../rate-limit-edge"

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const BURST: EdgeRateWindow = { name: "burst", windowSeconds: 60, maxRequests: 3 }
const SUSTAINED: EdgeRateWindow = { name: "sustained", windowSeconds: 3600, maxRequests: 5 }

const T0 = 1_700_000_000_000

function limit(identifier: string, windows: readonly EdgeRateWindow[], nowMs: number) {
  return checkEdgeRateLimit({ keyPrefix: "rl:test", identifier, windows, nowMs })
}

beforeEach(() => {
  __resetEdgeRateLimitCountersForTest()
  vi.unstubAllEnvs()
  // No Upstash configured, so every test below exercises the isolate fallback
  // unless it explicitly stubs fetch.
  vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined)
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("isolate fallback", () => {
  it("allows up to the limit and rejects the next request", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await limit("user_a", [BURST], T0)).allowed).toBe(true)
    }

    const verdict = await limit("user_a", [BURST], T0)
    expect(verdict.allowed).toBe(false)
    expect(verdict.window?.name).toBe("burst")
  })

  it("keeps separate identifiers independent", async () => {
    for (let i = 0; i < 3; i++) await limit("user_a", [BURST], T0)

    // One user exhausting their budget must not spend anyone else's.
    expect((await limit("user_b", [BURST], T0)).allowed).toBe(true)
  })

  it("lets the window roll over", async () => {
    for (let i = 0; i < 3; i++) await limit("user_a", [BURST], T0)
    expect((await limit("user_a", [BURST], T0)).allowed).toBe(false)

    expect((await limit("user_a", [BURST], T0 + 61_000)).allowed).toBe(true)
  })

  it("rejects on the FIRST window that fails, not the last", async () => {
    // Burst is 3/min, sustained is 5/hour. The 4th request in one minute must be
    // attributed to burst even though sustained still has room.
    for (let i = 0; i < 3; i++) await limit("user_a", [BURST, SUSTAINED], T0)

    const verdict = await limit("user_a", [BURST, SUSTAINED], T0)
    expect(verdict.allowed).toBe(false)
    expect(verdict.window?.name).toBe("burst")
  })

  it("catches the patient script that never bursts", async () => {
    // Five requests spaced two minutes apart: burst never trips, sustained does.
    // A single short window would have allowed this forever.
    for (let i = 0; i < 5; i++) {
      const verdict = await limit("user_a", [BURST, SUSTAINED], T0 + i * 120_000)
      expect(verdict.allowed).toBe(true)
    }

    const verdict = await limit("user_a", [BURST, SUSTAINED], T0 + 5 * 120_000)
    expect(verdict.allowed).toBe(false)
    expect(verdict.window?.name).toBe("sustained")
  })
})

describe("Upstash path", () => {
  function stubUpstash(counts: number[]) {
    const calls: string[][] = []
    let i = 0
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token")
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const command = JSON.parse(init.body as string) as string[]
        calls.push(command)
        if (command[0] === "INCR") return { ok: true, json: async () => ({ result: counts[i++] }) }
        return { ok: true, json: async () => ({ result: 1 }) }
      })
    )
    return calls
  }

  it("allows while the distributed counter is within the limit", async () => {
    stubUpstash([1])

    expect((await limit("user_a", [BURST], T0)).allowed).toBe(true)
  })

  it("rejects once the distributed counter passes the limit", async () => {
    stubUpstash([4])

    expect((await limit("user_a", [BURST], T0)).allowed).toBe(false)
  })

  it("sets a TTL only on the first hit of a bucket, so buckets self-collect", async () => {
    const calls = stubUpstash([1])
    await limit("user_a", [BURST], T0)

    expect(calls.map((c) => c[0])).toEqual(["INCR", "EXPIRE"])
    // TTL carries slack so clock skew cannot expire a bucket still in use.
    expect(Number(calls[1][2])).toBeGreaterThan(BURST.windowSeconds)
  })

  it("bakes the window into the key so the counter is a plain atomic INCR", async () => {
    const calls = stubUpstash([1])
    await limit("user_a", [BURST], T0)

    // A check-then-set limiter is what a parallel client defeats; the bucket
    // index must be part of the key rather than something we read and compare.
    expect(calls[0][1]).toContain(String(Math.floor(T0 / (BURST.windowSeconds * 1000))))
  })

  it("falls back to the isolate counter instead of failing open when Upstash errors", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }))
    )

    // The first three still pass (the fallback allows them) but the fourth is
    // refused. The point is that an unreachable cache does not mean unlimited.
    for (let i = 0; i < 3; i++) {
      expect((await limit("user_a", [BURST], T0)).allowed).toBe(true)
    }
    expect((await limit("user_a", [BURST], T0)).allowed).toBe(false)
  })

  it("falls back when the network rejects outright", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("network down")))
    )

    for (let i = 0; i < 3; i++) {
      expect((await limit("user_a", [BURST], T0)).allowed).toBe(true)
    }
    expect((await limit("user_a", [BURST], T0)).allowed).toBe(false)
  })
})
