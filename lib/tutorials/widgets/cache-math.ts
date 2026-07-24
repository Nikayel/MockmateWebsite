/**
 * Pure, seeded LRU cache simulation for the cache-sim widget: a skewed key stream
 * against a small LRU with TTL, a stampede scenario (the hot key expires under
 * load and every miss launches its own database rebuild), and the coalescing fix
 * (one in-flight rebuild per key; concurrent requests wait on it). All numbers are
 * table-testable; the widget only renders them.
 */
import { fnv1a } from "./ring-math"

export interface CacheRequest {
  at: number
  key: string
}

/**
 * Seeded, popularity-skewed request stream: ~half of requests hit the top key,
 * the rest spread over the tail (the 80/20 shape the lessons teach), one request
 * per tick for `ticks` ticks.
 */
export function cacheStream(opts: { seed: string; keys: number; ticks: number }): CacheRequest[] {
  const { seed, keys, ticks } = opts
  const out: CacheRequest[] = []
  for (let t = 0; t < ticks; t++) {
    const roll = fnv1a(`${seed}#pick#${t}`) % 100
    const key = roll < 50 ? "hot" : `k${(fnv1a(`${seed}#tail#${t}`) % Math.max(1, keys - 1)) + 1}`
    out.push({ at: t, key })
  }
  return out
}

export interface CacheSimResult {
  hits: number
  misses: number
  hitRatio: number
  /** Database rebuilds actually launched (the cost of every miss without coalescing). */
  dbLoads: number
  /** Worst pile-up: the most rebuilds in flight for ONE key at the same time. */
  maxConcurrentRebuilds: number
  /** Hit-or-miss per tick for the timeline strip (true = hit). */
  timeline: boolean[]
}

export function simulateLruCache(
  stream: CacheRequest[],
  opts: {
    capacity: number
    /** Entry lifetime in ticks; Infinity for no TTL. */
    ttl: number
    /** Ticks a database rebuild takes to land back in the cache. */
    rebuildTicks: number
    /** One in-flight rebuild per key; concurrent misses wait instead of stampeding. */
    coalesce: boolean
  }
): CacheSimResult {
  const { capacity, ttl, rebuildTicks, coalesce } = opts
  /** key -> insertedAt (refreshed on hit for LRU recency via Map ordering). */
  const cache = new Map<string, number>()
  /** key -> rebuild completion ticks currently in flight. */
  const inflight = new Map<string, number[]>()
  let hits = 0
  let dbLoads = 0
  let maxConcurrent = 0
  const timeline: boolean[] = []

  for (const req of stream) {
    // Land any completed rebuilds first.
    for (const [key, completions] of inflight) {
      const landed = completions.filter((done) => done <= req.at)
      if (landed.length > 0) {
        cache.delete(key)
        cache.set(key, req.at)
        if (cache.size > capacity) cache.delete(cache.keys().next().value!)
        const rest = completions.filter((done) => done > req.at)
        if (rest.length > 0) inflight.set(key, rest)
        else inflight.delete(key)
      }
    }

    const insertedAt = cache.get(req.key)
    const fresh = insertedAt !== undefined && req.at - insertedAt < ttl
    if (fresh) {
      // LRU touch: re-insert to the recent end.
      cache.delete(req.key)
      cache.set(req.key, insertedAt!)
      hits++
      timeline.push(true)
      continue
    }
    if (insertedAt !== undefined) cache.delete(req.key) // expired
    timeline.push(false)

    const pending = inflight.get(req.key) ?? []
    if (coalesce && pending.length > 0) {
      // Wait on the in-flight rebuild: a miss for the requester, no new DB load.
      continue
    }
    dbLoads++
    pending.push(req.at + rebuildTicks)
    inflight.set(req.key, pending)
    maxConcurrent = Math.max(maxConcurrent, pending.length)
  }

  const misses = stream.length - hits
  return {
    hits,
    misses,
    hitRatio: stream.length ? hits / stream.length : 0,
    dbLoads,
    maxConcurrentRebuilds: maxConcurrent,
    timeline,
  }
}
