import { describe, it, expect } from "vitest"
import { calibrationOf, type EvidenceRowView } from "../EvidenceList"

/**
 * The calibration headline is the page claiming a hit rate about itself. If it can
 * overstate, the open learner model is doing exactly what it exists to prevent, so
 * the rules worth pinning are: never invent a number, and never count a review the
 * scheduler never judged.
 */
function row(overrides: Partial<EvidenceRowView>): EvidenceRowView {
  return {
    event_id: "e",
    timestamp: "2026-07-20T00:00:00.000Z",
    mastery_score: 70,
    score: 70,
    hints_used: null,
    is_first_review: false,
    predicted_retention: 80,
    actual_retention: true,
    retention_as_predicted: true,
    interval_before_days: null,
    interval_after_days: null,
    stability_before: null,
    stability_after: null,
    ...overrides,
  }
}

describe("calibrationOf", () => {
  it("counts hits against judged reviews", () => {
    expect(
      calibrationOf([
        row({ event_id: "a", retention_as_predicted: true }),
        row({ event_id: "b", retention_as_predicted: false }),
        row({ event_id: "c", retention_as_predicted: true }),
      ])
    ).toEqual({ hits: 2, total: 3 })
  })

  it("returns null rather than a number when nothing was judged", () => {
    // Legacy events predate retention_as_predicted. Reporting 0 of 0, or silently
    // treating unjudged as correct, would both be fabrications.
    expect(calibrationOf([row({ retention_as_predicted: null })])).toBeNull()
    expect(calibrationOf([])).toBeNull()
  })

  it("excludes unjudged rows from the denominator", () => {
    // Not 1 of 2: a review the scheduler never judged is not evidence either way.
    expect(
      calibrationOf([
        row({ event_id: "a", retention_as_predicted: true }),
        row({ event_id: "b", retention_as_predicted: null }),
      ])
    ).toEqual({ hits: 1, total: 1 })
  })

  it("never scores a first review — the model had no prior belief to predict from", () => {
    // Both write paths pass predictedRetention: 0 for a first attempt, so
    // research-tracker derives (0 >= 50) === actualRetention: a passed first attempt
    // is stored as the model being WRONG, a failed one as the model being RIGHT.
    // Counting either fabricates a verdict on the row every card has.
    expect(
      calibrationOf([
        row({ event_id: "first", is_first_review: true, retention_as_predicted: false }),
      ])
    ).toBeNull()

    expect(
      calibrationOf([
        row({ event_id: "first", is_first_review: true, retention_as_predicted: false }),
        row({ event_id: "real", retention_as_predicted: true }),
      ])
    ).toEqual({ hits: 1, total: 1 })
  })

  it("does not credit a failed first attempt either", () => {
    // The bug ran both ways: a failed first attempt stored retention_as_predicted
    // true, which would have inflated the hit rate.
    expect(
      calibrationOf([
        row({ event_id: "first", is_first_review: true, retention_as_predicted: true }),
        row({ event_id: "real", retention_as_predicted: false }),
      ])
    ).toEqual({ hits: 0, total: 1 })
  })

  it("can report a perfect miss rate", () => {
    // The headline has to be able to say something unflattering, or it is marketing.
    expect(calibrationOf([row({ retention_as_predicted: false })])).toEqual({
      hits: 0,
      total: 1,
    })
  })
})
