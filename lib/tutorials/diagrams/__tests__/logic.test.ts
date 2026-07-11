/**
 * SQL diagram logic — the semantics that MUST match what the lesson teaches. Joins
 * (each kind + NULL keys + fan-out), window frames (running vs moving), and grouping
 * are covered here so a visual can never quietly show the wrong result.
 */
import { describe, it, expect } from "vitest"
import { computeJoinSteps, computeWindowFrame, computeGroupBuckets, expandPipeline } from "../logic"
import type { JoinSpec, WindowFrameSpec, GroupBySpec, PipelineSpec } from "../schema"

const users = {
  name: "users",
  columns: ["id", "name"],
  rows: [
    [1, "Ada"],
    [2, "Lin"],
    [3, "Sam"],
  ],
}
const orders = {
  name: "orders",
  columns: ["user_id", "total"],
  rows: [
    [1, 50],
    [1, 20],
    [2, 99],
  ], // Ada has 2 orders (fan-out), Lin 1, Sam none; no user 4
}

function join(kind: JoinSpec["kind"]): JoinSpec {
  return { type: "join", kind, left: users, right: orders, on: ["id", "user_id"] }
}

describe("computeJoinSteps", () => {
  it("inner join keeps only matched rows and fans out Ada's two orders", () => {
    const { output } = computeJoinSteps(join("inner"))
    expect(output).toHaveLength(3) // 2 (Ada) + 1 (Lin), Sam dropped
    expect(output.every((r) => r.matched)).toBe(true)
  })

  it("left join preserves the unmatched left row (Sam) with a NULL right", () => {
    const { output } = computeJoinSteps(join("left"))
    expect(output).toHaveLength(4) // inner 3 + Sam
    const sam = output.find((r) => r.left?.[1] === "Sam")
    expect(sam?.right).toBeNull()
    expect(sam?.matched).toBe(false)
  })

  it("anti join returns ONLY unmatched left rows (Sam), never a paired row", () => {
    const { output } = computeJoinSteps(join("anti"))
    expect(output).toHaveLength(1)
    expect(output[0].left?.[1]).toBe("Sam")
    expect(output[0].right).toBeNull()
  })

  it("right join appends right rows that never matched", () => {
    const withGhost: JoinSpec = {
      ...join("right"),
      right: { ...orders, rows: [...orders.rows, [9, 5]] }, // order for missing user 9
    }
    const { steps, output } = computeJoinSteps(withGhost)
    expect(steps.some((s) => s.side === "right-only")).toBe(true)
    const ghost = output.find((r) => r.left === null)
    expect(ghost?.right?.[0]).toBe(9)
  })

  it("full join keeps unmatched from BOTH sides", () => {
    const withGhost: JoinSpec = {
      ...join("full"),
      right: { ...orders, rows: [...orders.rows, [9, 5]] },
    }
    const { output } = computeJoinSteps(withGhost)
    expect(output.some((r) => r.left?.[1] === "Sam" && r.right === null)).toBe(true) // left-only
    expect(output.some((r) => r.left === null && r.right?.[0] === 9)).toBe(true) // right-only
  })

  it("a NULL join key matches nothing (SQL NULL semantics)", () => {
    const spec: JoinSpec = {
      type: "join",
      kind: "inner",
      left: { name: "l", columns: ["k"], rows: [[null]] },
      right: { name: "r", columns: ["k"], rows: [[null]] },
      on: ["k", "k"],
    }
    expect(computeJoinSteps(spec).output).toHaveLength(0)
  })

  it("handles an empty right table for a left join", () => {
    const spec: JoinSpec = { ...join("left"), right: { ...orders, rows: [] } }
    const { output } = computeJoinSteps(spec)
    expect(output).toHaveLength(3) // all left rows preserved, all NULL right
    expect(output.every((r) => r.right === null)).toBe(true)
  })
})

describe("computeWindowFrame", () => {
  const rows = [
    { label: "Jan", value: 100 },
    { label: "Feb", value: 200 },
    { label: "Mar", value: 300 },
  ]

  it("running SUM accumulates 100 -> 300 -> 600", () => {
    const spec: WindowFrameSpec = { type: "window-frame", fn: "SUM", frame: "running", rows }
    expect(computeWindowFrame(spec).map((s) => s.value)).toEqual([100, 300, 600])
    expect(computeWindowFrame(spec)[2].frameStart).toBe(0)
  })

  it("moving-2 SUM only looks back one row", () => {
    const spec: WindowFrameSpec = { type: "window-frame", fn: "SUM", frame: "moving-2", rows }
    const steps = computeWindowFrame(spec)
    expect(steps.map((s) => s.value)).toEqual([100, 300, 500]) // 100, 100+200, 200+300
    expect(steps[2].frameStart).toBe(1)
  })

  it("moving-2 AVG computes a moving average", () => {
    const spec: WindowFrameSpec = { type: "window-frame", fn: "AVG", frame: "moving-2", rows }
    expect(computeWindowFrame(spec).map((s) => s.value)).toEqual([100, 150, 250])
  })
})

describe("computeGroupBuckets", () => {
  it("buckets by group in first-appearance order and sums", () => {
    const spec: GroupBySpec = {
      type: "group-by",
      agg: "SUM",
      by: "dept",
      rows: [
        { group: "Eng", value: 100 },
        { group: "Sales", value: 80 },
        { group: "Eng", value: 50 },
      ],
    }
    const buckets = computeGroupBuckets(spec)
    expect(buckets.map((b) => b.group)).toEqual(["Eng", "Sales"])
    expect(buckets[0].value).toBe(150)
    expect(buckets[0].members).toEqual([0, 2])
  })

  it("COUNT counts members", () => {
    const spec: GroupBySpec = {
      type: "group-by",
      agg: "COUNT",
      by: "x",
      rows: [
        { group: "a", value: 1 },
        { group: "a", value: 9 },
      ],
    }
    expect(computeGroupBuckets(spec)[0].value).toBe(2)
  })
})

describe("expandPipeline", () => {
  it("sql-select preset expands to the six logical stages in order", () => {
    const spec: PipelineSpec = { type: "pipeline", preset: "sql-select" }
    const stages = expandPipeline(spec)
    expect(stages.map((s) => s.label)).toEqual([
      "FROM / JOIN",
      "WHERE",
      "GROUP BY",
      "HAVING",
      "SELECT",
      "ORDER BY",
    ])
  })

  it("explicit stages win over the preset", () => {
    const spec: PipelineSpec = {
      type: "pipeline",
      stages: [{ label: "A" }, { label: "B" }],
    }
    expect(expandPipeline(spec).map((s) => s.label)).toEqual(["A", "B"])
  })
})
