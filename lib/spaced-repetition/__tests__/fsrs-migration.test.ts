/**
 * Tests for the pure SM-2 → FSRS conversion (A/B teardown migration).
 *
 * The two properties that matter most:
 * 1. Schedules never jump — nextReview is exactly the SM-2 next_review_at.
 * 2. Idempotency — cards with a valid FSRS blob are skipped (null), so the
 *    migration can be re-run safely and the re-run doubles as a completion
 *    check.
 */

import { describe, it, expect, vi } from "vitest"

// reconstructState (round-trip check) pulls in the firebase-admin module via
// algorithm-router; keep it inert.
vi.mock("@/lib/firebase-admin", () => ({ adminDb: {} }))

import {
  hasValidFsrsState,
  mapEaseToFsrsDifficulty,
  convertSm2CardToFsrs,
  buildFsrsCardUpdate,
} from "../fsrs-migration"
import { reconstructState } from "../algorithm-router"
import type { FSRSCard } from "../fsrs-algorithm"

const NOW = new Date("2026-07-29T12:00:00.000Z")

const sm2Card = (overrides: Partial<Parameters<typeof convertSm2CardToFsrs>[0]> = {}) => ({
  ease_factor: 2.1,
  interval_days: 12,
  review_count: 4,
  next_review_at: "2026-08-05T09:00:00.000Z",
  last_reviewed_at: "2026-07-24T09:00:00.000Z",
  ...overrides,
})

describe("mapEaseToFsrsDifficulty", () => {
  it("maps the SM-2 ease endpoints inversely onto FSRS difficulty", () => {
    expect(mapEaseToFsrsDifficulty(1.3)).toBe(10)
    expect(mapEaseToFsrsDifficulty(2.5)).toBe(1)
  })

  it("maps the midpoint linearly", () => {
    expect(mapEaseToFsrsDifficulty(1.9)).toBeCloseTo(5.5, 10)
  })

  it("clamps out-of-range ease values", () => {
    expect(mapEaseToFsrsDifficulty(0.9)).toBe(10)
    expect(mapEaseToFsrsDifficulty(3.2)).toBe(1)
  })

  it("preserves difficulty ordering (harder card => higher difficulty)", () => {
    expect(mapEaseToFsrsDifficulty(1.5)).toBeGreaterThan(mapEaseToFsrsDifficulty(2.3))
  })
})

describe("hasValidFsrsState", () => {
  it("accepts a serialized card with numeric stability", () => {
    expect(hasValidFsrsState({ fsrs_state: JSON.stringify({ stability: 4.2 }) })).toBe(true)
  })

  it("rejects missing, corrupt, and stability-less blobs", () => {
    expect(hasValidFsrsState({})).toBe(false)
    expect(hasValidFsrsState({ fsrs_state: "{not json" })).toBe(false)
    expect(hasValidFsrsState({ fsrs_state: JSON.stringify({ difficulty: 5 }) })).toBe(false)
    expect(hasValidFsrsState({ fsrs_state: JSON.stringify(null) })).toBe(false)
  })
})

describe("convertSm2CardToFsrs", () => {
  it("returns null for cards that already have a valid FSRS blob (idempotent)", () => {
    const card = sm2Card({ fsrs_state: JSON.stringify({ stability: 3 }) })
    expect(convertSm2CardToFsrs(card, NOW)).toBeNull()
  })

  it("converts cards whose blob is corrupt (treated as absent)", () => {
    const card = sm2Card({ fsrs_state: "{broken" })
    expect(convertSm2CardToFsrs(card, NOW)).not.toBeNull()
  })

  it("preserves the schedule exactly: nextReview === next_review_at, lastReview kept", () => {
    const data = sm2Card()
    const card = convertSm2CardToFsrs(data, NOW)!
    expect(card.nextReview.toISOString()).toBe(data.next_review_at)
    expect(card.lastReview?.toISOString()).toBe(data.last_reviewed_at)
  })

  it("seeds stability from the SM-2 interval and difficulty from ease", () => {
    const card = convertSm2CardToFsrs(sm2Card(), NOW)!
    expect(card.stability).toBe(12)
    expect(card.difficulty).toBeCloseTo(mapEaseToFsrsDifficulty(2.1), 10)
    expect(card.scheduledDays).toBe(12)
    expect(card.reps).toBe(4)
  })

  it("carries fsrs_lapses through and defaults to 0", () => {
    expect(convertSm2CardToFsrs(sm2Card({ fsrs_lapses: 2 }), NOW)!.lapses).toBe(2)
    expect(convertSm2CardToFsrs(sm2Card(), NOW)!.lapses).toBe(0)
  })

  it("derives state from the interval: >=1d review, <1d learning", () => {
    expect(convertSm2CardToFsrs(sm2Card(), NOW)!.state).toBe("review")
    expect(convertSm2CardToFsrs(sm2Card({ interval_days: 0 }), NOW)!.state).toBe("learning")
  })

  it("enforces a stability floor for degenerate intervals", () => {
    const card = convertSm2CardToFsrs(sm2Card({ interval_days: 0 }), NOW)!
    expect(card.stability).toBeGreaterThanOrEqual(0.5)
  })

  it("computes elapsedDays from lastReview and floors at 0", () => {
    expect(convertSm2CardToFsrs(sm2Card(), NOW)!.elapsedDays).toBe(5)
    const future = sm2Card({ last_reviewed_at: "2026-07-30T09:00:00.000Z" })
    expect(convertSm2CardToFsrs(future, NOW)!.elapsedDays).toBe(0)
  })

  it("treats never-reviewed cards as new FSRS cards with the due date kept", () => {
    const data = sm2Card({ review_count: 0, interval_days: 0, last_reviewed_at: undefined })
    const card = convertSm2CardToFsrs(data, NOW)!
    expect(card.state).toBe("new")
    expect(card.reps).toBe(0)
    expect(card.nextReview.toISOString()).toBe(data.next_review_at)
  })
})

describe("buildFsrsCardUpdate", () => {
  it("writes only FSRS fields, leaving SM-2 fields as a rollback trail", () => {
    const card = convertSm2CardToFsrs(sm2Card(), NOW)!
    const update = buildFsrsCardUpdate(card)
    expect(Object.keys(update).sort()).toEqual([
      "fsrs_difficulty",
      "fsrs_lapses",
      "fsrs_stability",
      "fsrs_state",
    ])
    expect(update.fsrs_stability).toBe(card.stability)
  })

  it("round-trips through reconstructState with schedule and memory intact", () => {
    const data = sm2Card()
    const card = convertSm2CardToFsrs(data, NOW)!
    const stored = {
      ...data,
      ...buildFsrsCardUpdate(card),
      mastery_level: "reviewing",
      confidence: 0.7,
    }

    const state = reconstructState("fsrs", stored as never)
    const roundTripped = state.fsrs_state as FSRSCard
    expect(roundTripped.difficulty).toBeCloseTo(card.difficulty, 10)
    expect(roundTripped.stability).toBe(card.stability)
    expect(new Date(roundTripped.nextReview).toISOString()).toBe(data.next_review_at)
    expect(roundTripped.reps).toBe(card.reps)
    expect(roundTripped.state).toBe("review")
  })
})
