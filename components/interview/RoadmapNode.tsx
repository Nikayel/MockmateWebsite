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
  'arrays-hashing': { x: 50, y: 5, tier: 1 },

  // Tier 2 - Core (branches from foundation)
  'two-pointers': { x: 20, y: 18, tier: 2 },
  'stack': { x: 40, y: 18, tier: 2 },
  'binary-search': { x: 60, y: 18, tier: 2 },
  'sliding-window': { x: 10, y: 30, tier: 2 },
  'linked-list': { x: 30, y: 30, tier: 2 },

  // Tier 3 - Advanced (deeper branches)
  'trees': { x: 35, y: 42, tier: 3 },
  'heap': { x: 65, y: 42, tier: 3 },
  'trie': { x: 20, y: 54, tier: 3 },
  'backtracking': { x: 45, y: 54, tier: 3 },
  'graphs': { x: 70, y: 54, tier: 3 },

  // Tier 4 - Expert (specialized branches)
  'dp-1d': { x: 35, y: 66, tier: 4 },
  'dp-2d': { x: 25, y: 78, tier: 4 },
  'dp-tree': { x: 45, y: 78, tier: 4 },
  'greedy': { x: 55, y: 66, tier: 4 },
  'intervals': { x: 65, y: 78, tier: 4 },
  'bit-manipulation': { x: 80, y: 30, tier: 4 },
  'math-geometry': { x: 90, y: 18, tier: 4 },
  'matrix': { x: 15, y: 90, tier: 4 },
}

// Simplified: single style for unlocked nodes (reduces cognitive load from 4 tier colors to 1)
const NODE_STYLE = {
  unlocked: { bg: "from-zinc-700/50 to-zinc-800/50", border: "border-zinc-600", text: "text-white", glow: "shadow-zinc-500/10" },
  locked: { bg: "bg-zinc-900/50", border: "border-zinc-800", text: "text-zinc-500" },
  mastered: { bg: "from-emerald-900/30 to-emerald-950/30", border: "border-emerald-500/50", text: "text-emerald-400", glow: "shadow-emerald-500/20" },
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
      className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
      }}
    >
      {/* Simplified Node Card */}
      <div
        onClick={onNodeClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`
          relative transition-all duration-200 cursor-pointer
          ${isHovered && isUnlocked ? 'scale-105 z-20' : 'z-10'}
          ${!isUnlocked ? 'opacity-40 cursor-not-allowed' : ''}
        `}
      >
        <Card
          className={`
            relative overflow-hidden w-32 transition-all duration-200
            bg-gradient-to-br ${style.bg} ${style.border} border
            ${isUnlocked && !isMastered ? 'hover:border-zinc-500' : ''}
            ${isMastered ? 'ring-1 ring-emerald-500/40' : ''}
          `}
        >
          {/* Mastered checkmark */}
          {isMastered && (
            <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5">
              <Check className="h-2.5 w-2.5 text-black" />
            </div>
          )}

          {/* Lock icon for locked nodes */}
          {!isUnlocked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-20">
              <Lock className="h-4 w-4 text-zinc-600" />
            </div>
          )}

          <CardContent className="p-2.5">
            {/* Node name - larger, clearer */}
            <h3 className={`font-medium text-sm leading-tight mb-2 ${style.text}`}>
              {node.name}
            </h3>

            {/* Simple progress: just the count */}
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>{stats?.completed || 0}/{stats?.total || 0}</span>
            </div>
            <Progress
              value={stats?.progress || 0}
              className="h-1 bg-zinc-800"
            />
          </CardContent>
        </Card>

        {/* Prerequisites tooltip - only on hover for locked nodes */}
        {isHovered && !isUnlocked && prerequisites.length > 0 && (
          <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-1.5 z-50 w-40">
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 shadow-xl text-xs">
              <div className="text-zinc-400 mb-1">Complete first:</div>
              <div className="flex flex-wrap gap-1">
                {prerequisites.map(p => (
                  <span
                    key={p.id}
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      nodeStats[p.id]?.isComplete
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-700 text-zinc-400'
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
