/**
 * Tests for the plain-language belief translation.
 *
 * daysUntilRetentionDrops inverts the real ts-fsrs forgetting curve
 * numerically, so the properties under test are monotonicity and threshold
 * correctness rather than exact constants (which belong to the library).
 */

import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/firebase-admin", () => ({ adminDb: {} }))

import {
  daysUntilRetentionDrops,
  describeCardBelief,
  describeConceptBelief,
  SOLID_RECALL_THRESHOLD,
} from "../translate"
import { calculateRetrievability } from "../../spaced-repetition/fsrs-algorithm"

describe("daysUntilRetentionDrops", () => {
  it("returns 0 when recall is already below the threshold", () => {
    // Tiny stability, lots of elapsed time — long forgotten.
    expect(daysUntilRetentionDrops(0.5, 30)).toBe(0)
  })

  it("returns 0 for degenerate stability", () => {
    expect(daysUntilRetentionDrops(0, 0)).toBe(0)
    expect(daysUntilRetentionDrops(-1, 0)).toBe(0)
  })

  it("inverts the curve: retrievability at the returned day straddles the threshold", () => {
    const stability = 10
    const elapsed = 2
    const days = daysUntilRetentionDrops(stability, elapsed)

    expect(days).toBeGreaterThan(0)
    // Just before the returned day recall is still >= threshold; just after it is below.
    expect(calculateRetrievability(stability, elapsed + days - 1)).toBeGreaterThanOrEqual(
      SOLID_RECALL_THRESHOLD
    )
    expect(calculateRetrievability(stability, elapsed + days + 1)).toBeLessThan(
      SOLID_RECALL_THRESHOLD
    )
  })

  it("is monotonic in stability: stronger memory forgets later", () => {
    const weak = daysUntilRetentionDrops(2, 0)
    const strong = daysUntilRetentionDrops(50, 0)
    expect(strong).toBeGreaterThan(weak)
  })

  it("is monotonic in elapsed time: time already passed shortens the forecast", () => {
    const fresh = daysUntilRetentionDrops(20, 0)
    const stale = daysUntilRetentionDrops(20, 5)
    expect(stale).toBeLessThan(fresh)
  })
})

describe("describeCardBelief", () => {
  it("mentions the chance and the forecast for a healthy card", () => {
    // 72 -> 70: these sentences round through displayRetention, like every number
    // the page renders. They used to use Math.round, so the sentence and the rail
    // beside it stated two percentages for one estimate.
    const text = describeCardBelief(72, 4)
    expect(text).toContain("~70%")
    expect(text).toContain("4 days")
  })

  it("explains why a review is wanted when recall is already below solid", () => {
    const text = describeCardBelief(55, 0)
    expect(text).toContain("~55%")
    expect(text).toContain("review")
  })

  it("never states a percentage its own band word contradicts", () => {
    // 88 is Good; plain nearest-5 would print ~90%, the Strong floor. The whole
    // reason displayRetention exists — and the sentence must obey it too, because
    // it is the belief bar's accessible name and the expanded panel's prose.
    expect(describeCardBelief(88, 3)).toContain("~85%")
    expect(describeCardBelief(68, 0)).toContain("~65%")
  })
})

describe("describeConceptBelief", () => {
  it("summarizes healthy concepts without an at-risk clause", () => {
    // 88 -> 85, band-corrected off the Strong floor (see displayRetention).
    const text = describeConceptBelief("Two Pointers", 88, 5, 0)
    expect(text).toContain("~85%")
    expect(text).toContain("5 problems")
    expect(text).not.toContain("at risk")
  })

  it("calls out at-risk problems", () => {
    const text = describeConceptBelief("Graphs", 61, 4, 2)
    expect(text).toContain("2 problems are at risk")
  })
})
