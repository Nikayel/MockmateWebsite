"use client"

import { useMemo } from "react"
import { DiagramFrame } from "./primitives/DiagramFrame"
import { StepControls } from "./primitives/StepControls"
import { useStepPlayer } from "./primitives/useStepPlayer"
import { layoutTopology, returnEdgeIndexes } from "@/lib/tutorials/diagrams/topology-layout"
import {
  buildTopologyDescription,
  buildTopologySummary,
} from "@/lib/tutorials/diagrams/topology-description"
import type { TopologySpec } from "@/lib/tutorials/diagrams/schema"

/**
 * Staged box-and-arrow topology. Components appear stage by stage, each stage carrying the
 * justification note that ties the new boxes to a requirement — the L0 dataflow discipline
 * made visible. Deterministic layered layout (no physics, 16-node schema cap); edges render
 * solid (sync), dashed (async), dotted (replication) or a curved return arc (feedback),
 * with the kind carried by the stroke pattern and never by color alone.
 *
 * ## Three things this file gets right that it previously got wrong
 *
 * **1. Everything is in the server HTML.** The staged reveal used to FILTER nodes and edges
 * to the visible set, and `useStepPlayer` starts at index 0, so `renderToStaticMarkup`
 * emitted stage 1 of N and nothing else. Measured on 2026-08-13: 57 of 87 node labels were
 * missing from the server HTML across all 14 authored diagrams. `/learn` lesson pages are
 * statically generated and are the site's main organic-traffic surface, so Googlebot was
 * indexing a fraction of each architecture we were trying to rank on, and every reader
 * before hydration saw a truncated system. The reveal is now a client ENHANCEMENT that
 * dims later stages after mount, rather than a client feature that adds them. That inverts
 * the default from "nothing until JS" to "everything until JS narrows it", which is the
 * correct default for indexed content and for `prefers-reduced-motion`.
 *
 * Later-stage nodes are dimmed with opacity rather than removed, and `aria-hidden` on the
 * SVG means no assistive technology ever sees a half-built graph regardless of step.
 *
 * **2. Labels wrap instead of truncating.** `NODE_W` was 116 with labels sliced at 18
 * characters, which truncated 45 of the corpus's node labels. That matters more than it
 * looks: the ASCII drawings being replaced integrate the qualifier BESIDE the component
 * ("Redis (atomic Lua)"), and slicing evicts it, introducing a split-attention cost the
 * drawing did not have. Nodes now size to their wrapped label.
 *
 * **3. The structure reaches a screen reader.** The `<svg>` stays `aria-hidden` — a
 * two-dimensional graph read as a flat label is worse than useless — and a visually-hidden
 * adjacency list carries the same information in navigable form. See
 * `lib/tutorials/diagrams/topology-description.ts`.
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

/** Wrapped labels need a wider box than the old 116, and a per-line height to stack into. */
const NODE_MIN_W = 118
const NODE_MAX_W = 190
const CHAR_W = 5.6
const LINE_H = 11
const LABEL_PAD = 16
const NODE_PAD_Y = 26
const COL_GAP = 64
const ROW_GAP = 30
const PAD = 18
const GROUP_PAD = 12

/**
 * Greedy word wrap to at most three lines.
 *
 * Three is the ceiling because a four-line box starts to dominate its neighbours and the
 * label has stopped being a label. Authors who need more prose than that have a caption.
 */
function wrapLabel(label: string, maxChars: number): string[] {
  const words = label.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxChars || !current) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  if (lines.length <= 3) return lines
  // Fold the tail into the third line rather than dropping it: an over-long third line is
  // ugly, and losing the end of a component name is wrong.
  return [lines[0], lines[1], lines.slice(2).join(" ")]
}

interface NodeBox {
  lines: string[]
  width: number
  height: number
}

function measureNode(label: string): NodeBox {
  const maxChars = Math.floor((NODE_MAX_W - LABEL_PAD) / CHAR_W)
  const lines = wrapLabel(label, maxChars)
  const longest = Math.max(...lines.map((l) => l.length))
  const width = Math.min(NODE_MAX_W, Math.max(NODE_MIN_W, Math.ceil(longest * CHAR_W) + LABEL_PAD))
  return { lines, width, height: NODE_PAD_Y + lines.length * LINE_H }
}

