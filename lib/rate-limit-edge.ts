/**
 * Rate limiting for the Edge runtime.
 *
 * lib/rate-limit.ts cannot be used from an Edge route, and the way it fails is
 * the dangerous kind. Its store selection prefers FirestoreRateLimitStore in
 * production; that store's `increment` dynamically imports firebase-admin, which
 * is unavailable in Edge. The import rejects, `increment` hits its fail-open
 * catch, and every request is allowed. A limiter that is a silent no-op is worse
 * than no limiter, because the route looks covered. Its module init can also
 * throw in production when no distributed store is configured, which in Edge
 * would 500 the route rather than degrade.
 *
 * So this module talks to Upstash over plain `fetch` (Edge-safe, no SDK) and
 * degrades to a per-isolate counter rather than to "allow". It is deliberately
 * small and dependency-free: anything imported here has to survive Edge too.
 *
 * This code began inline in app/api/feedback/stream/route.ts, where it guarded
 * up to five reasoning-model calls per request. It is extracted here so other
 * Edge routes can reuse it and so the windowing logic is testable without
 * standing up a route.
 */

import { logger } from "@/lib/logger"

/** One fixed-window limit. Every configured window must pass. */
export interface EdgeRateWindow {
  /** Short label used in logs and in the Retry-After hint. */
  name: string
  windowSeconds: number
  maxRequests: number
}

export interface EdgeRateLimitVerdict {
  allowed: boolean
  /** Which window rejected. Absent when allowed. */
  window?: EdgeRateWindow
}

/**
 * Per-isolate fallback counters. Not distributed: an attacker spread across
 * isolates gets one bucket each. But it is a real bound on a single runaway
 * client, which is the failure this is most likely to meet, and it is strictly
 * better than allowing everything. Used only when Upstash is unconfigured or
 * unreachable.
 */
const isolateRateCounters = new Map<string, { count: number; resetAtMs: number }>()

/** Bounded so a key-space flood cannot grow the isolate's memory without limit. */
const MAX_ISOLATE_COUNTERS = 10_000

function checkIsolateWindow(key: string, window: EdgeRateWindow, nowMs: number): boolean {
  const existing = isolateRateCounters.get(key)
  if (!existing || existing.resetAtMs <= nowMs) {
    if (isolateRateCounters.size >= MAX_ISOLATE_COUNTERS) {
      for (const [k, v] of isolateRateCounters) {
        if (v.resetAtMs <= nowMs) isolateRateCounters.delete(k)
      }
      // Still full of live entries: refuse rather than grow without bound.
      if (isolateRateCounters.size >= MAX_ISOLATE_COUNTERS) return false
    }
    isolateRateCounters.set(key, { count: 1, resetAtMs: nowMs + window.windowSeconds * 1000 })
    return true
  }
  existing.count++
  return existing.count <= window.maxRequests
}

/** One Upstash REST command. Returns undefined when Upstash is not configured. */
async function upstashCommand(command: string[]): Promise<unknown | undefined> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return undefined

  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  })
  if (!response.ok) throw new Error(`Upstash responded ${response.status}`)
  const data = (await response.json()) as { result?: unknown }
  return data.result
}

/**
 * Distributed fixed-window counter.
 *
 * The window is baked into the KEY (bucket index = floor(now / window)) so the
 * counter is a plain INCR with no read-modify-write, and therefore atomic across
 * concurrent instances. That matters: a check-then-set limiter is exactly what a
 * parallel client defeats.
 *
 * Returns undefined when Upstash is unconfigured, so the caller can fall back.
 */
async function checkUpstashWindow(
  key: string,
  window: EdgeRateWindow,
  nowMs: number
): Promise<boolean | undefined> {
  const bucket = Math.floor(nowMs / (window.windowSeconds * 1000))
  const bucketKey = `${key}:${bucket}`

  const count = await upstashCommand(["INCR", bucketKey])
  if (typeof count !== "number") return undefined

  if (count === 1) {
    // First hit in this bucket: give the key a TTL so buckets self-collect.
    // +10s of slack so a clock skew cannot expire a bucket still in use.
    await upstashCommand(["EXPIRE", bucketKey, String(window.windowSeconds + 10)])
  }

  return count <= window.maxRequests
}

/**
 * Apply every window to one identifier.
 *
 * `identifier` should be a VERIFIED user id wherever the route is auth-gated:
 * the account is the thing that spends money, and an IP key both punishes shared
 * networks (a lecture hall behind one NAT) and is trivially rotated.
 *
 * On an Upstash failure this degrades to the per-isolate counter instead of
 * failing open. A limiter guarding expensive model calls should not evaporate
 * because a cache was briefly unreachable.
 */
export async function checkEdgeRateLimit(options: {
  keyPrefix: string
  identifier: string
  windows: readonly EdgeRateWindow[]
  /** Injectable clock, for tests. */
  nowMs?: number
}): Promise<EdgeRateLimitVerdict> {
  const { keyPrefix, identifier, windows } = options
  const nowMs = options.nowMs ?? Date.now()

  for (const window of windows) {
    const key = `${keyPrefix}:${identifier}:${window.windowSeconds}`
    let allowed: boolean | undefined

    try {
      allowed = await checkUpstashWindow(key, window, nowMs)
    } catch (error) {
      logger.error("[EdgeRateLimit] Distributed store unavailable, using isolate counter", {
        keyPrefix,
        window: window.name,
        error,
      })
      allowed = undefined
    }

    if (allowed === undefined) {
      allowed = checkIsolateWindow(key, window, nowMs)
    }

    if (!allowed) return { allowed: false, window }
  }

  return { allowed: true }
}

/**
 * Drop every isolate counter. Exists for tests only: the map is module state, so
 * without this one test's counts leak into the next.
 */
export function __resetEdgeRateLimitCountersForTest(): void {
  isolateRateCounters.clear()
}
