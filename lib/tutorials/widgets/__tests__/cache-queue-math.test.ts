/**
 * Tables for the cache/queue sim math: the stampede pile-up is real and coalescing
 * kills it; TTL and capacity move hit ratio the way the lessons claim; queue depth
 * runs away when producers outpace consumers, bounded queues shed or stall instead,
 * and scale-on-backlog catches up where fixed consumers cannot.
 */
import { describe, it, expect } from "vitest"
import { cacheStream, simulateLruCache } from "../cache-math"
import { simulateQueue } from "../queue-math"

describe("cache math", () => {
  const stream = cacheStream({ seed: "demo", keys: 12, ticks: 200 })

  it("streams are deterministic and hot-skewed", () => {
    expect(cacheStream({ seed: "demo", keys: 12, ticks: 200 })).toEqual(stream)
    const hot = stream.filter((r) => r.key === "hot").length
    expect(hot).toBeGreaterThan(70)
    expect(hot).toBeLessThan(130)
  })

  it("bigger cache and longer TTL both raise hit ratio", () => {
    const small = simulateLruCache(stream, {
      capacity: 2,
      ttl: 40,
      rebuildTicks: 3,
      coalesce: false,
    })
    const big = simulateLruCache(stream, { capacity: 8, ttl: 40, rebuildTicks: 3, coalesce: false })
    expect(big.hitRatio).toBeGreaterThan(small.hitRatio)
    const shortTtl = simulateLruCache(stream, {
      capacity: 8,
      ttl: 5,
      rebuildTicks: 3,
      coalesce: false,
    })
    expect(big.hitRatio).toBeGreaterThan(shortTtl.hitRatio)
  })

  it("the stampede is real: short TTL + slow rebuild piles up rebuilds of the hot key", () => {
    const stampede = simulateLruCache(stream, {
      capacity: 8,
      ttl: 4,
      rebuildTicks: 6,
      coalesce: false,
    })
    expect(stampede.maxConcurrentRebuilds).toBeGreaterThan(1)
  })

  it("coalescing caps in-flight rebuilds at one per key and cuts DB loads", () => {
    const opts = { capacity: 8, ttl: 4, rebuildTicks: 6 }
    const without = simulateLruCache(stream, { ...opts, coalesce: false })
    const withCo = simulateLruCache(stream, { ...opts, coalesce: true })
    expect(withCo.maxConcurrentRebuilds).toBeLessThanOrEqual(1)
    expect(withCo.dbLoads).toBeLessThan(without.dbLoads)
  })
})

describe("queue math", () => {
  it("producer faster than consumer: unbounded depth runs away", () => {
    const result = simulateQueue({
      producerRate: 3,
      consumerRate: 2,
      ticks: 300,
      capacity: Number.POSITIVE_INFINITY,
    })
    expect(result.runawayAt).not.toBeNull()
    expect(result.depth[result.depth.length - 1]).toBeGreaterThan(250)
    expect(result.dropped).toBe(0)
  })

  it("bounded queue with drop policy sheds instead of growing", () => {
    const result = simulateQueue({ producerRate: 3, consumerRate: 2, ticks: 300, capacity: 50 })
    expect(Math.max(...result.depth)).toBeLessThanOrEqual(50)
    expect(result.dropped).toBeGreaterThan(0)
    expect(result.runawayAt).toBeNull()
  })

  it("backpressure stalls producers rather than dropping", () => {
    const result = simulateQueue({
      producerRate: 3,
      consumerRate: 2,
      ticks: 300,
      capacity: 50,
      onFull: "backpressure",
    })
    expect(result.dropped).toBe(0)
    expect(Math.max(...result.depth)).toBeLessThanOrEqual(50)
  })

  it("a burst drains afterwards only when consumers outpace producers", () => {
    const drains = simulateQueue({
      producerRate: 1,
      consumerRate: 2,
      ticks: 200,
      capacity: Number.POSITIVE_INFINITY,
      burst: { from: 50, to: 70, multiplier: 6 },
    })
    expect(Math.max(...drains.depth)).toBeGreaterThan(20)
    expect(drains.depth[drains.depth.length - 1]).toBe(0)
  })

  it("scale-on-backlog adds consumers and catches up where fixed consumers cannot", () => {
    const fixed = simulateQueue({
      producerRate: 3,
      consumerRate: 1,
      ticks: 200,
      capacity: Number.POSITIVE_INFINITY,
    })
    const scaled = simulateQueue({
      producerRate: 3,
      consumerRate: 1,
      ticks: 200,
      capacity: Number.POSITIVE_INFINITY,
      scaleOnBacklog: { threshold: 20, maxConsumers: 6 },
    })
    expect(scaled.consumers).toBeGreaterThan(1)
    expect(scaled.depth[scaled.depth.length - 1]).toBeLessThan(fixed.depth[fixed.depth.length - 1])
  })

  it("is deterministic", () => {
    const a = simulateQueue({ producerRate: 2.5, consumerRate: 2, ticks: 100, capacity: 40 })
    const b = simulateQueue({ producerRate: 2.5, consumerRate: 2, ticks: 100, capacity: 40 })
    expect(a).toEqual(b)
  })
})
