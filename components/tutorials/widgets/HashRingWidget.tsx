"use client"

import { useMemo, useState } from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  assignKeys,
  keyNames,
  maxShare,
  nodeNames,
  remapStats,
  ringPoints,
  ringPosition,
  type RemapStats,
} from "@/lib/tutorials/widgets/ring-math"
import type { HashRingSpec } from "@/lib/tutorials/widgets/schema"
import { useWidgetA11y, WidgetFrame } from "./WidgetFrame"

/**
 * The `hash-ring` family: THE demo widget. Keys sit at their hashed positions on a
 * circle, colored by owning node; the read-outs carry the meaning as text (the SVG
 * is decorative, aria-hidden). The plan's ramp is structural: predict, then the
 * worked initial scene, then controls unlock in story order — nodes first (feel the
 * shatter under mod-N), then the ring mode toggle (watch ~1/N move instead), then
 * virtual nodes (smooth the skew). Ten-second legible: the money number is
 * "last change remapped X% of keys".
 *
 * Everything is seeded from the spec (ring-math): re-rendering the same spec gives
 * the same ring, and no network is touched. Reduced motion needs no special casing;
 * dots swap color instantly (transitions disabled under motion-reduce).
 */
export function HashRingWidget({ spec }: { spec: HashRingSpec }) {
  const [resetKey, setResetKey] = useState(0)
  return (
    <WidgetFrame
      label="Hands-on: consistent hashing"
      caption={spec.caption}
      onReset={() => setResetKey((k) => k + 1)}
    >
      <HashRingBody key={resetKey} spec={spec} />
    </WidgetFrame>
  )
}

type Phase = "predict" | "worked" | "explore"

/** Distinguishable node hues that hold up on light and dark card backgrounds. */
const NODE_COLORS = [
  "#2563eb", // A blue
  "#d97706", // B amber
  "#059669", // C emerald
  "#dc2626", // D red
  "#7c3aed", // E violet
  "#0891b2", // F cyan
  "#db2777", // G pink
  "#65a30d", // H lime
  "#78716c", // I stone
]

