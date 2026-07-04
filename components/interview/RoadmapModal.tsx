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
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
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

  const node = PATTERN_ROADMAP.find((n) => n.id === expandedNode)
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
    easy: stats.scenarios.filter((s) => s.difficulty === "easy").length,
    medium: stats.scenarios.filter((s) => s.difficulty === "medium").length,
    hard: stats.scenarios.filter((s) => s.difficulty === "hard").length,
  }

  return (
    <div
      className="bg-background/70 fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="button"
      tabIndex={0}
      aria-label="Close roadmap details"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
          e.preventDefault()
          onClose()
        }
      }}
    >
      <div className="bg-card border-border max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl border shadow-2xl">
        {/* Cleaner Header */}
        <div className="border-border border-b p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h2 className="text-foreground text-lg font-semibold">{node.name}</h2>
                {stats.isComplete && (
                  <span className="rounded-full bg-emerald-500 p-0.5">
                    <Check className="text-foreground h-3 w-3" />
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-sm">{node.description}</p>

              {/* Tier + Difficulty info (moved here from cards) */}
              <div className="mt-3 flex items-center gap-3">
                <span className="text-muted-foreground bg-muted rounded px-2 py-0.5 text-xs">
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
                    <span className="text-red-400">{difficultyCount.hard} hard</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-3 flex items-center gap-3">
            <Progress value={stats.progress} className="bg-muted h-1.5 flex-1" />
            <span className="text-muted-foreground text-xs">
              {stats.completed}/{stats.total}
            </span>
          </div>

          {/* Prerequisites - only show if not all complete */}
          {prerequisites.length > 0 && !prerequisites.every((p) => nodeStats[p.id]?.isComplete) && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Requires:</span>
              {prerequisites.map((p) => (
                <span
                  key={p.id}
                  className={`rounded px-1.5 py-0.5 ${
                    nodeStats[p.id]?.isComplete
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-muted text-muted-foreground"
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
          <details className="border-border group border-b">
            <summary className="text-muted-foreground hover:text-muted-foreground flex cursor-pointer items-center gap-2 p-3 text-xs select-none">
              <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
              Pattern tips & common questions
            </summary>
            <div className="space-y-2 px-3 pb-3">
              {/* Key techniques as simple tags */}
              <div className="flex flex-wrap gap-1">
                {metadata.keyTechniques.slice(0, 4).map((tech, i) => (
                  <span
                    key={i}
                    className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs"
                  >
                    {tech}
                  </span>
                ))}
              </div>
              {/* One complexity hint */}
              {metadata.timeComplexityHints[0] && (
                <p className="text-muted-foreground text-xs">{metadata.timeComplexityHints[0]}</p>
              )}
            </div>
          </details>
        )}

        {/* Problems List - Simplified */}
        <div className="overflow-y-auto p-3" style={{ maxHeight: "50vh" }}>
          <div className="space-y-1.5">
            {stats.scenarios
              .sort((a, b) => {
                const order = { easy: 0, medium: 1, hard: 2 }
                return order[a.difficulty] - order[b.difficulty]
              })
              .map((scenario) => {
                const isCompleted = completedProblems.includes(scenario.id)
                const diffColor = difficultyColorClass(scenario.difficulty, "text")

                return (
                  <div
                    key={scenario.id}
                    className={`bg-muted/50 hover:bg-muted group flex items-center justify-between rounded-lg p-2.5 transition-colors ${
                      isCompleted ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      {isCompleted ? (
                        <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                      ) : (
                        <Play className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm ${isCompleted ? "text-muted-foreground" : "text-foreground"}`}
                        >
                          {scenario.title}
                        </p>
                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
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
                      className="h-7 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      {isCompleted ? "Redo" : "Start"}
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
