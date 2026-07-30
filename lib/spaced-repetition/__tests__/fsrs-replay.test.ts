/**
 * Tests for scheduleFSRS's explicit review-time parameter — the primitive the
 * learner-model challenge amendment uses to replay a past review with a
 * corrected rating.
 */

import { describe, it, expect } from "vitest"
import { createFSRSCard, scheduleFSRS, DEFAULT_FSRS_CONFIG, type FSRSCard } from "../fsrs-algorithm"

const T0 = new Date("2026-07-01T10:00:00.000Z")
const T1 = new Date("2026-07-10T10:00:00.000Z")

function reviewedCard(): FSRSCard {
  // A card that went through one Good review at T0.
  return scheduleFSRS(createFSRSCard(T0), 3, DEFAULT_FSRS_CONFIG, T0)
}

describe("scheduleFSRS with explicit review time", () => {
  it("is deterministic: same card + rating + time => identical result", () => {
    const a = scheduleFSRS(reviewedCard(), 3, DEFAULT_FSRS_CONFIG, T1)
    const b = scheduleFSRS(reviewedCard(), 3, DEFAULT_FSRS_CONFIG, T1)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it("stamps lastReview with the provided time (replay, not wall clock)", () => {
    const result = scheduleFSRS(reviewedCard(), 3, DEFAULT_FSRS_CONFIG, T1)
    expect(result.lastReview?.toISOString()).toBe(T1.toISOString())
  })

  it("a replayed Good outcome beats the penalized Again outcome (amendment premise)", () => {
    const card = reviewedCard()
    const again = scheduleFSRS(card, 1, DEFAULT_FSRS_CONFIG, T1)
    const good = scheduleFSRS(card, 3, DEFAULT_FSRS_CONFIG, T1)

    expect(good.stability).toBeGreaterThan(again.stability)
    expect(again.lapses).toBe(card.lapses + 1)
    expect(good.lapses).toBe(card.lapses)
  })

  it("survives JSON round-trip the way event snapshots are stored", () => {
    const card = reviewedCard()
    const revived = JSON.parse(JSON.stringify(card)) as FSRSCard
    // Dates deserialize as strings; the reconstruct path converts them.
    const rehydrated: FSRSCard = {
      ...revived,
      lastReview: revived.lastReview ? new Date(revived.lastReview) : null,
      nextReview: new Date(revived.nextReview),
    }

    const fromOriginal = scheduleFSRS(card, 3, DEFAULT_FSRS_CONFIG, T1)
    const fromSnapshot = scheduleFSRS(rehydrated, 3, DEFAULT_FSRS_CONFIG, T1)
    expect(fromSnapshot.stability).toBeCloseTo(fromOriginal.stability, 10)
    expect(fromSnapshot.difficulty).toBeCloseTo(fromOriginal.difficulty, 10)
  })
})
