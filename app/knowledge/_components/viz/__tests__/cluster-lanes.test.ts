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
      if (Math.abs(values[i] - values[j]) < epsilon && lanes[i].lane === lanes[j].lane) return true
    }
  }
  return false
}

const STRIP_HEIGHT = 40
/** The hit band the component renders for dot i: [top, top + step). */
function band(values: number[], i: number) {
  const { lane, step } = clusterLanes(values)[i]
  const top = STRIP_HEIGHT / 2 + lane - step / 2
  return { top, bottom: top + step, markCentre: STRIP_HEIGHT / 2 + lane }
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
    const sum = clusterLanes([50, 50.4, 50.8, 51.2, 51.6]).reduce((a, b) => a + b.lane, 0)
    expect(Math.abs(sum)).toBeLessThan(1e-9)
  })

  it("resets the cycle after a gap, so a later cluster starts from lane 0 again", () => {
    const lanes = clusterLanes([10, 11, 40, 41])
    expect(lanes[0]).toEqual(lanes[2])
    expect(lanes[1]).toEqual(lanes[3])
    expect(lanes[0]).not.toEqual(lanes[1])
  })

  it("puts an isolated dot on the centre lane, with the full hit target", () => {
    expect(clusterLanes([10, 40, 80])).toEqual([
      { lane: 0, step: 24 },
      { lane: 0, step: 24 },
      { lane: 0, step: 24 },
    ])
  })

  it("treats exactly-epsilon apart as separate, not clustered", () => {
    // The boundary: 3 points apart is far enough to read as two dots unaided.
    expect(clusterLanes([50, 53])).toEqual([
      { lane: 0, step: 24 },
      { lane: 0, step: 24 },
    ])
  })

  it("returns one lane per value, for any input length", () => {
    for (const n of [0, 1, 7, 12]) {
      const values = Array.from({ length: n }, (_, i) => i * 8)
      expect(clusterLanes(values)).toHaveLength(n)
    }
  })

  it("keeps every lane inside the strip box", () => {
    const lanes = clusterLanes(Array.from({ length: 12 }, (_, i) => 50 + i * 0.4))
    for (const { lane } of lanes) expect(Math.abs(lane)).toBeLessThanOrEqual(8)
  })
})

/**
 * The property two failed attempts at this bug both lacked. Lane distinctness is not
 * enough: the first fix offset only the 10px mark, the second offset the 24px button
 * but left boxes overlapping by 16-20px, and in BOTH a mark's centre landed inside a
 * neighbour's box — so clicking a dot opened a different card's evidence.
 */
describe("hit bands resolve to their own dot", () => {
  for (const n of [1, 2, 3, 5, 12]) {
    it(`a run of ${n} never puts a mark inside a neighbour's band`, () => {
      const values = Array.from({ length: n }, (_, i) => 50 + i * 0.3)
      for (let i = 0; i < n; i++) {
        const mine = band(values, i)
        for (let j = 0; j < n; j++) {
          if (i === j) continue
          const other = band(values, j)
          const inside = mine.markCentre >= other.top && mine.markCentre < other.bottom
          expect(inside, `dot ${i}'s mark fell in dot ${j}'s band`).toBe(false)
        }
      }
    })
  }

  it("tiles without gaps inside a run, so no click falls between dots", () => {
    const values = [50, 50.3, 50.6, 50.9]
    for (let i = 1; i < values.length; i++) {
      expect(band(values, i).top).toBeCloseTo(band(values, i - 1).bottom, 6)
    }
  })

  it("keeps every band inside the strip box", () => {
    for (const n of [1, 2, 3, 5, 12]) {
      const values = Array.from({ length: n }, (_, i) => 50 + i * 0.3)
      for (let i = 0; i < n; i++) {
        expect(band(values, i).top).toBeGreaterThanOrEqual(0)
        expect(band(values, i).bottom).toBeLessThanOrEqual(STRIP_HEIGHT)
      }
    }
  })
})
