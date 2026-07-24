/**
 * Deterministic layered layout for topology diagrams — the schema-capped, authored
 * answer to the banned free-form graph. Layer = longest path from a source over
 * sync/async edges (replication edges are lateral and do not push layers); within a
 * layer, nodes keep declaration order. Cycle-safe: passes are capped at node count,
 * so a cyclic spec settles instead of hanging.
 */
import type { TopologySpec } from "./schema"

export interface TopologyPosition {
  col: number
  row: number
}

export function layoutTopology(spec: TopologySpec): Map<string, TopologyPosition> {
  const layer = new Map<string, number>()
  for (const node of spec.nodes) layer.set(node.id, 0)
  const layering = spec.edges.filter((e) => e.kind !== "replication")

  for (let pass = 0; pass < spec.nodes.length; pass++) {
    let changed = false
    for (const edge of layering) {
      const fromLayer = layer.get(edge.from)
      const toLayer = layer.get(edge.to)
      if (fromLayer === undefined || toLayer === undefined) continue
      if (toLayer < fromLayer + 1) {
        layer.set(edge.to, fromLayer + 1)
        changed = true
      }
    }
    if (!changed) break
  }

  const positions = new Map<string, TopologyPosition>()
  const rowCount = new Map<number, number>()
  for (const node of spec.nodes) {
    const col = layer.get(node.id) ?? 0
    const row = rowCount.get(col) ?? 0
    rowCount.set(col, row + 1)
    positions.set(node.id, { col, row })
  }
  return positions
}
