import { describe, it, expect } from "vitest"
import { clusterLanes } from "../ConceptRiskStrip"

/**
 * One property matters here: within a run of near-coincident dots, no two share a
 * lane. When they do, a card becomes invisible AND its hit target is fully occluded
 * by the card on top of it — a problem you cannot click, on the strip whose job is
 * to surface exactly those.
 *
 * The original compare-to-previous nudge failed at 3 dots; the 3-lane cycle that
 * replaced it failed at 4.
 */
function overlaps(values: number[], epsilon = 3): boolean {
  const lanes = clusterLanes(values)
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      // Same visual position and same lane === one dot hidden under another.
      if (Math.abs(values[i] - values[j]) < epsilon && lanes[i] === lanes[j]) return true
    }
  }
  return false
}

describe("clusterLanes", () => {
  it("separates a run of two", () => {
    expect(overlaps([50, 51])).toBe(false)
  })

  it("separates a run of three — the compare-to-previous failure", () => {
    expect(overlaps([50, 51, 52])).toBe(false)
  })

  it("separates a run of four — the three-lane-cycle failure", () => {
    expect(overlaps([50, 50.5, 51, 51.5])).toBe(false)
  })

  it("separates a run of five", () => {
    expect(overlaps([50, 50.4, 50.8, 51.2, 51.6])).toBe(false)
  })

  it("separates arbitrarily large runs — the modulo capacity is gone", () => {
    // Every fixed lane list fails at list-length + 1, because a modulo drops that
    // dot exactly onto the first one. Distributing by run length has no capacity.
    for (const n of [6, 7, 9, 15]) {
      const values = Array.from({ length: n }, (_, i) => 50 + i * 0.15)
      expect(overlaps(values)).toBe(false)
    }
  })

  it("is symmetric about the centre, so a cluster does not drift off-axis", () => {
    const lanes = clusterLanes([50, 50.4, 50.8, 51.2, 51.6])
    const sum = lanes.reduce((a, b) => a + b, 0)
    expect(Math.abs(sum)).toBeLessThan(1e-9)
  })

  it("resets the cycle after a gap, so a later cluster starts from lane 0 again", () => {
    const lanes = clusterLanes([10, 11, 40, 41])
    expect(lanes[0]).toBe(lanes[2])
    expect(lanes[1]).toBe(lanes[3])
    expect(lanes[0]).not.toBe(lanes[1])
  })

  it("puts an isolated dot on the centre lane", () => {
    expect(clusterLanes([10, 40, 80])).toEqual([0, 0, 0])
  })

  it("treats exactly-epsilon apart as separate, not clustered", () => {
    // The boundary: 3 points apart is far enough to read as two dots unaided.
    expect(clusterLanes([50, 53])).toEqual([0, 0])
  })

  it("returns one lane per value, for any input length", () => {
    for (const n of [0, 1, 7, 12]) {
      const values = Array.from({ length: n }, (_, i) => i * 8)
      expect(clusterLanes(values)).toHaveLength(n)
    }
  })

  it("keeps every lane inside the 24px hit box", () => {
    // The mark is 10px in a 24px box centred at 12: offsets beyond ±8 would push it
    // past the button that has to remain tappable.
    const lanes = clusterLanes(Array.from({ length: 12 }, (_, i) => 50 + i * 0.4))
    for (const lane of lanes) expect(Math.abs(lane)).toBeLessThanOrEqual(8)
  })
})
