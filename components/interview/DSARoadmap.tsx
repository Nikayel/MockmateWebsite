"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Play, Lock, Check, ChevronDown, ChevronUp, Info, Target, GitBranch, Zap, Clock, HardDrive } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

const TIER_COLORS = {
  1: { bg: "from-emerald-600/30 to-emerald-800/30", border: "border-emerald-500/50", text: "text-emerald-400", label: "Foundation", glow: "shadow-emerald-500/20" },
  2: { bg: "from-blue-600/30 to-blue-800/30", border: "border-blue-500/50", text: "text-blue-400", label: "Core", glow: "shadow-blue-500/20" },
  3: { bg: "from-purple-600/30 to-purple-800/30", border: "border-purple-500/50", text: "text-purple-400", label: "Advanced", glow: "shadow-purple-500/20" },
  4: { bg: "from-orange-600/30 to-orange-800/30", border: "border-orange-500/50", text: "text-orange-400", label: "Expert", glow: "shadow-orange-500/20" },
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

  // Get color based on node status
  const getNodeColor = (nodeId: string, isUnlocked: boolean, isMastered: boolean) => {
    if (isMastered) return '#00d9ff'
    if (isUnlocked) {
      const tier = NODE_POSITIONS[nodeId]?.tier || 1
      switch (tier) {
        case 1: return '#10b981' // emerald
        case 2: return '#3b82f6' // blue
        case 3: return '#a855f7' // purple
        case 4: return '#f97316' // orange
        default: return '#6b7280'
      }
    }
    return '#374151' // gray-700
  }

  return (
    <div className="space-y-6" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-[#00d9ff]" />
            DSA Skill Tree
          </h2>
          <p className="text-gray-400">Master patterns in order. Each pattern builds on the ones before it.</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Overall Progress</div>
          <div className="text-lg font-semibold text-gray-100">{totalCompleted}/{totalProblems} solved</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs mb-2 text-gray-400">
          <span>Overall mastery</span>
          <span>{Math.round((totalCompleted / totalProblems) * 100)}%</span>
        </div>
        <Progress value={(totalCompleted / totalProblems) * 100} className="h-2 bg-gray-900/80" />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 p-3 bg-gray-900/50 rounded-lg border border-gray-800">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500"></div>
          <span className="text-gray-300">Unlocked (ready to learn)</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-gray-600"></div>
          <span className="text-gray-300">Locked (complete prerequisites)</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-[#00d9ff] shadow-lg shadow-[#00d9ff]/50"></div>
          <span className="text-gray-300">Mastered (50%+ complete)</span>
        </div>
        <div className="flex items-center gap-2 text-sm ml-auto">
          <span className="text-gray-500">Click any unlocked pattern to see problems</span>
        </div>
      </div>

      {/* Visual Tree Map */}
      <div className="relative bg-gray-900/30 rounded-xl border border-gray-800 p-4 overflow-x-auto">
        <div className="relative" style={{ minHeight: '700px', minWidth: '900px' }}>
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

          {/* Pattern Nodes */}
          {PATTERN_ROADMAP.map((node) => {
            const pos = NODE_POSITIONS[node.id]
            if (!pos) return null

            const stats = nodeStats[node.id]
            const isUnlocked = unlockedPatterns[node.id]
            const isMastered = stats?.isComplete
            const isHovered = hoveredNode === node.id
            const isExpanded = expandedNode === node.id
            const prerequisites = getPatternPrerequisites(node.id)
            const tierConfig = TIER_COLORS[pos.tier as keyof typeof TIER_COLORS]
            const nodeColor = getNodeColor(node.id, isUnlocked, isMastered)

            return (
              <div
                key={node.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                }}
              >
                {/* Node Card */}
                <div
                  onClick={() => isUnlocked && setExpandedNode(isExpanded ? null : node.id)}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className={`
                    relative transition-all duration-300 cursor-pointer
                    ${isExpanded ? 'scale-110 z-50' : isHovered ? 'scale-105 z-20' : 'z-10'}
                    ${!isUnlocked ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {/* Glow effect for mastered nodes */}
                  {isMastered && (
                    <div
                      className="absolute inset-0 rounded-xl blur-xl opacity-40"
                      style={{ backgroundColor: '#00d9ff' }}
                    />
                  )}

                  <Card
                    className={`
                      relative overflow-hidden
                      w-36 transition-all duration-300
                      ${isUnlocked
                        ? `bg-gradient-to-br ${tierConfig.bg} ${tierConfig.border} border hover:shadow-lg ${tierConfig.glow}`
                        : 'bg-gray-900/50 border-gray-700'
                      }
                      ${isMastered ? 'ring-2 ring-[#00d9ff]/60 shadow-lg shadow-[#00d9ff]/20' : ''}
                    `}
                  >
                    {/* Mastered indicator */}
                    {isMastered && (
                      <div className="absolute -top-1.5 -right-1.5 bg-[#00d9ff] rounded-full p-1 shadow-lg">
                        <Check className="h-3 w-3 text-black" />
                      </div>
                    )}

                    {/* Lock overlay */}
                    {!isUnlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg z-20">
                        <Lock className="h-5 w-5 text-gray-500" />
                      </div>
                    )}

                    <CardContent className="p-3">
                      {/* Tier badge */}
                      <Badge
                        className={`${tierConfig.text} bg-transparent border ${tierConfig.border} text-[10px] px-1.5 py-0 mb-1.5`}
                      >
                        Tier {pos.tier}
                      </Badge>

                      {/* Node name */}
                      <h3 className={`font-semibold text-sm leading-tight mb-1.5 ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                        {node.name}
                      </h3>

                      {/* Progress bar */}
                      <div className="mb-1.5">
                        <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                          <span>{stats?.completed || 0}/{stats?.total || 0}</span>
                          <span>{Math.round(stats?.progress || 0)}%</span>
                        </div>
                        <Progress
                          value={stats?.progress || 0}
                          className="h-1 bg-gray-800"
                        />
                      </div>

                      {/* Difficulty distribution */}
                      {stats && stats.total > 0 && (
                        <div className="flex gap-1">
                          {['easy', 'medium', 'hard'].map(diff => {
                            const count = stats.scenarios.filter(s => s.difficulty === diff).length
                            if (count === 0) return null
                            const colors: Record<string, string> = {
                              easy: 'bg-emerald-500',
                              medium: 'bg-amber-500',
                              hard: 'bg-rose-500'
                            }
                            return (
                              <div
                                key={diff}
                                className={`${colors[diff]} text-[9px] text-white px-1 rounded`}
                                title={`${count} ${diff}`}
                              >
                                {count}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Prerequisites tooltip on hover */}
                  {isHovered && prerequisites.length > 0 && !isExpanded && (
                    <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 z-50 w-48">
                      <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-xl text-xs">
                        <div className="text-gray-400 mb-1">Requires:</div>
                        <div className="flex flex-wrap gap-1">
                          {prerequisites.map(p => (
                            <Badge
                              key={p.id}
                              className={`text-[10px] ${
                                nodeStats[p.id]?.isComplete
                                  ? 'bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/50'
                                  : 'bg-gray-700 text-gray-400 border-gray-600'
                              }`}
                            >
                              {p.name}
                              {nodeStats[p.id]?.isComplete && <Check className="h-2 w-2 ml-0.5" />}
                            </Badge>
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

      {/* Expanded Problem List Modal */}
      {expandedNode && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setExpandedNode(null)}>
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const node = PATTERN_ROADMAP.find(n => n.id === expandedNode)
              const stats = nodeStats[expandedNode]
              const prerequisites = getPatternPrerequisites(expandedNode)
              const tierConfig = TIER_COLORS[node?.tier as keyof typeof TIER_COLORS] || TIER_COLORS[1]

              // Get pattern metadata for display
              const firstPattern = node?.patterns[0]
              const metadata = firstPattern ? PATTERN_METADATA[firstPattern] : null

              if (!node || !stats) return null

              return (
                <>
                  {/* Header */}
                  <div className={`bg-gradient-to-r ${tierConfig.bg} p-4 border-b border-gray-700`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge className={`${tierConfig.text} bg-transparent border ${tierConfig.border} mb-2`}>
                          Tier {node.tier}: {tierConfig.label}
                        </Badge>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          {node.name}
                          {stats.isComplete && (
                            <span className="bg-[#00d9ff] rounded-full p-1">
                              <Check className="h-4 w-4 text-black" />
                            </span>
                          )}
                        </h2>
                        <p className="text-gray-300 text-sm mt-1">{node.description}</p>
                      </div>
                      <button
                        onClick={() => setExpandedNode(null)}
                        className="text-gray-400 hover:text-white p-2"
                      >
                        <ChevronUp className="h-6 w-6" />
                      </button>
                    </div>

                    {/* Prerequisites */}
                    {prerequisites.length > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-gray-400">Prerequisites:</span>
                        {prerequisites.map(p => (
                          <Badge
                            key={p.id}
                            className={`text-xs ${
                              nodeStats[p.id]?.isComplete
                                ? 'bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/50'
                                : 'bg-gray-800 text-gray-400'
                            }`}
                          >
                            {p.name}
                            {nodeStats[p.id]?.isComplete && <Check className="h-3 w-3 ml-1" />}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Progress */}
                    <div className="mt-3">
                      <div className="flex justify-between text-sm text-gray-300 mb-1">
                        <span>Progress: {stats.completed}/{stats.total} problems</span>
                        <span>{Math.round(stats.progress)}%</span>
                      </div>
                      <Progress value={stats.progress} className="h-2" />
                    </div>
                  </div>

                  {/* Pattern Analysis */}
                  {metadata && (
                    <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4 text-[#00d9ff]" />
                        Pattern Analysis
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Key Techniques */}
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <h4 className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                            <Zap className="h-3 w-3 text-yellow-400" />
                            Key Techniques
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {metadata.keyTechniques.map((tech, i) => (
                              <Badge key={i} variant="outline" className="text-xs bg-gray-700/50 text-gray-300 border-gray-600">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Time Complexity */}
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <h4 className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-green-400" />
                            Time Complexity
                          </h4>
                          <div className="space-y-1">
                            {metadata.timeComplexityHints.slice(0, 2).map((hint, i) => (
                              <p key={i} className="text-xs text-green-300">{hint}</p>
                            ))}
                          </div>
                        </div>

                        {/* Space Complexity */}
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <h4 className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                            <HardDrive className="h-3 w-3 text-blue-400" />
                            Space Complexity
                          </h4>
                          <div className="space-y-1">
                            {metadata.spaceComplexityHints.slice(0, 2).map((hint, i) => (
                              <p key={i} className="text-xs text-blue-300">{hint}</p>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Interviewer Questions */}
                      <div className="mt-3 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                        <h4 className="text-xs text-orange-300 font-medium mb-2">Common Interviewer Questions</h4>
                        <ul className="space-y-1">
                          {metadata.interviewerFollowUps.slice(0, 3).map((q, i) => (
                            <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                              <span className="text-orange-400 flex-shrink-0">•</span>
                              {q}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Problems List */}
                  <div className="p-4 overflow-y-auto" style={{ maxHeight: '40vh' }}>
                    <h3 className="text-sm font-semibold text-white mb-3">
                      Problems ({stats.total})
                    </h3>
                    <div className="space-y-2">
                      {stats.scenarios
                        .sort((a, b) => {
                          const order = { easy: 0, medium: 1, hard: 2 }
                          return order[a.difficulty] - order[b.difficulty]
                        })
                        .map((scenario) => {
                          const isCompleted = completedProblems.includes(scenario.id)

                          return (
                            <div
                              key={scenario.id}
                              className={`p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 transition-colors ${
                                isCompleted ? 'opacity-70' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  {isCompleted ? (
                                    <div className="p-1.5 rounded-full bg-green-500/20">
                                      <Check className="h-4 w-4 text-green-400" />
                                    </div>
                                  ) : (
                                    <div className="p-1.5 rounded-full bg-gray-700">
                                      <Play className="h-4 w-4 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <p className={`font-medium ${isCompleted ? 'text-gray-400' : 'text-white'}`}>
                                      {scenario.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge className={`${getDifficultyColor(scenario.difficulty)} text-xs`}>
                                        {scenario.difficulty}
                                      </Badge>
                                      <span className="text-xs text-gray-500">
                                        {scenario.companies.slice(0, 2).join(', ')}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        ~{scenario.estimatedTime} min
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setExpandedNode(null)
                                    onStartInterview(scenario)
                                  }}
                                  className={`${
                                    isCompleted
                                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                      : 'bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black'
                                  }`}
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  {isCompleted ? 'Redo' : 'Start'}
                                </Button>
                              </div>
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

      {/* Tips Section */}
      <div className="mt-8 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
        <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-[#00d9ff]" />
          How to Use the Skill Tree
        </h4>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">1.</span>
            <span><strong className="text-emerald-400">Start with Arrays & Hashing</strong> - it&apos;s the root of the tree and foundation for everything else.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 font-bold">2.</span>
            <span><strong className="text-blue-400">Follow the branches</strong> - each pattern unlocks once you master 50% of its prerequisites.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400 font-bold">3.</span>
            <span><strong className="text-purple-400">Lines show dependencies</strong> - bright lines mean the prerequisite is complete.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-400 font-bold">4.</span>
            <span><strong className="text-orange-400">Don&apos;t skip ahead</strong> - patterns build on each other. Two Pointers uses Array concepts, Trees use Stack + Linked List, etc.</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
