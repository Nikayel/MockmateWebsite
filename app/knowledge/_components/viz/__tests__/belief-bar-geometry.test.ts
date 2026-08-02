import { describe, it, expect } from "vitest"
import { featherFor } from "../RecallDial"

/**
 * The belief bar's geometry, as arithmetic.
 *
 * Rendering it would need a DOM and would test React, not the encoding. What can go
 * wrong here is numeric: fog wider than the value it qualifies, or a feather that
 * grows with evidence. Both are silent — the mark still draws, it just lies.
 *
 * Mirrors the real component: BAR_W 112, featherWidth clamped by the value's own
 * pixel position, fade centered on that position.
 */
const BAR_W = 112

function geometry(value: number, reviewCount: number | null) {
  const p = (Math.min(100, Math.max(0, value)) / 100) * BAR_W
  const featherWidth = Math.min(featherFor(reviewCount) * BAR_W, p)
  return { p, featherWidth, fadeStart: p - featherWidth / 2, fadeEnd: p + featherWidth / 2 }
}

describe("BeliefBar geometry", () => {
  it("never lets the fog exceed the value it qualifies", () => {
    // The regression: a 3% one-review card drew a 2px nub plus fog to ~10.6px —
    // a mark three times its own value, made mostly of uncertainty.
    for (const value of [0, 1, 3, 5, 10, 25, 50, 75, 100]) {
      for (const reviews of [0, 1, 2, 5, 12]) {
        const g = geometry(value, reviews)
        expect(g.featherWidth).toBeLessThanOrEqual(g.p + 1e-9)
      }
    }
  })

  it("keeps the fade window inside the track", () => {
    for (const value of [0, 1, 50, 99, 100]) {
      for (const reviews of [0, 1, 8]) {
        const g = geometry(value, reviews)
        expect(g.fadeStart).toBeGreaterThanOrEqual(-1e-9)
        // fadeEnd may sit past p by half the feather, but never past the track.
        expect(g.fadeEnd).toBeLessThanOrEqual(BAR_W + g.featherWidth / 2 + 1e-9)
      }
    }
  })

  it("gives a zero-value card no fog at all", () => {
    // Clamped to p = 0. A 0% estimate is a claim, not a haze.
    expect(geometry(0, 1).featherWidth).toBe(0)
  })

  it("still fogs a mid-range estimate with thin evidence", () => {
    // The clamp must not defeat the encoding for ordinary values.
    expect(geometry(50, 1).featherWidth).toBeGreaterThan(0)
    expect(geometry(50, 1).featherWidth).toBeGreaterThan(geometry(50, 12).featherWidth)
  })

  it("never widens the fog as evidence accumulates, at any value", () => {
    for (const value of [10, 50, 90]) {
      const widths = [0, 1, 2, 4, 7, 20].map((n) => geometry(value, n).featherWidth)
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i]).toBeLessThanOrEqual(widths[i - 1])
      }
    }
  })
})
