import { describe, it, expect } from "vitest"

/**
 * The forgetting curve's y-domain.
 *
 * A fixed 0-100 domain made a healthy card's entire curve — FSRS keeps it inside
 * r=[100, 85.3] until the solid-recall crossing — occupy 14px of a 96px frame, so
 * the page's mechanism visual read as flat under a caption asserting decay. The
 * data-driven floor fixes that, but it introduces three ways to break silently:
 * a zero span (NaN coordinates, nothing renders), a floor above the threshold
 * (the crossing the caption describes falls out of frame), and a floor above the
 * data (points silently clamped, distorting the slope).
 *
 * Mirrors ForgettingCurve exactly.
 */
const SOLID_RECALL_PCT = 90
const rFloorOf = (points: number[]) => Math.max(0, Math.min(SOLID_RECALL_PCT - 5, ...points) - 4)

/** The widest domain the floor can ever produce, and the narrowest. */
const MIN_SPAN = 19

describe("forgetting curve y-domain", () => {
  const cases: Array<[string, number[]]> = [
    ["healthy card, barely decayed", [100, 96, 92, 88, 85.3]],
    ["overdue card", [100, 88, 74, 65, 55]],
    ["deeply forgotten", [100, 40, 20, 5, 0]],
    ["flat at full recall", [100, 100, 100]],
    ["flat mid-range", [40, 40, 40]],
    ["single sample", [88]],
  ]

  it("never produces a zero or negative span", () => {
    // rSpan is the divisor in y(); a zero span yields NaN coordinates and the whole
    // mark silently disappears. The floor is capped at SOLID-5-4 = 81, so the span
    // can never drop below 19 however the data moves.
    for (const [name, points] of cases) {
      const span = 100 - rFloorOf(points)
      expect(span, name).toBeGreaterThanOrEqual(MIN_SPAN)
    }
  })

  it("always keeps the solid-recall threshold in frame", () => {
    // The figcaption talks about where the curve crosses this line. If the floor
    // rose above it, the caption would describe something off-screen.
    for (const [name, points] of cases) {
      expect(rFloorOf(points), name).toBeLessThanOrEqual(SOLID_RECALL_PCT)
    }
  })

  it("never clamps a real data point, so the slope is never distorted", () => {
    // y() clamps r to the floor defensively. If the floor could exceed the data,
    // the tail would flatten against the axis and the mark would understate decay.
    for (const [name, points] of cases) {
      const floor = rFloorOf(points)
      expect(Math.min(...points), name).toBeGreaterThanOrEqual(floor)
    }
  })

  it("never floors below zero", () => {
    expect(rFloorOf([3, 2, 1, 0])).toBe(0)
    expect(rFloorOf([0])).toBe(0)
  })

  it("actually fixes the flatness it was written for", () => {
    // The regression, in the units that matter: a healthy card in the h-24 full
    // variant. 14px of travel is a flat line; anything past ~50px reads as decay.
    const healthy = [100, 96.5, 93, 90, 87.5, 85.3]
    const travelAt = (span: number) => ((Math.max(...healthy) - Math.min(...healthy)) / span) * 96
    expect(travelAt(100)).toBeLessThan(20) // the old fixed domain
    expect(travelAt(100 - rFloorOf(healthy))).toBeGreaterThan(50)
  })
})
