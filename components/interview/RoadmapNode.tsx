/**
 * RoadmapNode Component
 *
 * Renders an individual DSA pattern node in the skill tree with:
 * - Progress visualization
 * - Lock/unlock states
 * - Mastery indicators
 * - Prerequisite tooltips
 */

import { Lock, Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { PatternNode } from "@/lib/types/dsa-patterns"
import type { NodeStats } from "@/lib/hooks/useDSARoadmap"

// Node positions for the tree layout - organized as a proper skill tree
export const NODE_POSITIONS: Record<string, { x: number; y: number; tier: number }> = {
  // Tier 1 - Foundation (top center)
  "arrays-hashing": { x: 50, y: 5, tier: 1 },

  // Tier 2 - Core (branches from foundation)
  "two-pointers": { x: 20, y: 18, tier: 2 },
  stack: { x: 40, y: 18, tier: 2 },
  "binary-search": { x: 60, y: 18, tier: 2 },
  "sliding-window": { x: 10, y: 30, tier: 2 },
  "linked-list": { x: 30, y: 30, tier: 2 },

  // Tier 3 - Advanced (deeper branches)
  trees: { x: 35, y: 42, tier: 3 },
  heap: { x: 65, y: 42, tier: 3 },
  trie: { x: 20, y: 54, tier: 3 },
  backtracking: { x: 45, y: 54, tier: 3 },
  graphs: { x: 70, y: 54, tier: 3 },

  // Tier 4 - Expert (specialized branches)
  "dp-1d": { x: 35, y: 66, tier: 4 },
  "dp-2d": { x: 25, y: 78, tier: 4 },
  "dp-tree": { x: 45, y: 78, tier: 4 },
  greedy: { x: 55, y: 66, tier: 4 },
  intervals: { x: 65, y: 78, tier: 4 },
  "bit-manipulation": { x: 80, y: 30, tier: 4 },
  "math-geometry": { x: 90, y: 18, tier: 4 },
  matrix: { x: 15, y: 90, tier: 4 },
}

// Simplified: single style for unlocked nodes (reduces cognitive load from 4 tier colors to 1)
const NODE_STYLE = {
  unlocked: {
    bg: "from-zinc-700/50 to-zinc-800/50",
    border: "border-border",
    text: "text-foreground",
    glow: "shadow-zinc-500/10",
  },
  locked: { bg: "bg-card/50", border: "border-border", text: "text-muted-foreground" },
  mastered: {
    bg: "from-emerald-900/30 to-emerald-950/30",
    border: "border-emerald-500/50",
    text: "text-emerald-400",
    glow: "shadow-emerald-500/20",
  },
}

interface RoadmapNodeProps {
  node: PatternNode
  stats: NodeStats
  isUnlocked: boolean
  isHovered: boolean
  isExpanded: boolean
  prerequisites: Array<{ id: string; name: string }>
  nodeStats: Record<string, NodeStats>
  onNodeClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

// Simplified: only 3 states instead of 4 tier colors + 3 states
function getNodeStyle(isUnlocked: boolean, isMastered: boolean) {
  if (isMastered) return NODE_STYLE.mastered
  if (isUnlocked) return NODE_STYLE.unlocked
  return NODE_STYLE.locked
}

export function RoadmapNode({
  node,
  stats,
  isUnlocked,
  isHovered,
  isExpanded,
  prerequisites,
  nodeStats,
  onNodeClick,
  onMouseEnter,
  onMouseLeave,
}: RoadmapNodeProps) {
  const pos = NODE_POSITIONS[node.id]
  if (!pos) return null

  const isMastered = stats?.isComplete
  const style = getNodeStyle(isUnlocked, isMastered)

  return (
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transform"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
      }}
    >
      {/* Simplified Node Card */}
      <div
        role="button"
        tabIndex={0}
        onClick={onNodeClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onNodeClick()
          }
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`relative cursor-pointer transition-all duration-200 ${isHovered && isUnlocked ? "z-20 scale-105" : "z-10"} ${!isUnlocked ? "cursor-not-allowed opacity-40" : ""} `}
      >
        <Card
          className={`relative w-32 overflow-hidden bg-gradient-to-br transition-all duration-200 ${style.bg} ${style.border} border ${isUnlocked && !isMastered ? "hover:border-border" : ""} ${isMastered ? "ring-1 ring-emerald-500/40" : ""} `}
        >
          {/* Mastered checkmark */}
          {isMastered && (
            <div className="absolute -top-1 -right-1 rounded-full bg-emerald-500 p-0.5">
              <Check className="h-2.5 w-2.5 text-black" />
            </div>
          )}

          {/* Lock icon for locked nodes */}
          {!isUnlocked && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-black/50">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          <CardContent className="p-2.5">
            {/* Node name - larger, clearer */}
            <h3 className={`mb-2 text-sm leading-tight font-medium ${style.text}`}>{node.name}</h3>

            {/* Simple progress: just the count */}
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {stats?.completed || 0}/{stats?.total || 0}
              </span>
            </div>
            <Progress value={stats?.progress || 0} className="h-1 bg-muted" />
          </CardContent>
        </Card>

        {/* Prerequisites tooltip - only on hover for locked nodes */}
        {isHovered && !isUnlocked && prerequisites.length > 0 && (
          <div className="absolute top-full left-1/2 z-50 mt-1.5 w-40 -translate-x-1/2 transform">
            <div className="rounded-lg border border-border bg-muted p-2 text-xs shadow-xl">
              <div className="mb-1 text-muted-foreground">Complete first:</div>
              <div className="flex flex-wrap gap-1">
                {prerequisites.map((p) => (
                  <span
                    key={p.id}
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      nodeStats[p.id]?.isComplete
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
