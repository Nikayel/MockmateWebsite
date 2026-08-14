/**
 * Deterministic layered layout for topology diagrams — the schema-capped, authored
 * answer to the banned free-form graph.
 *
 * ## What it does
 *
 * Layer = longest path from a source over the LAYERING edge kinds. Replication and
 * feedback edges are excluded: replication is lateral (two replicas belong side by side,
 * not one downstream of the other) and feedback deliberately closes a cycle. Within a
 * layer, nodes are ordered by the mean position of their already-placed predecessors (a
 * barycenter sweep), falling back to declaration order, which keeps fan-outs from
 * crossing over each other.
 *
 * ## The bug this replaced, which was live
 *
 * The previous version relaxed longest-path over `spec.nodes.length` passes with no
 * acyclicity check, so every pass pushed each cycle member one column further right. A
 * six-node feedback loop settled at THIRTY-TWO columns and roughly 5,666 pixels, with the
 * arrow the lesson was about pointing backwards. It was cycle-SAFE in the narrow sense of
 * terminating, and the only guard on it (`expect(...).not.toThrow()`) tested exactly that
 * narrow sense. Measured on 2026-08-13, the shipped `sd-l10-web-crawler` diagram was
 * already laying out at 36 columns in production, so this was not a hypothetical waiting
 * for the conversion sweep to trigger it.
 *
 * Back edges are now found by depth-first search and removed from layering BEFORE the
 * longest-path pass, which is what a layered (Sugiyama-style) layout is supposed to do.
 * The removed edge is still drawn; it is drawn as a return arc. Column count is therefore
 * bounded by the node count, and `topology-integrity.test.ts` asserts that bound over
 * every authored spec.
 */
import type { TopologySpec } from "./schema"

export interface TopologyPosition {
  col: number
  row: number
}

type EdgeKind = TopologySpec["edges"][number]["kind"]

/**
 * The edge kinds that push a node downstream.
 *
 * `replication` is lateral by definition: a follower is beside its leader, not after it.
 * `feedback` closes a loop on purpose, so letting it layer would recreate the explosion
 * this module exists to prevent. Exported because the integrity test asserts that only
 * NON-layering edges are allowed to point backwards, and that rule has to read the same
 * set the layout used.
 */
export const LAYERING_KINDS: ReadonlySet<EdgeKind> = new Set<EdgeKind>(["sync", "async"])

interface LayoutEdge {
  from: string
  to: string
}

/**
 * Depth-first back-edge detection over the layering subgraph.
 *
 * An edge is a back edge when its target is still on the current DFS stack, which is the
 * textbook definition and is what makes the remaining graph acyclic. Roots are visited in
 * declaration order so the result is a pure function of the spec: two runs over the same
 * spec must produce identical coordinates or `content-integrity.test.ts`'s
 * byte-identical-twice assertion fails 1,600 tests at once.
 */
function findBackEdges(nodeIds: string[], edges: LayoutEdge[]): Set<number> {
  const outgoing = new Map<string, Array<{ to: string; index: number }>>()
  for (const id of nodeIds) outgoing.set(id, [])
  edges.forEach((edge, index) => {
    outgoing.get(edge.from)?.push({ to: edge.to, index })
  })

  const back = new Set<number>()
  const visited = new Set<string>()
  const onStack = new Set<string>()

  // Iterative rather than recursive: the node cap is 16, but a recursive walk over
  // authored data is the kind of thing that only stack-overflows in production.
  const walk = (root: string) => {
    const stack: Array<{ id: string; next: number }> = [{ id: root, next: 0 }]
    visited.add(root)
    onStack.add(root)
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      const neighbours = outgoing.get(frame.id) ?? []
      if (frame.next >= neighbours.length) {
        onStack.delete(frame.id)
        stack.pop()
        continue
      }
      const { to, index } = neighbours[frame.next]
      frame.next += 1
      if (onStack.has(to)) {
        back.add(index)
        continue
      }
      if (visited.has(to)) continue
      visited.add(to)
      onStack.add(to)
      stack.push({ id: to, next: 0 })
    }
  }

  for (const id of nodeIds) if (!visited.has(id)) walk(id)
  return back
}

