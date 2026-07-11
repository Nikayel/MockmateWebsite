/**
 * Pure compute behind the SQL diagrams. Kept framework-free so the join-matching,
 * window-frame, and grouping math is unit-tested directly (this is exactly the
 * "handle NULLs / empty sets / the actual semantics" surface that must not drift
 * from what the lesson teaches). Renderers consume these; they own no logic.
 */
import type { DiagramCell, GroupBySpec, JoinSpec, PipelineSpec, WindowFrameSpec } from "./schema"

// ---- JOIN row-matching ----

export interface JoinOutputRow {
  left: DiagramCell[] | null
  right: DiagramCell[] | null
  matched: boolean
}

export interface JoinStep {
  /** Which side's row this step walks. */
  side: "left" | "right-only"
  rowIndex: number
  /** Indices on the OTHER table that matched this row's key. */
  matches: number[]
  /** Output rows this step contributes (already NULL-filled per join kind). */
  emits: JoinOutputRow[]
}

function keyIndex(columns: string[], col: string): number {
  const i = columns.indexOf(col)
  if (i < 0) throw new Error(`join key "${col}" is not a column`)
  return i
}

/** SQL NULL never equals NULL in a join, so a null key matches nothing. */
function keysEqual(a: DiagramCell, b: DiagramCell): boolean {
  if (a === null || b === null) return false
  return a === b
}

/**
 * Walk the join as a learner would: for each left row, find the right rows whose key
 * matches, emit the paired (or NULL-filled) output, then — for right/full joins — a
 * trailing pass over the right rows that never matched. The step list drives the
 * animation; the flattened `output` is the final result set.
 */
export function computeJoinSteps(spec: JoinSpec): { steps: JoinStep[]; output: JoinOutputRow[] } {
  const li = keyIndex(spec.left.columns, spec.on[0])
  const ri = keyIndex(spec.right.columns, spec.on[1])
  const { kind } = spec

  const rightMatched = new Set<number>()
  const steps: JoinStep[] = []

  spec.left.rows.forEach((lrow, lIdx) => {
    const matches: number[] = []
    spec.right.rows.forEach((rrow, rIdx) => {
      if (keysEqual(lrow[li], rrow[ri])) matches.push(rIdx)
    })
    matches.forEach((m) => rightMatched.add(m))

    const emits: JoinOutputRow[] = []
    if (kind === "anti") {
      if (matches.length === 0) emits.push({ left: lrow, right: null, matched: false })
    } else if (matches.length > 0) {
      matches.forEach((m) => emits.push({ left: lrow, right: spec.right.rows[m], matched: true }))
    } else if (kind === "left" || kind === "full") {
      // Unmatched left row is preserved with NULLs on the right.
      emits.push({ left: lrow, right: null, matched: false })
    }
    // inner + right: an unmatched left row emits nothing here.

    steps.push({ side: "left", rowIndex: lIdx, matches, emits })
  })

  if (kind === "right" || kind === "full") {
    spec.right.rows.forEach((rrow, rIdx) => {
      if (rightMatched.has(rIdx)) return
      steps.push({
        side: "right-only",
        rowIndex: rIdx,
        matches: [],
        emits: [{ left: null, right: rrow, matched: false }],
      })
    })
  }

  const output = steps.flatMap((s) => s.emits)
  return { steps, output }
}

// ---- window frames ----

export interface WindowFrameStep {
  /** Inclusive frame bounds over the row list at the current row. */
  frameStart: number
  frameEnd: number
  /** The aggregate over the frame, e.g. the running total at this row. */
  value: number
}

function aggregate(values: number[], fn: string): number {
  const f = fn.toUpperCase()
  if (values.length === 0) return 0
  const sum = values.reduce((a, b) => a + b, 0)
  switch (f) {
    case "AVG":
      return sum / values.length
    case "COUNT":
      return values.length
    case "MIN":
      return Math.min(...values)
    case "MAX":
      return Math.max(...values)
    default:
      return sum // SUM
  }
}

/** Parse the frame width: `running` = all preceding, `moving-N` = N-1 preceding + current. */
function frameLookback(frame: WindowFrameSpec["frame"]): number | "all" {
  if (frame === "running") return "all"
  const n = Number(frame.split("-")[1])
  return Math.max(1, n) - 1
}

export function computeWindowFrame(spec: WindowFrameSpec): WindowFrameStep[] {
  const values = spec.rows.map((r) => r.value)
  const lookback = frameLookback(spec.frame)
  return spec.rows.map((_, i) => {
    const start = lookback === "all" ? 0 : Math.max(0, i - lookback)
    const value = aggregate(values.slice(start, i + 1), spec.fn)
    return { frameStart: start, frameEnd: i, value }
  })
}

// ---- GROUP BY bucketing ----

export interface GroupBucket {
  group: string
  /** Indices into spec.rows that fell into this group, in appearance order. */
  members: number[]
  value: number
}

export function computeGroupBuckets(spec: GroupBySpec): GroupBucket[] {
  const order: string[] = []
  const byGroup = new Map<string, number[]>()
  spec.rows.forEach((r, i) => {
    if (!byGroup.has(r.group)) {
      byGroup.set(r.group, [])
      order.push(r.group)
    }
    byGroup.get(r.group)!.push(i)
  })
  return order.map((group) => {
    const members = byGroup.get(group)!
    const value = aggregate(
      members.map((i) => spec.rows[i].value),
      spec.agg
    )
    return { group, members, value }
  })
}

// ---- pipeline preset ----

export interface PipelineStage {
  label: string
  note?: string
}

/** The canonical logical order SQL evaluates a SELECT — the misconception this fixes. */
export const SQL_SELECT_STAGES: PipelineStage[] = [
  { label: "FROM / JOIN", note: "assemble the rows" },
  { label: "WHERE", note: "keep rows that pass" },
  { label: "GROUP BY", note: "collapse into groups" },
  { label: "HAVING", note: "keep groups that pass" },
  { label: "SELECT", note: "project columns + window fns" },
  { label: "ORDER BY", note: "sort the result" },
]

export function expandPipeline(spec: PipelineSpec): PipelineStage[] {
  if (spec.stages && spec.stages.length > 0) return spec.stages
  if (spec.preset === "sql-select") return SQL_SELECT_STAGES
  return SQL_SELECT_STAGES
}
