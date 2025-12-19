"use client"

import { useState, useMemo } from "react"
import { Play, Lock, Check, ChevronDown, ChevronUp, ArrowDown, Info, Target } from "lucide-react"
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
  1: { bg: "from-emerald-600/30 to-emerald-800/30", border: "border-emerald-500/50", text: "text-emerald-400", label: "Foundation" },
  2: { bg: "from-blue-600/30 to-blue-800/30", border: "border-blue-500/50", text: "text-blue-400", label: "Core" },
  3: { bg: "from-purple-600/30 to-purple-800/30", border: "border-purple-500/50", text: "text-purple-400", label: "Advanced" },
  4: { bg: "from-orange-600/30 to-orange-800/30", border: "border-orange-500/50", text: "text-orange-400", label: "Expert" },
}

export function DSARoadmap({ onStartInterview, completedProblems = [] }: DSARoadmapProps) {
  const [expandedNode, setExpandedNode] = useState<string | null>(null)

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

  // Group nodes by tier
  const tiers = [1, 2, 3, 4]

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Target className="h-6 w-6 text-[#00d9ff]" />
              DSA Learning Roadmap
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
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-gray-300">Unlocked (ready to learn)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-gray-600"></div>
            <span className="text-gray-300">Locked (complete prerequisites first)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-[#00d9ff]" />
            <span className="text-gray-300">Mastered (50%+ complete)</span>
          </div>
        </div>

        {/* Roadmap Tree */}
        <div className="space-y-8">
          {tiers.map((tier) => {
            const tierNodes = PATTERN_ROADMAP.filter(n => n.tier === tier)
            if (tierNodes.length === 0) return null

            const tierConfig = TIER_COLORS[tier as keyof typeof TIER_COLORS]

            return (
              <div key={tier} className="relative">
                {/* Tier Label */}
                <div className="flex items-center gap-3 mb-4">
                  <Badge className={`${tierConfig.text} bg-transparent border ${tierConfig.border} px-3 py-1`}>
                    Tier {tier}: {tierConfig.label}
                  </Badge>
                  <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent"></div>
                </div>

                {/* Connection arrows from previous tier */}
                {tier > 1 && (
                  <div className="flex justify-center -mt-2 mb-2">
                    <ArrowDown className="h-5 w-5 text-gray-600" />
                  </div>
                )}

                {/* Pattern Nodes */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {tierNodes.map((node) => {
                    const stats = nodeStats[node.id]
                    const isUnlocked = unlockedPatterns[node.id]
                    const isExpanded = expandedNode === node.id
                    const prerequisites = getPatternPrerequisites(node.id)
                    const isMastered = stats?.isComplete

                    return (
                      <Card
                        key={node.id}
                        className={`relative transition-all duration-300 ${
                          isExpanded ? 'col-span-full' : ''
                        } ${
                          isUnlocked
                            ? `bg-gradient-to-br ${tierConfig.bg} ${tierConfig.border} border hover:border-opacity-100 cursor-pointer`
                            : 'bg-gray-900/30 border-gray-800 opacity-60'
                        } ${
                          isMastered ? 'ring-2 ring-[#00d9ff]/50' : ''
                        }`}
                        onClick={() => isUnlocked && setExpandedNode(isExpanded ? null : node.id)}
                      >
                        {/* Mastered Badge */}
                        {isMastered && (
                          <div className="absolute -top-2 -right-2 bg-[#00d9ff] rounded-full p-1">
                            <Check className="h-3 w-3 text-black" />
                          </div>
                        )}

                        {/* Lock Overlay */}
                        {!isUnlocked && (
                          <div
                            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10"
                            title={`Complete these first: ${prerequisites.map(p => p.name).join(', ')}`}
                          >
                            <div className="flex flex-col items-center gap-2 text-gray-400">
                              <Lock className="h-6 w-6" />
                              <span className="text-xs">Complete prerequisites</span>
                              <span className="text-xs text-gray-500">
                                ({prerequisites.map(p => p.name).join(', ')})
                              </span>
                            </div>
                          </div>
                        )}

                        <CardContent className="p-4">
                          {/* Node Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h3 className={`font-semibold ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                                {node.name}
                              </h3>
                              <Info
                                className="h-4 w-4 text-gray-500 cursor-help"
                                title={node.description}
                              />
                            </div>
                            {isUnlocked && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400">
                                  {stats?.completed || 0}/{stats?.total || 0}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Progress Bar */}
                          <Progress
                            value={stats?.progress || 0}
                            className="h-1.5 bg-gray-800/50 mb-2"
                          />

                          {/* Prerequisites Badge */}
                          {prerequisites.length > 0 && !isExpanded && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              <span className="text-xs text-gray-500">Requires:</span>
                              {prerequisites.map(p => (
                                <Badge
                                  key={p.id}
                                  variant="outline"
                                  className={`text-xs ${nodeStats[p.id]?.isComplete ? 'text-[#00d9ff] border-[#00d9ff]/50' : 'text-gray-500 border-gray-700'}`}
                                >
                                  {p.name}
                                  {nodeStats[p.id]?.isComplete && <Check className="h-3 w-3 ml-1" />}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Difficulty Distribution (when collapsed) */}
                          {!isExpanded && stats && stats.total > 0 && (
                            <div className="flex gap-2 mt-2">
                              {['easy', 'medium', 'hard'].map(diff => {
                                const count = stats.scenarios.filter(s => s.difficulty === diff).length
                                if (count === 0) return null
                                return (
                                  <Badge
                                    key={diff}
                                    className={`${getDifficultyColor(diff as DifficultyLevel)} text-xs`}
                                  >
                                    {count} {diff}
                                  </Badge>
                                )
                              })}
                            </div>
                          )}

                          {/* Expanded Problem List */}
                          {isExpanded && stats && (
                            <div className="mt-4 space-y-2" onClick={(e) => e.stopPropagation()}>
                              {/* Pattern Info */}
                              <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-800 mb-4">
                                <p className="text-sm text-gray-300">{node.description}</p>
                                {prerequisites.length > 0 && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Prerequisites:</span>
                                    {prerequisites.map(p => (
                                      <Badge
                                        key={p.id}
                                        className={nodeStats[p.id]?.isComplete
                                          ? 'bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/50'
                                          : 'bg-gray-800 text-gray-400'
                                        }
                                      >
                                        {p.name}
                                        {nodeStats[p.id]?.isComplete && <Check className="h-3 w-3 ml-1" />}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Problems List */}
                              {stats.scenarios
                                .sort((a, b) => {
                                  const order = { easy: 0, medium: 1, hard: 2 }
                                  return order[a.difficulty] - order[b.difficulty]
                                })
                                .map((scenario) => {
                                  const isCompleted = completedProblems.includes(scenario.id)
                                  const pattern = inferPattern(scenario)
                                  const metadata = pattern ? PATTERN_METADATA[pattern] : null

                                  return (
                                    <div
                                      key={scenario.id}
                                      className={`p-3 rounded-lg bg-gray-900/50 border border-gray-700/50 hover:border-gray-600 transition-colors ${
                                        isCompleted ? 'opacity-70' : ''
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                          {isCompleted ? (
                                            <div className="p-1 rounded-full bg-green-500/20">
                                              <Check className="h-4 w-4 text-green-400" />
                                            </div>
                                          ) : (
                                            <div className="p-1 rounded-full bg-gray-700">
                                              <Play className="h-4 w-4 text-gray-400" />
                                            </div>
                                          )}
                                          <div className="flex-1">
                                            <p className={`font-medium ${isCompleted ? 'text-gray-400' : 'text-white'}`}>
                                              {scenario.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                              <Badge className={`${getDifficultyColor(scenario.difficulty)} text-xs px-1.5 py-0`}>
                                                {scenario.difficulty}
                                              </Badge>
                                              <span className="text-xs text-gray-500">
                                                {scenario.companies.slice(0, 2).join(', ')}
                                              </span>
                                            </div>
                                            {/* Key Techniques */}
                                            {metadata && (
                                              <div className="mt-1 flex flex-wrap gap-1">
                                                {metadata.keyTechniques.slice(0, 3).map(tech => (
                                                  <span key={tech} className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                                                    {tech}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <Button
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation()
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
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Tips Section */}
        <div className="mt-8 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Learning Tips</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-[#00d9ff]">1.</span>
              Start with Arrays & Hashing - it's the foundation for everything else.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#00d9ff]">2.</span>
              Complete at least 50% of problems in a pattern before moving to the next tier.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#00d9ff]">3.</span>
              Each pattern builds on previous ones - don't skip ahead!
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#00d9ff]">4.</span>
              Review locked patterns to understand what you're working towards.
            </li>
          </ul>
        </div>
      </div>
  )
}
