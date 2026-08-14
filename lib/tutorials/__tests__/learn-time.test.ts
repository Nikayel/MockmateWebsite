/**
 * Pins the server-side trust boundary for Learn time telemetry. `clampFlushActiveMs` is the
 * entire defense against inflated time — the client measures, but only the server's clamp
 * decides what is credited — so its edges are worth pinning without a Firestore round-trip.
 */
import { describe, it, expect } from "vitest"
import {
  clampFlushActiveMs,
  learnTimeFlushSchema,
  ELAPSED_SLACK_MS,
  MAX_FLUSH_ACTIVE_MS,
} from "../learn-time"

const NOW = new Date("2026-08-14T12:00:00.000Z")

function isoSecondsAgo(seconds: number): string {
  return new Date(NOW.getTime() - seconds * 1000).toISOString()
}

describe("clampFlushActiveMs", () => {
  it("passes an honest report through unchanged", () => {
    // 4 minutes reported, 5 minutes of wall clock since the last flush: plausible.
    expect(clampFlushActiveMs(4 * 60_000, isoSecondsAgo(300), NOW)).toBe(4 * 60_000)
  })

  it("caps a single flush at the per-flush ceiling", () => {
    expect(clampFlushActiveMs(45 * 60_000, undefined, NOW)).toBe(MAX_FLUSH_ACTIVE_MS)
  })

  it("never credits more than wall-clock elapsed plus slack", () => {
    // Claims 5 minutes active, but the previous flush was 60 seconds ago. Real time is the bound.
    expect(clampFlushActiveMs(5 * 60_000, isoSecondsAgo(60), NOW)).toBe(60_000 + ELAPSED_SLACK_MS)
  })

  it("a replayed flush burst cannot accrue faster than real time", () => {
    // Ten identical 5-minute claims replayed within the same second: only the first can draw on
    // elapsed wall clock; every later one is bounded by ~0 elapsed + slack.
    const total = Array.from({ length: 10 }).reduce<number>(
      (sum) => sum + clampFlushActiveMs(5 * 60_000, NOW.toISOString(), NOW),
      0
    )
    expect(total).toBeLessThanOrEqual(10 * ELAPSED_SLACK_MS)
  })

  it("clamps to the slack floor when last_seen_at is in the future", () => {
    // A corrupt or clock-skewed future timestamp must not produce a negative credit.
    expect(clampFlushActiveMs(60_000, isoSecondsAgo(-3600), NOW)).toBe(ELAPSED_SLACK_MS)
  })

  it("ignores an unparseable last_seen_at rather than crediting nothing", () => {
    expect(clampFlushActiveMs(60_000, "not-a-date", NOW)).toBe(60_000)
  })

  it("returns 0 for zero, negative, and non-finite reports", () => {
    expect(clampFlushActiveMs(0, undefined, NOW)).toBe(0)
    expect(clampFlushActiveMs(-5000, undefined, NOW)).toBe(0)
    expect(clampFlushActiveMs(Number.NaN, undefined, NOW)).toBe(0)
    expect(clampFlushActiveMs(Number.POSITIVE_INFINITY, isoSecondsAgo(60), NOW)).toBe(0)
  })

  it("rounds fractional milliseconds", () => {
    expect(clampFlushActiveMs(1000.6, isoSecondsAgo(300), NOW)).toBe(1001)
  })
})

describe("learnTimeFlushSchema", () => {
  it("accepts a well-formed flush", () => {
    const parsed = learnTimeFlushSchema.safeParse({
      lessonId: "sd-l6-m1",
      levelId: 6,
      activeMs: 90_000,
      opened: true,
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects out-of-range levels, negative time, and absurd claims outright", () => {
    expect(
      learnTimeFlushSchema.safeParse({ lessonId: "x", levelId: 12, activeMs: 1000 }).success
    ).toBe(false)
    expect(
      learnTimeFlushSchema.safeParse({ lessonId: "x", levelId: 1, activeMs: -1 }).success
    ).toBe(false)
    // Above the schema sanity bound (1 hour): reject the request, don't even clamp it.
    expect(
      learnTimeFlushSchema.safeParse({ lessonId: "x", levelId: 1, activeMs: 2 * 60 * 60_000 })
        .success
    ).toBe(false)
  })
})
