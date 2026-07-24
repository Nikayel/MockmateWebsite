/**
 * Pure, seeded rate-limiter math: one deterministic request stream evaluated under
 * token bucket, fixed window, and sliding-window counter. The widget renders the
 * verdict timeline; this module owns every number so the fixed-window boundary
 * burst (2x the limit through a window edge) is table-testable, not hand-waved.
 */
import { fnv1a } from "./ring-math"

export interface StreamRequest {
  /** Arrival time in ticks (integer, ascending). */
  at: number
}

/**
 * Seeded arrival stream: `count` requests over `horizon` ticks, deterministic for a
 * seed. A burst window (when enabled) packs extra requests tightly around a boundary
 * to stage the fixed-window aha.
 */
export function requestStream(opts: {
  seed: string
  count: number
  horizon: number
  burstAt?: number
  burstSize?: number
}): StreamRequest[] {
  const { seed, count, horizon, burstAt, burstSize = 0 } = opts
  const arrivals: number[] = []
  for (let i = 0; i < count; i++) arrivals.push(fnv1a(`${seed}#${i}`) % horizon)
  if (burstAt !== undefined)
    for (let i = 0; i < burstSize; i++) arrivals.push(Math.max(0, burstAt - 2 + (i % 5)))
  arrivals.sort((a, b) => a - b)
  return arrivals.map((at) => ({ at }))
}

export type Verdict = { at: number; allowed: boolean }

/** Token bucket: capacity tokens, refillPerTick added each tick (fractional ok). */
export function tokenBucket(
  stream: StreamRequest[],
  opts: { capacity: number; refillPerTick: number }
): Verdict[] {
  let tokens = opts.capacity
  let lastAt = 0
  const out: Verdict[] = []
  for (const req of stream) {
    tokens = Math.min(opts.capacity, tokens + (req.at - lastAt) * opts.refillPerTick)
    lastAt = req.at
    if (tokens >= 1) {
      tokens -= 1
      out.push({ at: req.at, allowed: true })
    } else {
      out.push({ at: req.at, allowed: false })
    }
  }
  return out
}

/** Fixed window: `limit` per `windowSize`-tick window aligned to tick 0. */
export function fixedWindow(
  stream: StreamRequest[],
  opts: { limit: number; windowSize: number }
): Verdict[] {
  const counts = new Map<number, number>()
  return stream.map((req) => {
    const window = Math.floor(req.at / opts.windowSize)
    const used = counts.get(window) ?? 0
    if (used < opts.limit) {
      counts.set(window, used + 1)
      return { at: req.at, allowed: true }
    }
    return { at: req.at, allowed: false }
  })
}

/** Sliding-window counter: allow if requests in the trailing `windowSize` ticks < limit. */
export function slidingWindow(
  stream: StreamRequest[],
  opts: { limit: number; windowSize: number }
): Verdict[] {
  const allowedAt: number[] = []
  return stream.map((req) => {
    while (allowedAt.length && allowedAt[0] <= req.at - opts.windowSize) allowedAt.shift()
    if (allowedAt.length < opts.limit) {
      allowedAt.push(req.at)
      return { at: req.at, allowed: true }
    }
    return { at: req.at, allowed: false }
  })
}

/** Max requests admitted in ANY trailing window of `windowSize` ticks (the burst measure). */
export function worstWindowLoad(verdicts: Verdict[], windowSize: number): number {
  const allowed = verdicts.filter((v) => v.allowed).map((v) => v.at)
  let worst = 0
  for (const start of allowed) {
    const inWindow = allowed.filter((at) => at >= start && at < start + windowSize).length
    worst = Math.max(worst, inWindow)
  }
  return worst
}
