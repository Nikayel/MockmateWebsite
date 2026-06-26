import { afterEach, describe, expect, it, vi } from "vitest"
import { createInitialState, prepareStateForStorage, reconstructState } from "../algorithm-router"
import {
  createFSRSCard,
  getEstimatedRetention,
  scheduleFSRS,
  type FSRSRating,
} from "../fsrs-algorithm"

describe("FSRS adapter", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("schedules stronger first-review ratings no worse than weaker ratings", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))

    const firstReviewResults = ([1, 2, 3, 4] as FSRSRating[]).map((rating) =>
      scheduleFSRS(createFSRSCard(new Date("2026-01-01T00:00:00.000Z")), rating)
    )

    expect(firstReviewResults[0].nextReview.getTime()).toBeLessThan(
      firstReviewResults[1].nextReview.getTime()
    )
    expect(firstReviewResults[1].nextReview.getTime()).toBeLessThan(
      firstReviewResults[2].nextReview.getTime()
    )
    expect(firstReviewResults[2].nextReview.getTime()).toBeLessThan(
      firstReviewResults[3].nextReview.getTime()
    )
    expect(firstReviewResults[0].stability).toBeLessThan(firstReviewResults[1].stability)
    expect(firstReviewResults[1].stability).toBeLessThan(firstReviewResults[2].stability)
    expect(firstReviewResults[2].stability).toBeLessThan(firstReviewResults[3].stability)
  })

  it("prepares complete FSRS fields for first mastery persistence", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))

    const initialState = createInitialState("fsrs", "medium")
    const reviewedCard = scheduleFSRS(initialState.fsrs_state!, 3)
    const storage = prepareStateForStorage({
      algorithm: "fsrs",
      interval_days: reviewedCard.scheduledDays,
      next_review_at: reviewedCard.nextReview.toISOString(),
      review_count: 1,
      mastery_level: "learning",
      confidence: 25,
      fsrs_state: reviewedCard,
    })

    expect(storage.fsrs_state).toEqual(expect.any(String))
    expect(storage.fsrs_difficulty).toEqual(reviewedCard.difficulty)
    expect(storage.fsrs_stability).toEqual(reviewedCard.stability)
    expect(storage.fsrs_lapses).toEqual(reviewedCard.lapses)
  })

  it("reconstructs legacy app FSRS cards and raw ts-fsrs cards", () => {
    const legacyState = reconstructState("fsrs", {
      interval_days: 3,
      next_review_at: "2026-01-04T00:00:00.000Z",
      review_count: 1,
      mastery_level: "reviewing",
      confidence: 20,
      fsrs_state: JSON.stringify({
        difficulty: 4,
        stability: 3,
        state: "review",
        lastReview: "2026-01-01T00:00:00.000Z",
        nextReview: "2026-01-04T00:00:00.000Z",
        reps: 1,
        lapses: 0,
        elapsedDays: 0,
        scheduledDays: 3,
      }),
    })

    expect(legacyState.fsrs_state?.state).toBe("review")
    expect(legacyState.fsrs_state?.lastReview).toEqual(new Date("2026-01-01T00:00:00.000Z"))
    expect(legacyState.fsrs_state?.nextReview).toEqual(new Date("2026-01-04T00:00:00.000Z"))

    const rawState = reconstructState("fsrs", {
      interval_days: 8,
      next_review_at: "2026-01-09T00:00:00.000Z",
      review_count: 1,
      mastery_level: "reviewing",
      confidence: 20,
      fsrs_state: JSON.stringify({
        due: "2026-01-09T00:00:00.000Z",
        stability: 8.29,
        difficulty: 1,
        elapsed_days: 0,
        scheduled_days: 8,
        reps: 1,
        lapses: 0,
        state: 2,
        last_review: "2026-01-01T00:00:00.000Z",
      }),
    })

    expect(rawState.fsrs_state?.state).toBe("review")
    expect(rawState.fsrs_state?.scheduledDays).toBe(8)
  })

  it("carries learned difficulty/stability across a persisted round-trip", () => {
    // Regression: the complete/mark-reviewed routes reconstructed state without
    // passing the stored FSRS fields, so every review rebuilt the card from
    // defaults (difficulty=5, stability=interval). This simulates the route
    // round-trip and asserts the learned state survives.
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))

    // Two reviews so difficulty/stability move away from the defaults.
    const firstReview = scheduleFSRS(createFSRSCard(new Date("2026-01-01T00:00:00.000Z")), 2)
    const secondReview = scheduleFSRS(firstReview, 4)

    const storage = prepareStateForStorage({
      algorithm: "fsrs",
      interval_days: secondReview.scheduledDays,
      next_review_at: secondReview.nextReview.toISOString(),
      review_count: 2,
      mastery_level: "reviewing",
      confidence: 40,
      fsrs_state: secondReview,
    })

    const reconstructed = reconstructState("fsrs", {
      interval_days: storage.interval_days as number,
      next_review_at: storage.next_review_at as string,
      review_count: 2,
      mastery_level: "reviewing",
      confidence: 40,
      fsrs_difficulty: storage.fsrs_difficulty as number,
      fsrs_stability: storage.fsrs_stability as number,
      fsrs_state: storage.fsrs_state as string,
      fsrs_lapses: storage.fsrs_lapses as number,
      last_reviewed_at: "2026-01-01T00:00:00.000Z",
    })

    expect(reconstructed.fsrs_state?.difficulty).toBeCloseTo(secondReview.difficulty, 5)
    expect(reconstructed.fsrs_state?.stability).toBeCloseTo(secondReview.stability, 5)
    expect(reconstructed.fsrs_state?.lapses).toBe(secondReview.lapses)
    // The learned difficulty must not silently collapse back to the neutral default.
    expect(reconstructed.fsrs_state?.difficulty).not.toBe(5)
  })

  it("persists the learning-step index through a round-trip", () => {
    const card = {
      difficulty: 5,
      stability: 2,
      state: "learning" as const,
      lastReview: new Date("2026-01-01T00:00:00.000Z"),
      nextReview: new Date("2026-01-02T00:00:00.000Z"),
      reps: 1,
      lapses: 0,
      learningSteps: 1,
      elapsedDays: 0,
      scheduledDays: 1,
    }

    const storage = prepareStateForStorage({
      algorithm: "fsrs",
      interval_days: 1,
      next_review_at: card.nextReview.toISOString(),
      review_count: 1,
      mastery_level: "learning",
      confidence: 20,
      fsrs_state: card,
    })

    const reconstructed = reconstructState("fsrs", {
      interval_days: 1,
      next_review_at: card.nextReview.toISOString(),
      review_count: 1,
      mastery_level: "learning",
      confidence: 20,
      fsrs_state: storage.fsrs_state as string,
    })

    expect(reconstructed.fsrs_state?.learningSteps).toBe(1)
  })

  it("estimates retention for reviewed cards", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))

    const reviewed = scheduleFSRS(createFSRSCard(), 3)

    vi.setSystemTime(new Date("2026-01-02T00:00:00.000Z"))

    expect(getEstimatedRetention(reviewed)).toBeGreaterThan(0)
    expect(getEstimatedRetention(reviewed)).toBeLessThanOrEqual(100)
  })
})
