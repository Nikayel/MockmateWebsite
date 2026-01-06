/**
 * RoadmapModal Component
 *
 * Modal showing detailed problem list for a selected DSA pattern node
 * Includes pattern metadata, difficulty distribution, and actionable problem list
 */

import { Play, Check, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PATTERN_ROADMAP, PATTERN_METADATA } from "@/lib/types/dsa-patterns"
import type { Scenario } from "@/lib/scenarios"
import type { NodeStats } from "@/lib/hooks/useDSARoadmap"
import { NODE_POSITIONS } from "./RoadmapNode"

// Keep tier labels for modal only (progressive disclosure)
const TIER_LABELS: Record<number, string> = {
  1: "Foundation",
  2: "Core",
  3: "Advanced",
  4: "Expert",
}

interface RoadmapModalProps {
  expandedNode: string | null
  nodeStats: Record<string, NodeStats>
  completedProblems: string[]
  onClose: () => void
  onStartInterview: (scenario: Scenario) => void
  getPatternPrerequisites: (nodeId: string) => Array<{ id: string; name: string }>
}

export function RoadmapModal({
  expandedNode,
  nodeStats,
  completedProblems,
  onClose,
  onStartInterview,
  getPatternPrerequisites,
}: RoadmapModalProps) {
  if (!expandedNode) return null

  const node = PATTERN_ROADMAP.find(n => n.id === expandedNode)
  const stats = nodeStats[expandedNode]
  const prerequisites = getPatternPrerequisites(expandedNode)
  const pos = NODE_POSITIONS[expandedNode]
  const tierLabel = TIER_LABELS[pos?.tier || 1]

  // Get pattern metadata for display
  const firstPattern = node?.patterns[0]
  const metadata = firstPattern ? PATTERN_METADATA[firstPattern] : null

  if (!node || !stats) return null

  // Calculate difficulty distribution for this pattern
  const difficultyCount = {
    easy: stats.scenarios.filter(s => s.difficulty === 'easy').length,
    medium: stats.scenarios.filter(s => s.difficulty === 'medium').length,
    hard: stats.scenarios.filter(s => s.difficulty === 'hard').length,
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cleaner Header */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-white">{node.name}</h2>
                {stats.isComplete && (
                  <span className="bg-emerald-500 rounded-full p-0.5">
                    <Check className="h-3 w-3 text-black" />
                  </span>
                )}
              </div>
              <p className="text-zinc-400 text-sm">{node.description}</p>

              {/* Tier + Difficulty info (moved here from cards) */}
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                  {tierLabel}
                </span>
                <div className="flex items-center gap-1.5 text-xs">
                  {difficultyCount.easy > 0 && (
                    <span className="text-emerald-400">{difficultyCount.easy} easy</span>
                  )}
                  {difficultyCount.medium > 0 && (
                    <span className="text-amber-400">{difficultyCount.medium} medium</span>
                  )}
                  {difficultyCount.hard > 0 && (
                    <span className="text-rose-400">{difficultyCount.hard} hard</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white p-1 -mr-1 -mt-1"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-3 flex items-center gap-3">
            <Progress value={stats.progress} className="flex-1 h-1.5 bg-zinc-800" />
            <span className="text-xs text-zinc-400">{stats.completed}/{stats.total}</span>
          </div>

          {/* Prerequisites - only show if not all complete */}
          {prerequisites.length > 0 && !prerequisites.every(p => nodeStats[p.id]?.isComplete) && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-zinc-500">Requires:</span>
              {prerequisites.map(p => (
                <span
                  key={p.id}
                  className={`px-1.5 py-0.5 rounded ${
                    nodeStats[p.id]?.isComplete
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {p.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Pattern Tips - Collapsed by default, expandable */}
        {metadata && (
          <details className="border-b border-zinc-800 group">
            <summary className="p-3 cursor-pointer text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-2 select-none">
              <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
              Pattern tips & common questions
            </summary>
            <div className="px-3 pb-3 space-y-2">
              {/* Key techniques as simple tags */}
              <div className="flex flex-wrap gap-1">
                {metadata.keyTechniques.slice(0, 4).map((tech, i) => (
                  <span key={i} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                    {tech}
                  </span>
                ))}
              </div>
              {/* One complexity hint */}
              {metadata.timeComplexityHints[0] && (
                <p className="text-xs text-zinc-500">{metadata.timeComplexityHints[0]}</p>
              )}
            </div>
          </details>
        )}

        {/* Problems List - Simplified */}
        <div className="p-3 overflow-y-auto" style={{ maxHeight: '50vh' }}>
          <div className="space-y-1.5">
            {stats.scenarios
              .sort((a, b) => {
                const order = { easy: 0, medium: 1, hard: 2 }
                return order[a.difficulty] - order[b.difficulty]
              })
              .map((scenario) => {
                const isCompleted = completedProblems.includes(scenario.id)
                const diffColor = {
                  easy: 'text-emerald-400',
                  medium: 'text-amber-400',
                  hard: 'text-rose-400'
                }[scenario.difficulty]

                return (
                  <div
                    key={scenario.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors group ${
                      isCompleted ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {isCompleted ? (
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Play className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${isCompleted ? 'text-zinc-500' : 'text-white'}`}>
                          {scenario.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span className={diffColor}>{scenario.difficulty}</span>
                          <span>·</span>
                          <span>{scenario.estimatedTime}m</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        onClose()
                        onStartInterview(scenario)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-xs"
                    >
                      {isCompleted ? 'Redo' : 'Start'}
                    </Button>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}
