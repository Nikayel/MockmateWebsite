"use client"

import { useMemo } from "react"
import { DiagramFrame } from "./primitives/DiagramFrame"
import { StepControls } from "./primitives/StepControls"
import { useStepPlayer } from "./primitives/useStepPlayer"
import { layoutTopology } from "@/lib/tutorials/diagrams/topology-layout"
import type { TopologySpec } from "@/lib/tutorials/diagrams/schema"

/**
 * Staged box-and-arrow topology (triggered). Components appear stage by stage, each
 * stage carrying the justification note that ties the new boxes to a requirement —
 * the L0 dataflow discipline made visible. Deterministic layered layout (no physics,
 * 16-node schema cap); edges render solid (sync), dashed (async), or dotted
 * (replication) with the kind carried by the stroke pattern, never color alone.
 */

const KIND_TINT: Record<TopologySpec["nodes"][number]["kind"], string> = {
  client: "#64748b",
  lb: "#059669",
  service: "#2563eb",
  db: "#d97706",
  cache: "#7c3aed",
  queue: "#0891b2",
  cdn: "#0d9488",
  zone: "#a1a1aa",
  external: "#78716c",
}

const NODE_W = 116
const NODE_H = 40
const COL_GAP = 62
const ROW_GAP = 26
const PAD = 16

export function TopologyDiagram({ spec }: { spec: TopologySpec }) {
  const player = useStepPlayer(spec.stages.length)
  const positions = useMemo(() => layoutTopology(spec), [spec])

  const visible = useMemo(() => {
    const ids = new Set<string>()
    for (let i = 0; i <= player.index && i < spec.stages.length; i++)
      for (const id of spec.stages[i].adds) ids.add(id)
    return ids
  }, [spec, player.index])

  const horizontal = spec.layout === "lr"
  const center = (id: string) => {
    const p = positions.get(id) ?? { col: 0, row: 0 }
    const main = PAD + p.col * (NODE_W + COL_GAP) + NODE_W / 2
    const cross = PAD + p.row * (NODE_H + ROW_GAP) + NODE_H / 2
    return horizontal
      ? { x: main, y: cross }
      : { x: cross + (NODE_W - NODE_H) / 2, y: main - (NODE_W - NODE_H) / 2 }
  }

  const cols = 1 + Math.max(...[...positions.values()].map((p) => p.col))
  const rows = 1 + Math.max(...[...positions.values()].map((p) => p.row))
  const W = horizontal
    ? PAD * 2 + cols * NODE_W + (cols - 1) * COL_GAP
    : PAD * 2 + rows * NODE_W + (rows - 1) * ROW_GAP
  const H = horizontal
    ? PAD * 2 + rows * NODE_H + (rows - 1) * ROW_GAP
    : PAD * 2 + cols * NODE_H + (cols - 1) * COL_GAP

  const stage = spec.stages[player.index]

  return (
    <DiagramFrame
      label={spec.title ?? "Architecture"}
      controls={<StepControls player={player} />}
      caption={spec.caption}
      containerProps={player.containerProps}
      groupLabel={`${spec.title ?? "architecture"} staged build, step-through`}
    >
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: W, height: H }}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <marker
              id="topo-arrow"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="currentColor" opacity="0.6" />
            </marker>
          </defs>
          {spec.edges
            .filter((e) => visible.has(e.from) && visible.has(e.to))
            .map((edge, i) => {
              const a = center(edge.from)
              const b = center(edge.to)
              const dash =
                edge.kind === "async" ? "6 4" : edge.kind === "replication" ? "2 3" : undefined
              return (
                <g key={i} stroke="currentColor" strokeOpacity="0.5">
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    strokeWidth={1.5}
                    strokeDasharray={dash}
                    markerEnd="url(#topo-arrow)"
                  />
                  {edge.label && (
                    <text
                      x={(a.x + b.x) / 2}
                      y={(a.y + b.y) / 2 - 5}
                      textAnchor="middle"
                      stroke="none"
                      className="fill-current text-[9px] opacity-70"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              )
            })}
          {spec.nodes
            .filter((n) => visible.has(n.id))
            .map((node) => {
              const c = center(node.id)
              const tint = KIND_TINT[node.kind]
              return (
                <g key={node.id}>
                  <rect
                    x={c.x - NODE_W / 2}
                    y={c.y - NODE_H / 2}
                    width={NODE_W}
                    height={NODE_H}
                    rx={8}
                    fill={tint}
                    fillOpacity="0.1"
                    stroke={tint}
                    strokeOpacity="0.7"
                    strokeWidth={1.5}
                    strokeDasharray={
                      node.kind === "zone" || node.kind === "external" ? "5 4" : undefined
                    }
                  />
                  <text
                    x={c.x}
                    y={c.y - 2}
                    textAnchor="middle"
                    className="fill-current text-[10px] font-semibold"
                  >
                    {node.label.length > 18 ? node.label.slice(0, 17) + "…" : node.label}
                  </text>
                  <text
                    x={c.x}
                    y={c.y + 11}
                    textAnchor="middle"
                    className="fill-current text-[8px] uppercase opacity-60"
                  >
                    {node.kind}
                  </text>
                </g>
              )
            })}
        </svg>
      </div>
      {/* The one live sentence per diagram: the current stage's justification. */}
      <p aria-live="polite" className="text-muted-foreground mt-2 text-xs">
        {stage ? `Stage ${player.index + 1} of ${spec.stages.length}: ${stage.note}` : ""}
      </p>
    </DiagramFrame>
  )
}