export function layoutTopology(spec: TopologySpec): Map<string, TopologyPosition> {
  const nodeIds = spec.nodes.map((n) => n.id)
  const known = new Set(nodeIds)

  // Only real, layering edges shape the columns. An edge naming an unknown node is a
  // schema failure reported at parse time; here it is simply skipped so a malformed spec
  // still lays out rather than throwing inside a renderer.
  const layering: LayoutEdge[] = spec.edges
    .filter((e) => LAYERING_KINDS.has(e.kind) && known.has(e.from) && known.has(e.to))
    .map((e) => ({ from: e.from, to: e.to }))

  const backEdges = findBackEdges(nodeIds, layering)
  const acyclic = layering.filter((_, i) => !backEdges.has(i))

  const layer = new Map<string, number>()
  for (const id of nodeIds) layer.set(id, 0)

  // Longest path over an acyclic graph settles in at most nodeCount passes, and now
  // genuinely settles rather than running the cap out.
  for (let pass = 0; pass < nodeIds.length; pass++) {
    let changed = false
    for (const edge of acyclic) {
      const from = layer.get(edge.from)
      const to = layer.get(edge.to)
      if (from === undefined || to === undefined) continue
      if (to < from + 1) {
        layer.set(edge.to, from + 1)
        changed = true
      }
    }
    if (!changed) break
  }

  // Within-column ordering: the mean column-row of a node's already-placed predecessors.
  // Without this, a service fanning out to four backends draws its edges crossing each
  // other purely because of declaration order.
  const predecessors = new Map<string, string[]>()
  for (const id of nodeIds) predecessors.set(id, [])
  for (const edge of acyclic) predecessors.get(edge.to)?.push(edge.from)

  const byColumn = new Map<number, string[]>()
  for (const id of nodeIds) {
    const col = layer.get(id) ?? 0
    const bucket = byColumn.get(col)
    if (bucket) bucket.push(id)
    else byColumn.set(col, [id])
  }

  const positions = new Map<string, TopologyPosition>()
  const declarationIndex = new Map(nodeIds.map((id, i) => [id, i]))

  for (const col of [...byColumn.keys()].sort((a, b) => a - b)) {
    const members = byColumn.get(col)!
    const barycenter = (id: string): number => {
      const preds = (predecessors.get(id) ?? [])
        .map((p) => positions.get(p)?.row)
        .filter((row): row is number => row !== undefined)
      if (preds.length === 0) return Number.POSITIVE_INFINITY
      return preds.reduce((sum, row) => sum + row, 0) / preds.length
    }
    const ordered = [...members].sort((a, b) => {
      const ba = barycenter(a)
      const bb = barycenter(b)
      // Ties, and nodes with no placed predecessor, fall back to declaration order, which
      // keeps the layout a stable function of the authored spec.
      if (ba !== bb && Number.isFinite(ba) && Number.isFinite(bb)) return ba - bb
      if (Number.isFinite(ba) !== Number.isFinite(bb)) return Number.isFinite(ba) ? -1 : 1
      return (declarationIndex.get(a) ?? 0) - (declarationIndex.get(b) ?? 0)
    })
    ordered.forEach((id, row) => positions.set(id, { col, row }))
  }

  return positions
}

/**
 * Which authored edges the layout treated as return arcs — the explicit `feedback` kind
 * plus any layering edge DFS found closing a cycle. The renderer draws these as curves so
 * a backwards arrow reads as deliberate rather than as the layout bug it used to be.
 */
export function returnEdgeIndexes(spec: TopologySpec): Set<number> {
  const known = new Set(spec.nodes.map((n) => n.id))
  const layeringIndexes: number[] = []
  const layering: LayoutEdge[] = []
  spec.edges.forEach((edge, index) => {
    if (LAYERING_KINDS.has(edge.kind) && known.has(edge.from) && known.has(edge.to)) {
      layeringIndexes.push(index)
      layering.push({ from: edge.from, to: edge.to })
    }
  })
  const back = findBackEdges(
    spec.nodes.map((n) => n.id),
    layering
  )
  const out = new Set<number>()
  spec.edges.forEach((edge, index) => {
    if (edge.kind === "feedback") out.add(index)
  })
  for (const i of back) out.add(layeringIndexes[i])
  return out
}