export function TopologyDiagram({ spec }: { spec: TopologySpec }) {
  const staged = spec.reveal !== "all" && !!spec.stages
  const stages = spec.stages ?? []
  const player = useStepPlayer(Math.max(1, stages.length))

  const positions = useMemo(() => layoutTopology(spec), [spec])
  const returns = useMemo(() => returnEdgeIndexes(spec), [spec])
  const boxes = useMemo(() => {
    const map = new Map<string, NodeBox>()
    for (const node of spec.nodes) map.set(node.id, measureNode(node.label))
    return map
  }, [spec])

  /**
   * Which stage each node belongs to. Under `reveal: "all"` every node is stage 0, so the
   * opacity below resolves to 1 everywhere and no controls render.
   */
  const stageOf = useMemo(() => {
    const map = new Map<string, number>()
    stages.forEach((stage, i) => {
      for (const id of stage.adds) map.set(id, i)
    })
    return map
  }, [stages])

  const horizontal = spec.layout !== "tb"

  // Column and row extents drive the canvas. Both are derived from the widest box in each
  // track so a wrapped three-line label cannot overlap its neighbour.
  const geometry = useMemo(() => {
    const colSize = new Map<number, number>()
    const rowSize = new Map<number, number>()
    for (const node of spec.nodes) {
      const p = positions.get(node.id) ?? { col: 0, row: 0 }
      const box = boxes.get(node.id)!
      // In LR the column advances along x (node width); in TB it advances along y (height).
      const along = horizontal ? box.width : box.height
      const across = horizontal ? box.height : box.width
      colSize.set(p.col, Math.max(colSize.get(p.col) ?? 0, along))
      rowSize.set(p.row, Math.max(rowSize.get(p.row) ?? 0, across))
    }
    const colOffset = new Map<number, number>()
    let running = PAD
    for (const col of [...colSize.keys()].sort((a, b) => a - b)) {
      colOffset.set(col, running)
      running += colSize.get(col)! + COL_GAP
    }
    const alongTotal = running - COL_GAP + PAD

    const rowOffset = new Map<number, number>()
    let acrossRunning = PAD
    for (const row of [...rowSize.keys()].sort((a, b) => a - b)) {
      rowOffset.set(row, acrossRunning)
      acrossRunning += rowSize.get(row)! + ROW_GAP
    }
    const acrossTotal = acrossRunning - ROW_GAP + PAD

    return { colSize, rowSize, colOffset, rowOffset, alongTotal, acrossTotal }
  }, [spec, positions, boxes, horizontal])

  /** Top-left and centre of one node in canvas coordinates. */
  const rect = (id: string) => {
    const p = positions.get(id) ?? { col: 0, row: 0 }
    const box = boxes.get(id)!
    const alongStart = geometry.colOffset.get(p.col) ?? PAD
    const alongSpan = geometry.colSize.get(p.col) ?? 0
    const acrossStart = geometry.rowOffset.get(p.row) ?? PAD
    const acrossSpan = geometry.rowSize.get(p.row) ?? 0
    // Centre each node inside its track so a fan-out of unequal boxes reads straight.
    const alongCentre = alongStart + alongSpan / 2
    const acrossCentre = acrossStart + acrossSpan / 2
    const cx = horizontal ? alongCentre : acrossCentre
    const cy = horizontal ? acrossCentre : alongCentre
    return { cx, cy, w: box.width, h: box.height, lines: box.lines }
  }

  const W = horizontal ? geometry.alongTotal : geometry.acrossTotal
  const H = horizontal ? geometry.acrossTotal : geometry.alongTotal

  const stage = stages[player.index]
  const description = useMemo(() => buildTopologyDescription(spec), [spec])
  const summary = useMemo(() => buildTopologySummary(spec), [spec])

  /**
   * Opacity for a node or edge at the current step.
   *
   * Full for anything already revealed, dimmed (never removed) for what is still to come.
   * Keeping the later stages in the DOM is what makes the server HTML complete; dimming is
   * what preserves the staged reveal for a reader who has JavaScript.
   */
  const revealOpacity = (id: string): number => {
    if (!staged) return 1
    const at = stageOf.get(id)
    if (at === undefined) return 1
    return at <= player.index ? 1 : 0.16
  }

  const edgeOpacity = (from: string, to: string): number =>
    Math.min(revealOpacity(from), revealOpacity(to))

  return (
    <DiagramFrame
      label={spec.title ?? "Architecture"}
      controls={staged ? <StepControls player={player} /> : undefined}
      caption={spec.caption}
      containerProps={staged ? player.containerProps : undefined}
      groupLabel={
        staged
          ? `${spec.title ?? "architecture"} staged build, step-through`
          : (spec.title ?? "architecture diagram")
      }
    >
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: W, height: H, maxWidth: "100%" }}
          // Hidden on purpose: the adjacency list below carries the same information in a
          // form a screen reader can navigate, which a flat label on a 2-D graph cannot.
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

          {/* Swimlanes first, so every box and arrow draws on top of its container. */}
          {spec.groups?.map((group) => {
            const members = group.nodes.map(rect).filter(Boolean)
            if (members.length === 0) return null
            const left = Math.min(...members.map((m) => m.cx - m.w / 2)) - GROUP_PAD
            const right = Math.max(...members.map((m) => m.cx + m.w / 2)) + GROUP_PAD
            const top = Math.min(...members.map((m) => m.cy - m.h / 2)) - GROUP_PAD - 10
            const bottom = Math.max(...members.map((m) => m.cy + m.h / 2)) + GROUP_PAD
            return (
              <g key={group.id} opacity={Math.max(...group.nodes.map(revealOpacity))}>
                <rect
                  x={left}
                  y={top}
                  width={right - left}
                  height={bottom - top}
                  rx={10}
                  fill="currentColor"
                  fillOpacity="0.03"
                  stroke="currentColor"
                  strokeOpacity="0.25"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                <text
                  x={left + 8}
                  y={top + 12}
                  className="fill-current text-[9px] font-semibold uppercase opacity-60"
                >
                  {group.label}
                </text>
              </g>
            )
          })}

          {spec.edges.map((edge, i) => {
            const a = rect(edge.from)
            const b = rect(edge.to)
            if (!a || !b) return null
            const dash =
              edge.kind === "async" ? "6 4" : edge.kind === "replication" ? "2 3" : undefined
            const isReturn = returns.has(i)
            // A return arc bows away from the flow so it reads as deliberate rather than as
            // the layout bug a backwards straight line used to be.
            const bow = horizontal ? Math.max(46, Math.abs(a.cx - b.cx) / 3) : 46
            const path = isReturn
              ? horizontal
                ? `M ${a.cx} ${a.cy + a.h / 2} C ${a.cx} ${a.cy + a.h / 2 + bow}, ${b.cx} ${b.cy + b.h / 2 + bow}, ${b.cx} ${b.cy + b.h / 2}`
                : `M ${a.cx + a.w / 2} ${a.cy} C ${a.cx + a.w / 2 + bow} ${a.cy}, ${b.cx + b.w / 2 + bow} ${b.cy}, ${b.cx + b.w / 2} ${b.cy}`
              : `M ${a.cx} ${a.cy} L ${b.cx} ${b.cy}`
            const midX = isReturn
              ? horizontal
                ? (a.cx + b.cx) / 2
                : (a.cx + b.cx) / 2 + bow * 0.75
              : (a.cx + b.cx) / 2
            const midY = isReturn
              ? horizontal
                ? (a.cy + b.cy) / 2 + a.h / 2 + bow * 0.75
                : (a.cy + b.cy) / 2
              : (a.cy + b.cy) / 2 - 5
            return (
              <g
                key={`${edge.from}-${edge.to}-${i}`}
                stroke="currentColor"
                strokeOpacity="0.5"
                opacity={edgeOpacity(edge.from, edge.to)}
                data-edge-kind={edge.kind}
              >
                <path
                  d={path}
                  fill="none"
                  strokeWidth={1.5}
                  strokeDasharray={isReturn && !dash ? "5 3" : dash}
                  markerEnd="url(#topo-arrow)"
                />
                {edge.label && (
                  <text
                    x={midX}
                    y={midY}
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

          {spec.nodes.map((node) => {
            const r = rect(node.id)
            const tint = KIND_TINT[node.kind]
            const firstLineY = r.cy - (r.lines.length - 1) * (LINE_H / 2) - 3
            return (
              <g key={node.id} opacity={revealOpacity(node.id)} data-node-id={node.id}>
                <rect
                  x={r.cx - r.w / 2}
                  y={r.cy - r.h / 2}
                  width={r.w}
                  height={r.h}
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
                <text textAnchor="middle" className="fill-current text-[10px] font-semibold">
                  {r.lines.map((line, i) => (
                    <tspan key={i} x={r.cx} y={firstLineY + i * LINE_H}>
                      {line}
                    </tspan>
                  ))}
                </text>
                <text
                  x={r.cx}
                  y={r.cy + r.h / 2 - 7}
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

      {/*
        The structure, for assistive technology. `sr-only` rather than `aria-label`: a
        screen reader navigates a list item by item, where a single label describing a
        dozen relationships can only be replayed from the start.
      */}
      <div className="sr-only">
        <p>{summary}</p>
        <ul>
          {description.split("\n").map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>

      {/* The one live sentence per diagram: the current stage's justification. */}
      {staged && (
        <p aria-live="polite" className="text-muted-foreground mt-2 text-xs">
          {stage ? `Stage ${player.index + 1} of ${stages.length}: ${stage.note}` : ""}
        </p>
      )}
    </DiagramFrame>
  )
}