function HashRingBody({ spec }: { spec: HashRingSpec }) {
  const { announce } = useWidgetA11y()
  const [phase, setPhase] = useState<Phase>("predict")
  const [guess, setGuess] = useState<number | null>(null)
  const [nodeCount, setNodeCount] = useState(spec.initialNodes)
  const [mode, setMode] = useState<"modulo" | "ring">(spec.initialMode)
  const [vnodesOn, setVnodesOn] = useState(false)
  const [lastRemap, setLastRemap] = useState<RemapStats | null>(null)
  // Controls unlock in story order: nodes -> mode -> vnodes.
  const [unlocked, setUnlocked] = useState(1)

  const keys = useMemo(() => keyNames(spec.keys), [spec.keys])
  const nodes = useMemo(() => nodeNames(nodeCount), [nodeCount])
  const vnodes = mode === "ring" && vnodesOn ? spec.vnodeFactor : 1
  const assignment = useMemo(
    () => assignKeys({ nodes, keys, mode, vnodes }),
    [nodes, keys, mode, vnodes]
  )

  /** Apply a topology change, diff owners, and narrate the remap. */
  const change = (
    next: { nodeCount?: number; mode?: "modulo" | "ring"; vnodesOn?: boolean },
    unlockTo: number,
    label: string
  ) => {
    const nextCount = next.nodeCount ?? nodeCount
    const nextMode = next.mode ?? mode
    const nextVnodesOn = next.vnodesOn ?? vnodesOn
    const after = assignKeys({
      nodes: nodeNames(nextCount),
      keys,
      mode: nextMode,
      vnodes: nextMode === "ring" && nextVnodesOn ? spec.vnodeFactor : 1,
    })
    const stats = remapStats(assignment.owner, after.owner)
    setNodeCount(nextCount)
    setMode(nextMode)
    setVnodesOn(nextVnodesOn)
    setLastRemap(stats)
    setUnlocked((prev) => Math.max(prev, unlockTo))
    announce(
      `${label}. ${Math.round(stats.fraction * 100)} percent of keys remapped (${stats.moved} of ${stats.total}).`
    )
  }

  const skew = maxShare(assignment)
  const ideal = 1 / nodes.length

  return (
    <div className="flex flex-col gap-4">
      <p className="text-foreground text-sm font-medium">{spec.title}</p>

      {phase === "predict" ? (
        <div className="flex flex-col gap-2">
          <p className="text-foreground/90 text-sm">{spec.predictPrompt.question}</p>
          <div className="flex flex-wrap gap-2">
            {spec.predictPrompt.options.map((option, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setGuess(i)
                  setPhase("worked")
                  announce("Guess locked in. Now watch what actually happens.")
                }}
                className="border-border/70 text-foreground/90 hover:bg-muted/50 focus-visible:ring-accent/50 cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {guess !== null && (
            <p className="text-muted-foreground text-xs">
              Your guess: {spec.predictPrompt.options[guess]}.
            </p>
          )}

          <div className="flex flex-wrap items-start gap-4">
            <RingSvg
              spec={spec}
              nodes={nodes}
              keys={keys}
              owner={assignment.owner}
              mode={mode}
              vnodes={vnodes}
            />
            <div className="flex min-w-[180px] flex-1 flex-col gap-2.5">
              <div className="border-border/70 bg-muted/20 rounded-md border px-3 py-2 text-sm">
                <p className="text-muted-foreground text-xs">Last change remapped</p>
                <p className="text-foreground font-mono text-lg font-semibold tabular-nums">
                  {lastRemap ? `${Math.round(lastRemap.fraction * 100)}%` : "0%"}
                  <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                    {lastRemap ? `${lastRemap.moved} of ${lastRemap.total} keys` : "no changes yet"}
                  </span>
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Largest node holds {Math.round(skew * 100)}% (ideal {Math.round(ideal * 100)}%)
                </p>
              </div>
              <ul className="flex flex-wrap gap-x-3 gap-y-1">
                {nodes.map((node, i) => (
                  <li key={node} className="text-foreground/90 flex items-center gap-1.5 text-xs">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: NODE_COLORS[i] }}
                      aria-hidden="true"
                    />
                    {node}: {Math.round((assignment.shares[node] ?? 0) * 100)}%
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {phase === "worked" ? (
            <div className="border-accent/40 bg-accent/[0.06] flex flex-col gap-2 rounded-md border px-3 py-2.5">
              <p className="text-foreground/90 text-sm">{spec.workedExample}</p>
              <div>
                <Button size="sm" onClick={() => setPhase("explore")}>
                  Start exploring
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground w-24 text-xs">Nodes ({nodeCount})</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  disabled={nodeCount >= spec.maxNodes}
                  onClick={() =>
                    change(
                      { nodeCount: nodeCount + 1 },
                      2,
                      `Added node ${nodeNames(nodeCount + 1)[nodeCount]}`
                    )
                  }
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add node
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  disabled={nodeCount <= 2}
                  onClick={() =>
                    change(
                      { nodeCount: nodeCount - 1 },
                      2,
                      `Removed node ${nodes[nodes.length - 1]}`
                    )
                  }
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" /> Remove node
                </Button>
              </div>

              <div
                className={cn("flex flex-wrap items-center gap-2", unlocked < 2 && "opacity-60")}
              >
                <span className="text-muted-foreground w-24 text-xs">Assignment</span>
                <button
                  type="button"
                  aria-pressed={mode === "modulo"}
                  disabled={unlocked < 2}
                  onClick={() => change({ mode: "modulo" }, 3, "Switched to hash mod N")}
                  className={cn(
                    "border-border/70 text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    unlocked >= 2 && "hover:bg-muted/50 cursor-pointer",
                    mode === "modulo" &&
                      "border-accent/60 bg-accent/10 text-accent-strong font-semibold"
                  )}
                >
                  hash mod N
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "ring"}
                  disabled={unlocked < 2}
                  onClick={() => change({ mode: "ring" }, 3, "Switched to the ring")}
                  className={cn(
                    "border-border/70 text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    unlocked >= 2 && "hover:bg-muted/50 cursor-pointer",
                    mode === "ring" &&
                      "border-accent/60 bg-accent/10 text-accent-strong font-semibold"
                  )}
                >
                  consistent-hash ring
                </button>
                {unlocked < 2 && (
                  <span className="text-muted-foreground text-[11px]">
                    Add or remove a node first.
                  </span>
                )}
              </div>

              <div
                className={cn(
                  "flex flex-wrap items-center gap-2",
                  (unlocked < 3 || mode !== "ring") && "opacity-60"
                )}
              >
                <span className="text-muted-foreground w-24 text-xs">Virtual nodes</span>
                <button
                  type="button"
                  aria-pressed={vnodesOn}
                  disabled={unlocked < 3 || mode !== "ring"}
                  onClick={() =>
                    change(
                      { vnodesOn: !vnodesOn },
                      3,
                      vnodesOn
                        ? "Virtual nodes off"
                        : `Virtual nodes on (${spec.vnodeFactor} per node)`
                    )
                  }
                  className={cn(
                    "border-border/70 text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    unlocked >= 3 && mode === "ring" && "hover:bg-muted/50 cursor-pointer",
                    vnodesOn && "border-accent/60 bg-accent/10 text-accent-strong font-semibold"
                  )}
                >
                  {vnodesOn ? `on (${spec.vnodeFactor} per node)` : "off"}
                </button>
                {mode !== "ring" && unlocked >= 3 && (
                  <span className="text-muted-foreground text-[11px]">Ring mode only.</span>
                )}
                {unlocked < 3 && (
                  <span className="text-muted-foreground text-[11px]">
                    Try both assignment modes first.
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** Decorative ring: keys at hashed angles colored by owner; node markers in ring mode. */
function RingSvg({
  spec,
  nodes,
  keys,
  owner,
  mode,
  vnodes,
}: {
  spec: HashRingSpec
  nodes: string[]
  keys: string[]
  owner: Record<string, string>
  mode: "modulo" | "ring"
  vnodes: number
}) {
  const SIZE = 240
  const C = SIZE / 2
  const R = 92
  const colorOf = (node: string) => NODE_COLORS[nodes.indexOf(node)] ?? "#999"
  const angle = (position: number) => position * Math.PI * 2 - Math.PI / 2
  const points = mode === "ring" ? ringPoints(nodes, vnodes) : []

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-56 w-56 shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx={C}
        cy={C}
        r={R}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1.5"
      />
      {keys.map((key) => {
        const a = angle(ringPosition(key))
        return (
          <circle
            key={key}
            cx={C + Math.cos(a) * R}
            cy={C + Math.sin(a) * R}
            r={3}
            fill={colorOf(owner[key])}
            className="transition-colors motion-reduce:transition-none"
          />
        )
      })}
      {points.map((point, i) => {
        const a = angle(point.position)
        const big = vnodes === 1
        return (
          <g key={i}>
            <circle
              cx={C + Math.cos(a) * (R + 11)}
              cy={C + Math.sin(a) * (R + 11)}
              r={big ? 7 : 3.5}
              fill={colorOf(point.node)}
              stroke="white"
              strokeWidth={big ? 1.5 : 0.75}
            />
            {big && (
              <text
                x={C + Math.cos(a) * (R + 26)}
                y={C + Math.sin(a) * (R + 26)}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-current text-[11px] font-semibold"
              >
                {point.node}
              </text>
            )}
          </g>
        )
      })}
      {mode === "modulo" && (
        <text
          x={C}
          y={C}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-current text-[11px] opacity-60"
        >
          owner = hash(key) mod {nodes.length}
        </text>
      )}
    </svg>
  )
}
