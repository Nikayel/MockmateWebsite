import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  generateCacheKey,
  getCachedResponse,
  setCachedResponse,
  getCacheStats,
  clearCache,
} from "../ai-cache"

describe("ai-cache (in-memory)", () => {
  beforeEach(async () => {
    vi.useRealTimers()
    await clearCache()
  })

  it("returns a stored response and counts the hit", async () => {
    await setCachedResponse("key-1", "cached answer", "hint")

    const result = await getCachedResponse("key-1")

    expect(result).toEqual({ hit: true, response: "cached answer", source: "memory" })
    expect(getCacheStats()).toEqual({ memoryCacheSize: 1, memoryHits: 1 })
  })

  it("misses for unknown keys", async () => {
    expect(await getCachedResponse("never-set")).toEqual({ hit: false })
  })

  it("expires entries after the memory TTL", async () => {
    vi.useFakeTimers()
    await setCachedResponse("key-ttl", "stale soon")

    vi.advanceTimersByTime(30 * 60 * 1000 + 1)

    expect(await getCachedResponse("key-ttl")).toEqual({ hit: false })
    vi.useRealTimers()
  })

  it("clearCache reports how many entries it dropped", async () => {
    await setCachedResponse("a", "1")
    await setCachedResponse("b", "2")

    expect(await clearCache()).toBe(2)
    expect(getCacheStats().memoryCacheSize).toBe(0)
  })

  it("cache keys differ when any semantic component differs", () => {
    const base = { type: "hint", userMessage: "help", scenarioId: "two-sum" }
    const k1 = generateCacheKey(base)

    expect(generateCacheKey({ ...base, userMessage: "help " })).toBe(k1) // trimmed
    expect(generateCacheKey({ ...base, userMessage: "HELP" })).toBe(k1) // case-normalized
    expect(generateCacheKey({ ...base, scenarioId: "three-sum" })).not.toBe(k1)
    expect(generateCacheKey({ ...base, type: "feedback" })).not.toBe(k1)
    expect(generateCacheKey({ ...base, context: "code" })).not.toBe(k1)
  })
})
