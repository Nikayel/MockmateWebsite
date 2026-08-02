import { describe, it, expect } from "vitest"

/**
 * The forgetting curve's two numeric contracts, extracted as the component computes
 * them. Both failures were invisible in code review and obvious on screen: a hole in
 * the line exactly under the now-marker, and a dot floating off its own curve.
 *
 * Kept as arithmetic rather than a render test — the defects live in the maths, and
 * `elapsedDays` is fractional wall-clock, so the interesting cases are the ones that
 * never land on a sample.
 */
type P = { t: number; r: number }

/** Mirrors ForgettingCurve: past/future split plus the bridging vertex. */
function paths(points: P[], elapsedDays: number) {
  const past = points.filter((p) => p.t <= elapsedDays)
  const future = points.filter((p) => p.t >= elapsedDays)
  const lastPast = past[past.length - 1]
  const futurePath = lastPast && future[0] !== lastPast ? [lastPast, ...future] : future
  return { past, futurePath }
}

/** Mirrors ForgettingCurve's now-dot value. */
function nowR(points: P[], elapsedDays: number) {
  const after = points.find((p) => p.t >= elapsedDays)
  const before = [...points].reverse().find((p) => p.t <= elapsedDays)
  return before && after && after.t !== before.t
    ? before.r + ((after.r - before.r) * (elapsedDays - before.t)) / (after.t - before.t)
    : (after ?? points[points.length - 1]).r
}

const CURVE: P[] = [
  { t: 0, r: 100 },
  { t: 2, r: 90 },
  { t: 4, r: 80 },
  { t: 6, r: 70 },
  { t: 8, r: 60 },
]

describe("forgetting curve path split", () => {
  it("leaves no gap when now falls between samples", () => {
    // The regression: past ended at t=2 and future began at t=4, so the segment
    // straddling now was drawn by neither path — a hole under the now-line.
    const { past, futurePath } = paths(CURVE, 3)
    expect(past[past.length - 1].t).toBe(2)
    expect(futurePath[0].t).toBe(2)
  })

  it("does not duplicate the vertex when now lands exactly on a sample", () => {
    const { past, futurePath } = paths(CURVE, 4)
    expect(past[past.length - 1].t).toBe(4)
    expect(futurePath[0].t).toBe(4)
    expect(futurePath.filter((p) => p.t === 4)).toHaveLength(1)
  })

  it("still draws a forecast when only one sample remains ahead", () => {
    // Without the bridge, future.length === 1 failed the >= 2 guard and the entire
    // forecast tail vanished at exactly the moment it mattered most.
    const { futurePath } = paths(CURVE, 7)
    expect(futurePath.length).toBeGreaterThanOrEqual(2)
  })

  it("handles a freshly reviewed card, where nothing is past", () => {
    const { past, futurePath } = paths(CURVE, 0)
    expect(past).toHaveLength(1)
    expect(futurePath[0].t).toBe(0)
    expect(futurePath).toHaveLength(CURVE.length)
  })
})

describe("forgetting curve now-dot", () => {
  it("interpolates between the flanking samples", () => {
    // Taking the NEXT sample's value floated the dot off the curve at the one x
    // where the two must coincide.
    expect(nowR(CURVE, 3)).toBe(85)
    expect(nowR(CURVE, 5)).toBe(75)
  })

  it("returns the sample exactly when now lands on one", () => {
    expect(nowR(CURVE, 4)).toBe(80)
    expect(nowR(CURVE, 0)).toBe(100)
  })

  it("falls back to the window edge, never to zero, when elapsed outruns the samples", () => {
    // A tab left open for days. "At or below the edge" is the honest claim; the old
    // `?? 0` asserted certain failure with no data behind it.
    expect(nowR(CURVE, 99)).toBe(60)
  })

  it("never reports recall the curve does not contain", () => {
    for (const t of [0, 0.5, 1, 3.7, 6.2, 8, 20]) {
      const r = nowR(CURVE, t)
      expect(r).toBeLessThanOrEqual(100)
      expect(r).toBeGreaterThanOrEqual(60)
    }
  })
})
