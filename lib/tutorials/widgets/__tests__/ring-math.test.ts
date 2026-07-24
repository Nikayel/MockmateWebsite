/**
 * Table-driven remap-fraction tests (Iteration 5 exit criteria). The whole point of
 * the widget is the CONTRAST: adding a node under modulo reshuffles most keys, on
 * the ring it moves roughly 1/N of them, and vnodes tame the skew. These pin that
 * story numerically for the seeded key set the widget actually renders.
 */
import { describe, it, expect } from "vitest"
import { assignKeys, keyNames, maxShare, nodeNames, remapStats, ringPoints } from "../ring-math"

const KEYS = keyNames(48)

function remapAfterAddingNode(mode: "modulo" | "ring", from: number, vnodes = 1) {
  const before = assignKeys({ nodes: nodeNames(from), keys: KEYS, mode, vnodes })
  const after = assignKeys({ nodes: nodeNames(from + 1), keys: KEYS, mode, vnodes })
  return remapStats(before.owner, after.owner)
}

describe("ring math", () => {
  it("is deterministic: identical inputs produce identical assignments", () => {
    const a = assignKeys({ nodes: nodeNames(4), keys: KEYS, mode: "ring", vnodes: 16 })
    const b = assignKeys({ nodes: nodeNames(4), keys: KEYS, mode: "ring", vnodes: 16 })
    expect(a).toEqual(b)
  })

  it.each([{ from: 3 }, { from: 4 }, { from: 5 }])(
    "modulo add-node from $from nodes reshuffles most keys",
    ({ from }) => {
      const stats = remapAfterAddingNode("modulo", from)
      // Theory: ~N/(N+1) of keys move. Assert the story: well over half.
      expect(stats.fraction).toBeGreaterThan(0.5)
    }
  )

  it.each([{ from: 3 }, { from: 4 }, { from: 5 }])(
    "ring add-node from $from nodes moves roughly 1/(N+1) of keys",
    ({ from }) => {
      const stats = remapAfterAddingNode("ring", from, 16)
      const ideal = 1 / (from + 1)
      // Seeded-sample tolerance: within [0.2x, 2.5x] of ideal, and far below modulo.
      expect(stats.fraction).toBeGreaterThan(ideal * 0.2)
      expect(stats.fraction).toBeLessThan(ideal * 2.5)
      expect(stats.fraction).toBeLessThan(remapAfterAddingNode("modulo", from).fraction)
    }
  )

  it("only keys previously assigned count as moved", () => {
    const stats = remapStats({ "key-1": "A" }, { "key-1": "A", "key-2": "B" })
    expect(stats).toEqual({ moved: 0, total: 2, fraction: 0 })
  })

  it("virtual nodes reduce the load skew of the seeded set", () => {
    const nodes = nodeNames(4)
    const single = maxShare(assignKeys({ nodes, keys: KEYS, mode: "ring", vnodes: 1 }))
    const many = maxShare(assignKeys({ nodes, keys: KEYS, mode: "ring", vnodes: 32 }))
    expect(many).toBeLessThan(single)
    // And lands near the ideal quarter for this seed.
    expect(many).toBeLessThan(0.45)
  })

  it("every key has exactly one owner in both modes", () => {
    for (const mode of ["modulo", "ring"] as const) {
      const { owner } = assignKeys({ nodes: nodeNames(5), keys: KEYS, mode, vnodes: 8 })
      expect(Object.keys(owner)).toHaveLength(KEYS.length)
      for (const key of KEYS) expect(nodeNames(5)).toContain(owner[key])
    }
  })

  it("ring points are sorted and sized nodes x vnodes", () => {
    const points = ringPoints(nodeNames(3), 8)
    expect(points).toHaveLength(24)
    for (let i = 1; i < points.length; i++)
      expect(points[i].position).toBeGreaterThanOrEqual(points[i - 1].position)
  })

  it("wraps past 12 o'clock: a key beyond the last point belongs to the first point", () => {
    const points = ringPoints(nodeNames(3), 1)
    const last = points[points.length - 1]
    const { owner } = assignKeys({
      nodes: nodeNames(3),
      keys: KEYS,
      mode: "ring",
      vnodes: 1,
    })
    // Any seeded key positioned after the last node point must wrap to points[0].
    const wrapped = KEYS.filter((k) => {
      const pos = fnvPos(k)
      return pos > last.position
    })
    for (const key of wrapped) expect(owner[key]).toBe(points[0].node)
  })
})

// Local mirror of ringPosition for the wrap assertion without exporting internals twice.
import { ringPosition as fnvPos } from "../ring-math"
