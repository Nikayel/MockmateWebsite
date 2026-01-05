"use client"

import { useState, useMemo, useRef } from "react"
import { Play, Lock, Check, ChevronDown, ChevronUp, GitBranch } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  scenarios,
  type Scenario,
  type DSAScenario,
  type DifficultyLevel,
} from "@/lib/scenarios"
import {
  PATTERN_ROADMAP,
  PATTERN_METADATA,
  type PatternNode,
  type DSAPattern,
  isPatternUnlocked,
  getPatternPrerequisites,
} from "@/lib/types/dsa-patterns"

// Type for node stats
interface NodeStats {
  scenarios: Scenario[]
  completed: number
  total: number
  progress: number
  isComplete: boolean
}

interface DSARoadmapProps {
  onStartInterview: (scenario: Scenario) => void
  completedProblems?: string[]
}

// Infer pattern from scenario
function inferPattern(scenario: Scenario): DSAPattern | null {
  if (scenario.type !== 'dsa') return null
  const dsaScenario = scenario as DSAScenario
  if (dsaScenario.pattern) return dsaScenario.pattern

  const tags = scenario.tags.map(t => t.toLowerCase())
  const title = scenario.title.toLowerCase()

  if (tags.includes('hash-table') || tags.includes('array') || title.includes('two sum') || title.includes('contains duplicate') || title.includes('anagram')) {
    return 'arrays-hashing'
  }
  if (tags.includes('two-pointers') || title.includes('3sum') || title.includes('container') || title.includes('trapping')) {
    return 'two-pointers'
  }
  if (tags.includes('sliding-window') || title.includes('sliding') || title.includes('substring') || title.includes('window')) {
    return 'sliding-window'
  }
  if (tags.includes('stack') || title.includes('parentheses') || title.includes('stack')) {
    return 'stack'
  }
  if (tags.includes('binary-search') || title.includes('binary search') || title.includes('rotated')) {
    return 'binary-search'
  }
  if (tags.includes('linked-list') || title.includes('linked list') || title.includes('lru cache')) {
    return 'linked-list'
  }
  if (tags.includes('tree') || tags.includes('binary-tree') || title.includes('tree') || title.includes('bst')) {
    return 'trees'
  }
  if (tags.includes('trie') || title.includes('trie') || title.includes('prefix')) {
    return 'trie'
  }
  if (tags.includes('heap') || tags.includes('priority-queue') || title.includes('kth largest') || title.includes('top k')) {
    return 'heap'
  }
  if (tags.includes('backtracking') || title.includes('permutation') || title.includes('combination') || title.includes('subsets')) {
    return 'backtracking'
  }
  if (tags.includes('graph') || tags.includes('bfs') || tags.includes('dfs') || title.includes('island') || title.includes('course schedule')) {
    return 'graphs'
  }
  if (tags.includes('dynamic-programming') || tags.includes('dp') || title.includes('climbing stairs') || title.includes('coin change') || title.includes('house robber')) {
    return 'dp-1d'
  }
  if (tags.includes('greedy') || title.includes('jump game') || title.includes('gas station')) {
    return 'greedy'
  }
  if (tags.includes('interval') || title.includes('interval')) {
    return 'intervals'
  }
  if (tags.includes('math') || title.includes('pow') || title.includes('sqrt')) {
    return 'math'
  }
  if (tags.includes('bit') || title.includes('single number') || title.includes('counting bits')) {
    return 'bit-manipulation'
  }
  if (tags.includes('matrix') || title.includes('rotate image') || title.includes('spiral')) {
    return 'matrix'
  }

  return 'arrays-hashing'
}

const getDifficultyColor = (difficulty: DifficultyLevel) => {
  switch (difficulty) {
    case "easy": return "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
    case "medium": return "text-amber-300 bg-amber-500/10 border-amber-500/20"
    case "hard": return "text-rose-300 bg-rose-500/10 border-rose-500/20"
    default: return "text-gray-300 bg-gray-500/10 border-gray-500/20"
  }
}

// Simplified: single style for unlocked nodes (reduces cognitive load from 4 tier colors to 1)
const NODE_STYLE = {
  unlocked: { bg: "from-zinc-700/50 to-zinc-800/50", border: "border-zinc-600", text: "text-white", glow: "shadow-zinc-500/10" },
  locked: { bg: "bg-zinc-900/50", border: "border-zinc-800", text: "text-zinc-500" },
  mastered: { bg: "from-emerald-900/30 to-emerald-950/30", border: "border-emerald-500/50", text: "text-emerald-400", glow: "shadow-emerald-500/20" },
}

// Keep tier labels for modal only (progressive disclosure)
const TIER_LABELS: Record<number, string> = {
  1: "Foundation",
  2: "Core",
  3: "Advanced",
  4: "Expert",
}

