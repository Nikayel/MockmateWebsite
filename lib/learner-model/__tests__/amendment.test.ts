/**
 * Tests for the Correct layer's pure amendment math.
 *
 * The properties that make corrections model-honest:
 * - typo replay from the event snapshot equals exactly what scheduleFSRS
 *   would have produced with the corrected rating at the original time
 *   (no ad-hoc stability bumps);
 * - corrections only ever improve on the recorded rating;
 * - the field fallback restores stability and removes the lapse only when
 *   the penalized review was rated Again;
 * - learned_elsewhere and the verification pull never touch memory state.
 */

import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/firebase-admin", () => ({ adminDb: {} }))

import {
  correctedRatingForReason,
  computeAmendedCard,
  applyVerificationPull,
  verificationDueAt,
} from "../amendment"
import {
  createFSRSCard,
  scheduleFSRS,
  DEFAULT_FSRS_CONFIG,
  type FSRSCard,
} from "../../spaced-repetition/fsrs-algorithm"
import type { AlgorithmResearchEvent } from "../../types"

const T0 = new Date("2026-07-01T10:00:00.000Z")
const T_REVIEW = new Date("2026-07-20T10:00:00.000Z")
const NOW = new Date("2026-07-29T12:00:00.000Z")

/** A card with history: Good at T0, then (penalized) Again at T_REVIEW. */
function preReviewCard(): FSRSCard {
  return scheduleFSRS(createFSRSCard(T0), 3, DEFAULT_FSRS_CONFIG, T0)
}

function penalizedCard(): FSRSCard {
  return scheduleFSRS(preReviewCard(), 1, DEFAULT_FSRS_CONFIG, T_REVIEW)
}

function eventWithSnapshot(qualityRating: number): AlgorithmResearchEvent {
  return {
    quality_rating: qualityRating,
    timestamp: T_REVIEW.toISOString(),
    pre_review: {
      interval_days: 3,
      days_since_last_review: 19,
      days_overdue: 0,
      stability: preReviewCard().stability,
      predicted_retention: 60,
      fsrs_card: JSON.stringify(preReviewCard()),
    },
    post_review: {
      new_interval_days: 1,
      mastery_level: "learning",
      mastery_level_changed: true,
    },
  } as unknown as AlgorithmResearchEvent
}

describe("correctedRatingForReason", () => {
  it("maps typo→Good(3), rushed→Hard(2), learned_elsewhere→null", () => {
    expect(correctedRatingForReason("typo")).toBe(3)
    expect(correctedRatingForReason("rushed")).toBe(2)
    expect(correctedRatingForReason("learned_elsewhere")).toBeNull()
  })
})

describe("computeAmendedCard — event snapshot replay", () => {
  it("typo replay equals direct scheduleFSRS(preCard, Good, t_review) — no ad-hoc math", () => {
    const result = computeAmendedCard(penalizedCard(), "typo", eventWithSnapshot(1), NOW)

    expect(result.source).toBe("event_snapshot")
    const direct = scheduleFSRS(preReviewCard(), 3, DEFAULT_FSRS_CONFIG, T_REVIEW)
    expect(result.card.stability).toBeCloseTo(direct.stability, 10)
    expect(result.card.difficulty).toBeCloseTo(direct.difficulty, 10)
    expect(result.card.lapses).toBe(direct.lapses)
  })

  it("typo restores stability above the penalized value and removes the lapse", () => {
    const penalized = penalizedCard()
    const result = computeAmendedCard(penalized, "typo", eventWithSnapshot(1), NOW)

    expect(result.card.stability).toBeGreaterThan(penalized.stability)
    expect(result.card.lapses).toBe(penalized.lapses - 1)
  })

  it("rushed (Hard) lands between the Again and Good outcomes", () => {
    const again = penalizedCard()
    const good = computeAmendedCard(again, "typo", eventWithSnapshot(1), NOW).card
    const hard = computeAmendedCard(again, "rushed", eventWithSnapshot(1), NOW).card

    expect(hard.stability).toBeGreaterThan(again.stability)
    expect(hard.stability).toBeLessThan(good.stability)
  })

  it("never downgrades: typo challenge on an Easy(4) review is a no-op", () => {
    const current = penalizedCard()
    const result = computeAmendedCard(current, "typo", eventWithSnapshot(4), NOW)
    expect(result.source).toBe("none")
    expect(result.card).toBe(current)
  })

  it("no-ops when the recorded rating already equals the correction", () => {
    const current = penalizedCard()
    expect(computeAmendedCard(current, "typo", eventWithSnapshot(3), NOW).source).toBe("none")
  })
})

describe("computeAmendedCard — field fallback (pre-snapshot events)", () => {
  function legacyEvent(qualityRating: number): AlgorithmResearchEvent {
    const event = eventWithSnapshot(qualityRating)
    delete (event.pre_review as { fsrs_card?: string }).fsrs_card
    return event
  }

  it("restores pre-review stability and decrements the lapse for Again reviews", () => {
    const penalized = penalizedCard()
    const result = computeAmendedCard(penalized, "typo", legacyEvent(1), NOW)

    expect(result.source).toBe("field_fallback")
    expect(result.card.stability).toBeCloseTo(preReviewCard().stability, 10)
    expect(result.card.lapses).toBe(penalized.lapses - 1)
    // Difficulty deliberately left as-is (conservative).
    expect(result.card.difficulty).toBe(penalized.difficulty)
  })

  it("does not decrement lapses when the penalized review was rated Hard", () => {
    const penalized = { ...penalizedCard(), lapses: 2 }
    const result = computeAmendedCard(penalized, "typo", legacyEvent(2), NOW)
    expect(result.card.lapses).toBe(2)
  })

  it("promotes relearning back to review", () => {
    const penalized: FSRSCard = { ...penalizedCard(), state: "relearning" }
    const result = computeAmendedCard(penalized, "typo", legacyEvent(1), NOW)
    expect(result.card.state).toBe("review")
  })
})

describe("computeAmendedCard — none paths", () => {
  it("learned_elsewhere never touches the card", () => {
    const current = penalizedCard()
    const result = computeAmendedCard(current, "learned_elsewhere", eventWithSnapshot(1), NOW)
    expect(result.source).toBe("none")
    expect(result.card).toBe(current)
  })

  it("no event at all → no state change", () => {
    const current = penalizedCard()
    expect(computeAmendedCard(current, "typo", null, NOW).source).toBe("none")
  })
})

describe("applyVerificationPull", () => {
  it("pulls the due date to tomorrow 09:00 UTC with interval metadata synced", () => {
    const { card, dueAt } = applyVerificationPull(penalizedCard(), NOW)
    expect(dueAt.toISOString()).toBe("2026-07-30T09:00:00.000Z")
    expect(card.nextReview.toISOString()).toBe(dueAt.toISOString())
    expect(card.scheduledDays).toBe(1)
    expect(card.elapsedDays).toBe(0)
  })

  it("never touches memory state (stability/difficulty/lapses deep-equal)", () => {
    const before = penalizedCard()
    const { card } = applyVerificationPull(before, NOW)
    expect(card.stability).toBe(before.stability)
    expect(card.difficulty).toBe(before.difficulty)
    expect(card.lapses).toBe(before.lapses)
    expect(card.state).toBe(before.state)
  })

  it("verificationDueAt is strictly in the future relative to now", () => {
    expect(verificationDueAt(NOW).getTime()).toBeGreaterThan(NOW.getTime())
  })
})
