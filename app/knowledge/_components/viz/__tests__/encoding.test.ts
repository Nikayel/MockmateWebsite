import { describe, it, expect } from "vitest"
import { featherFor } from "../RecallDial"
import { describeTrend } from "../ScoreTrack"

/**
 * The two pieces of these marks that carry a claim rather than a pixel.
 *
 * The dial's feather says "this is how sure the model is"; the track's sentence IS
 * the chart for anyone using a screen reader. Both can lie without looking broken,
 * which is why they are pinned here rather than left to visual review.
 */
describe("featherFor", () => {
  it("never widens as evidence accumulates", () => {
    // The contract of the encoding. If this inverts anywhere, a well-evidenced card
    // renders as the uncertain one and the mark is actively misleading.
    const widths = [0, 1, 2, 3, 4, 5, 6, 7, 8, 20, 500].map(featherFor)
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]).toBeLessThanOrEqual(widths[i - 1])
    }
  })

  it("treats an unknown review count as the least evidence, not the most", () => {
    // null must not read as a confident estimate.
    expect(featherFor(null)).toBe(featherFor(0))
    expect(featherFor(undefined)).toBe(featherFor(0))
  })

  it("keeps the feather a visible minority of the arc", () => {
    // Above roughly a sixth of the sweep the tail stops reading as a fading end and
    // starts reading as a second, shorter arc.
    for (const n of [0, 1, 2, 5, 10]) {
      expect(featherFor(n)).toBeGreaterThan(0)
      expect(featherFor(n)).toBeLessThan(0.17)
    }
  })

  it("still fades a heavily reviewed card", () => {
    // Never zero: it is an estimate at ten reviews too, and a crisp end would say
    // otherwise.
    expect(featherFor(1000)).toBeGreaterThan(0)
  })
})

describe("describeTrend", () => {
  it("says nothing about a single review", () => {
    expect(describeTrend([70])).toBe("")
    expect(describeTrend([])).toBe("")
  })

  it("calls a rising history improving", () => {
    expect(describeTrend([30, 40, 50, 90])).toContain("improving")
  })

  it("calls a falling history slipping", () => {
    expect(describeTrend([90, 88, 91, 60])).toContain("slipping")
  })

  it("calls a flat history steady rather than inventing a direction", () => {
    expect(describeTrend([80, 80, 80, 80])).toContain("steady")
    expect(describeTrend([78, 82, 79, 81])).toContain("steady")
  })

  it("is not fooled by one early outlier", () => {
    // Comparing last-vs-first would call this "improving" off a single bad opening
    // score. Against the mean of everything prior, it is steady.
    expect(describeTrend([20, 85, 84, 86, 85])).toContain("steady")
  })
})