// Node positions for the tree layout - organized as a proper skill tree
const NODE_POSITIONS: Record<string, { x: number; y: number; tier: number }> = {
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

export function DSARoadmap({ onStartInterview, completedProblems = [] }: DSARoadmapProps) {
  const [expandedNode, setExpandedNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate completion status for each pattern node
  const nodeStats = useMemo((): Record<string, NodeStats> => {
    const dsaScenarios = scenarios.filter(s => s.type === 'dsa')
    const stats: Record<string, NodeStats> = {}

    PATTERN_ROADMAP.forEach(node => {
      const nodeScenarios = dsaScenarios.filter(s => {
        const pattern = inferPattern(s)
        return pattern && node.patterns.includes(pattern)
      })

      const completed = nodeScenarios.filter(s => completedProblems.includes(s.id)).length
      const total = nodeScenarios.length
      const progress = total > 0 ? (completed / total) * 100 : 0
      // Consider a pattern "complete" if at least 50% of problems are solved
      const isComplete = progress >= 50

      stats[node.id] = { scenarios: nodeScenarios, completed, total, progress, isComplete }
    })

    return stats
  }, [completedProblems])

  // Determine which patterns are unlocked based on prerequisites
  const unlockedPatterns = useMemo(() => {
    const completedPatternIds = PATTERN_ROADMAP
      .filter(node => nodeStats[node.id]?.isComplete)
      .map(node => node.id)

    return PATTERN_ROADMAP.reduce((acc, node) => {
      acc[node.id] = isPatternUnlocked(node.id, completedPatternIds)
      return acc
    }, {} as Record<string, boolean>)
  }, [nodeStats])

  const totalProblems = Object.values(nodeStats).reduce((sum, s) => sum + s.total, 0)
  const totalCompleted = Object.values(nodeStats).reduce((sum, s) => sum + s.completed, 0)

  // Generate SVG paths for connections
  const connections = useMemo(() => {
    const paths: { from: string; to: string; isActive: boolean }[] = []

    PATTERN_ROADMAP.forEach(node => {
      node.prerequisites.forEach(prereqId => {
        const fromPos = NODE_POSITIONS[prereqId]
        const toPos = NODE_POSITIONS[node.id]
        if (fromPos && toPos) {
          const isActive = nodeStats[prereqId]?.isComplete || false
          paths.push({ from: prereqId, to: node.id, isActive })
        }
      })
    })

    return paths
  }, [nodeStats])

  // Simplified: only 3 states instead of 4 tier colors + 3 states
  const getNodeStyle = (isUnlocked: boolean, isMastered: boolean) => {
    if (isMastered) return NODE_STYLE.mastered
    if (isUnlocked) return NODE_STYLE.unlocked
    return NODE_STYLE.locked
  }

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Compact Header with inline legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-emerald-500" />
            DSA Skill Tree
          </h2>
          {/* Inline mini-legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
              Ready
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              Done
            </span>
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-zinc-400">
            <span className="text-white font-medium">{totalCompleted}</span>/{totalProblems} solved
          </div>
          <Progress value={(totalCompleted / totalProblems) * 100} className="w-24 h-1.5 bg-zinc-800" />
        </div>
      </div>

      {/* Visual Tree Map - reduced height for less scroll */}
      <div className="relative bg-zinc-900/30 rounded-xl border border-zinc-800 p-3 overflow-x-auto">
        <div className="relative" style={{ minHeight: '520px', minWidth: '800px' }}>
          {/* SVG for connection lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%' }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00d9ff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#00d9ff" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="inactiveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#374151" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#374151" stopOpacity="0.3" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {connections.map(({ from, to, isActive }) => {
              const fromPos = NODE_POSITIONS[from]
              const toPos = NODE_POSITIONS[to]
              if (!fromPos || !toPos) return null

              // Calculate curved path
              const midY = (fromPos.y + toPos.y) / 2
              const controlY = midY

              return (
                <path
                  key={`${from}-${to}`}
                  d={`M ${fromPos.x} ${fromPos.y + 3}
                      Q ${fromPos.x} ${controlY}, ${(fromPos.x + toPos.x) / 2} ${controlY}
                      Q ${toPos.x} ${controlY}, ${toPos.x} ${toPos.y - 1}`}
                  fill="none"
                  stroke={isActive ? "url(#activeGradient)" : "url(#inactiveGradient)"}
                  strokeWidth={isActive ? "0.4" : "0.2"}
                  filter={isActive ? "url(#glow)" : undefined}
                  className="transition-all duration-500"
                />
              )
            })}
          </svg>

          {/* Pattern Nodes - Simplified cards */}
          {PATTERN_ROADMAP.map((node) => {
            const pos = NODE_POSITIONS[node.id]
            if (!pos) return null

            const stats = nodeStats[node.id]
            const isUnlocked = unlockedPatterns[node.id]
            const isMastered = stats?.isComplete
            const isHovered = hoveredNode === node.id
            const isExpanded = expandedNode === node.id
            const prerequisites = getPatternPrerequisites(node.id)
            const style = getNodeStyle(isUnlocked, isMastered)

            return (
              <div
                key={node.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                }}
              >
                {/* Simplified Node Card */}
                <div
                  onClick={() => isUnlocked && setExpandedNode(isExpanded ? null : node.id)}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
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
          })}
        </div>
      </div>

      {/* Expanded Problem List Modal - Contains tier/difficulty info moved from cards */}
      {expandedNode && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setExpandedNode(null)}>
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
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
                <>
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
                        onClick={() => setExpandedNode(null)}
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
                                  setExpandedNode(null)
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
                </>
              )
            })()}
          </div>
        </div>
      )}

    </div>
  )
}
