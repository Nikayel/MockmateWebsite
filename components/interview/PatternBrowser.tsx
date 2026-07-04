"use client"

import { useState, useMemo, memo } from "react"
import {
  Play,
  ChevronDown,
  ChevronUp,
  Lock,
  Check,
  Code,
  Hash,
  Layers,
  GitBranch,
  Binary,
  List,
  TreeDeciduous,
  Network,
  Cpu,
  Zap,
  Box,
  Repeat,
  BarChart3,
  Calculator,
  Grid3X3,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { scenarios, type Scenario, type DSAScenario, type DifficultyLevel } from "@/lib/scenarios"
import { DSA_PATTERNS, PATTERN_METADATA, type DSAPattern } from "@/lib/types/dsa-patterns"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"

interface PatternBrowserProps {
  onStartInterview: (scenario: Scenario) => void
  completedProblems?: string[] // IDs of completed problems
}

// Pattern category groupings for DSA roadmap
const PATTERN_GROUPS = [
  {
    name: "Arrays & Hashing",
    patterns: ["arrays-hashing"] as DSAPattern[],
    icon: Hash,
    color: "from-cyan-500/60 to-blue-500/60",
    bgColor: "bg-slate-900/60",
    borderColor: "border-slate-700/70",
  },
  {
    name: "Two Pointers",
    patterns: ["two-pointers"] as DSAPattern[],
    icon: GitBranch,
    color: "from-emerald-500/60 to-green-500/60",
    bgColor: "bg-slate-900/60",
    borderColor: "border-slate-700/70",
  },
  {
    name: "Sliding Window",
    patterns: ["sliding-window"] as DSAPattern[],
    icon: Layers,
    color: "from-amber-500/60 to-orange-500/60",
    bgColor: "bg-slate-900/60",
    borderColor: "border-slate-700/70",
  },
  {
    name: "Stack",
    patterns: ["stack", "monotonic-stack"] as DSAPattern[],
    icon: List,
    color: "from-purple-500/60 to-pink-500/60",
    bgColor: "bg-slate-900/60",
    borderColor: "border-slate-700/70",
  },
  {
    name: "Binary Search",
    patterns: ["binary-search"] as DSAPattern[],
    icon: Binary,
    color: "from-rose-500/60 to-red-500/60",
    bgColor: "bg-slate-900/60",
    borderColor: "border-slate-700/70",
  },
  {
    name: "Linked List",
    patterns: ["linked-list"] as DSAPattern[],
    icon: Repeat,
    color: "from-indigo-500/60 to-violet-500/60",
    bgColor: "bg-slate-900/60",
    borderColor: "border-slate-700/70",
  },
  {
    name: "Trees",
    patterns: ["trees", "binary-tree", "binary-search-tree"] as DSAPattern[],
    icon: TreeDeciduous,
    color: "from-emerald-500/60 to-teal-500/60",
    bgColor: "bg-slate-900/60",
    borderColor: "border-slate-700/70",
  },
  {
    name: "Tries",
    patterns: ["trie"] as DSAPattern[],
    icon: Network,
    color: "from-sky-500/60 to-cyan-500/60",
    bgColor: "bg-slate-900/60",
    borderColor: "border-slate-700/70",
  },
  {
    name: "Heap / Priority Queue",
    patterns: ["heap", "priority-queue", "heap-priority-queue"] as DSAPattern[],
    icon: BarChart3,
    color: "from-amber-500/60 to-yellow-500/60",
    bgColor: "bg-slate-900/60",
    borderColor: "border-slate-700/70",
  },
  {
    name: "Backtracking",
    patterns: ["backtracking"] as DSAPattern[],
    icon: Repeat,
    color: "from-fuchsia-500/60 to-purple-500/60",
    bgColor: "bg-slate-900/60",
    borderColor: "border-slate-700/70",
  },
  {
    name: "Graphs",
    patterns: [
      "graphs",
      "bfs",
      "dfs",
      "topological-sort",
      "union-find",
      "dijkstra",
    ] as DSAPattern[],
    icon: Network,
    color: "from-blue-500/60 to-indigo-500/60",
    bgColor: "bg-slate-900/60",
    borderColor: "border-slate-700/70",
  },
  {
    name: "Dynamic Programming",
    patterns: ["dp-1d", "dp-2d", "dp-knapsack", "dp-lcs", "dp-tree"] as DSAPattern[],
    icon: Cpu,
    color: "from-orange-500/60 to-red-500/60",
    bgColor: "bg-slate-900/60",
    borderColor: "border-slate-700/70",
  },
  {
    name: "Greedy",
    patterns: ["greedy"] as DSAPattern[],
    icon: Zap,
    color: "from-lime-500/60 to-green-500/60",
    bgColor: "bg-slate-900/60",
    borderColor: "border-slate-700/70",
  },
  {
    name: "Intervals",
    patterns: ["intervals"] as DSAPattern[],
    icon: Box,
    color: "from-teal-500/60 to-cyan-500/60",
    bgColor: "bg-slate-900/60",
    borderColor: "border-slate-700/70",
  },
  {
    name: "Math & Geometry",
    patterns: ["math", "geometry", "math-geometry"] as DSAPattern[],
    icon: Calculator,
    color: "from-pink-500/60 to-rose-500/60",
    bgColor: "bg-slate-900/60",
    borderColor: "border-slate-700/70",
  },
  {
    name: "Bit Manipulation",
    patterns: ["bit-manipulation"] as DSAPattern[],
    icon: Binary,
    color: "from-slate-500/60 to-muted/60",
    bgColor: "bg-slate-900/60",
    borderColor: "border-slate-700/70",
  },
  {
    name: "Matrix",
    patterns: ["matrix"] as DSAPattern[],
    icon: Grid3X3,
    color: "from-violet-500/60 to-purple-500/60",
    bgColor: "bg-slate-900/60",
    borderColor: "border-slate-700/70",
  },
]

// Map scenarios to patterns based on tags and title
function inferPattern(scenario: Scenario): DSAPattern | null {
  if (scenario.type !== "dsa") return null

  const dsaScenario = scenario as DSAScenario
  if (dsaScenario.pattern) return dsaScenario.pattern

  // Infer from tags and title
  const tags = scenario.tags.map((t) => t.toLowerCase())
  const title = scenario.title.toLowerCase()

  // Pattern inference rules
  if (
    tags.includes("hash-table") ||
    tags.includes("array") ||
    title.includes("two sum") ||
    title.includes("contains duplicate") ||
    title.includes("anagram")
  ) {
    return "arrays-hashing"
  }
  if (
    tags.includes("two-pointers") ||
    title.includes("3sum") ||
    title.includes("container") ||
    title.includes("trapping")
  ) {
    return "two-pointers"
  }
  if (
    tags.includes("sliding-window") ||
    title.includes("sliding") ||
    title.includes("substring") ||
    title.includes("window")
  ) {
    return "sliding-window"
  }
  if (
    tags.includes("stack") ||
    title.includes("parentheses") ||
    title.includes("stack") ||
    title.includes("valid parentheses")
  ) {
    return "stack"
  }
  if (
    tags.includes("binary-search") ||
    title.includes("binary search") ||
    title.includes("rotated") ||
    title.includes("search in")
  ) {
    return "binary-search"
  }
  if (
    tags.includes("linked-list") ||
    title.includes("linked list") ||
    title.includes("reverse linked") ||
    title.includes("merge two") ||
    title.includes("lru cache")
  ) {
    return "linked-list"
  }
  if (
    tags.includes("tree") ||
    tags.includes("binary-tree") ||
    title.includes("tree") ||
    title.includes("bst") ||
    title.includes("ancestor")
  ) {
    return "trees"
  }
  if (tags.includes("trie") || title.includes("trie") || title.includes("prefix")) {
    return "trie"
  }
  if (
    tags.includes("heap") ||
    tags.includes("priority-queue") ||
    title.includes("kth largest") ||
    title.includes("top k") ||
    title.includes("merge k")
  ) {
    return "heap"
  }
  if (
    tags.includes("backtracking") ||
    title.includes("permutation") ||
    title.includes("combination") ||
    title.includes("subsets") ||
    title.includes("word search")
  ) {
    return "backtracking"
  }
  if (
    tags.includes("graph") ||
    tags.includes("bfs") ||
    tags.includes("dfs") ||
    title.includes("island") ||
    title.includes("course schedule") ||
    title.includes("clone graph")
  ) {
    return "graphs"
  }
  if (
    tags.includes("dynamic-programming") ||
    tags.includes("dp") ||
    title.includes("climbing stairs") ||
    title.includes("coin change") ||
    title.includes("longest increasing") ||
    title.includes("house robber") ||
    title.includes("edit distance")
  ) {
    return "dp-1d"
  }
  if (tags.includes("greedy") || title.includes("jump game") || title.includes("gas station")) {
    return "greedy"
  }
  if (tags.includes("interval") || title.includes("interval") || title.includes("merge interval")) {
    return "intervals"
  }
  if (tags.includes("math") || title.includes("pow") || title.includes("sqrt")) {
    return "math"
  }
  if (tags.includes("bit") || title.includes("single number") || title.includes("counting bits")) {
    return "bit-manipulation"
  }
  if (tags.includes("matrix") || title.includes("rotate image") || title.includes("spiral")) {
    return "matrix"
  }

  return "arrays-hashing" // Default fallback
}

const getDifficultyColor = (difficulty: DifficultyLevel) =>
  difficultyColorClass(difficulty, "softBadge")

export const PatternBrowser = memo(function PatternBrowser({
  onStartInterview,
  completedProblems = [],
}: PatternBrowserProps) {
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null)

  // Group DSA scenarios by pattern
  const patternGroups = useMemo(() => {
    const dsaScenarios = scenarios.filter((s) => s.type === "dsa")

    return PATTERN_GROUPS.map((group) => {
      const groupScenarios = dsaScenarios.filter((s) => {
        const pattern = inferPattern(s)
        return pattern && group.patterns.includes(pattern)
      })

      const completed = groupScenarios.filter((s) => completedProblems.includes(s.id)).length

      return {
        ...group,
        scenarios: groupScenarios,
        completed,
        total: groupScenarios.length,
        progress: groupScenarios.length > 0 ? (completed / groupScenarios.length) * 100 : 0,
      }
    }).filter((g) => g.total > 0) // Only show groups with problems
  }, [completedProblems])

  const totalProblems = patternGroups.reduce((sum, g) => sum + g.total, 0)
  const totalCompleted = patternGroups.reduce((sum, g) => sum + g.completed, 0)

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-2 text-2xl font-bold">Practice by Pattern</h2>
          <p className="text-muted-foreground">
            Group related problems into patterns to build deep intuition.
          </p>
        </div>
        <div className="text-right">
          <div className="text-muted-foreground mb-1 text-xs tracking-wide uppercase">Progress</div>
          <div className="text-foreground text-lg font-semibold">
            {totalCompleted}/{totalProblems} solved
          </div>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-8">
        <div className="text-muted-foreground mb-2 flex justify-between text-xs">
          <span>Overall progress</span>
          <span>{Math.round((totalCompleted / totalProblems) * 100)}%</span>
        </div>
        <Progress value={(totalCompleted / totalProblems) * 100} className="bg-card/80 h-1.5" />
      </div>

      {/* Pattern Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {patternGroups.map((group) => {
          const Icon = group.icon
          const isExpanded = expandedPattern === group.name

          return (
            <Card
              key={group.name}
              className={`${group.bgColor} ${group.borderColor} hover:border-border/80 cursor-pointer border transition-all duration-300 ${
                isExpanded ? "col-span-full" : ""
              }`}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("[data-problem-list]")) return
                setExpandedPattern(isExpanded ? null : group.name)
              }}
            >
              <CardContent className="p-4">
                {/* Pattern Header */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg bg-gradient-to-br p-2 ${group.color}`}>
                      <Icon className="text-foreground h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold">{group.name}</h3>
                      <p className="text-muted-foreground text-xs">
                        {group.completed}/{group.total} solved
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm font-medium">
                      {Math.round(group.progress)}%
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="text-muted-foreground h-5 w-5" />
                    ) : (
                      <ChevronDown className="text-muted-foreground h-5 w-5" />
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <Progress value={group.progress} className="bg-muted/50 mb-3 h-1.5" />

                {/* Difficulty Distribution (when collapsed) */}
                {!isExpanded && (
                  <div className="flex gap-2">
                    {["easy", "medium", "hard"].map((diff) => {
                      const count = group.scenarios.filter((s) => s.difficulty === diff).length
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
                {isExpanded && (
                  <div className="mt-4 space-y-2" data-problem-list>
                    {group.scenarios
                      .sort((a, b) => {
                        const order = { easy: 0, medium: 1, hard: 2 }
                        return order[a.difficulty] - order[b.difficulty]
                      })
                      .map((scenario) => {
                        const isCompleted = completedProblems.includes(scenario.id)

                        return (
                          <div
                            key={scenario.id}
                            className={`bg-card/50 border-border/50 hover:border-border flex items-center justify-between rounded-lg border p-3 transition-colors ${
                              isCompleted ? "opacity-70" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {isCompleted ? (
                                <div className="rounded-full bg-green-500/20 p-1">
                                  <Check className="h-4 w-4 text-green-400" />
                                </div>
                              ) : (
                                <div className="bg-muted rounded-full p-1">
                                  <Code className="text-muted-foreground h-4 w-4" />
                                </div>
                              )}
                              <div>
                                <p
                                  className={`font-medium ${isCompleted ? "text-muted-foreground" : "text-foreground"}`}
                                >
                                  {scenario.title}
                                </p>
                                <div className="mt-0.5 flex items-center gap-2">
                                  <Badge
                                    className={`${getDifficultyColor(scenario.difficulty)} px-1.5 py-0 text-xs`}
                                  >
                                    {scenario.difficulty}
                                  </Badge>
                                  <span className="text-muted-foreground text-xs">
                                    {scenario.companies.slice(0, 2).join(", ")}
                                  </span>
                                </div>
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
                                  ? "bg-muted hover:bg-muted text-muted-foreground"
                                  : "bg-[#c4703f] text-white hover:bg-[#c4703f]/80"
                              }`}
                            >
                              <Play className="mr-1 h-3 w-3" />
                              {isCompleted ? "Redo" : "Start"}
                            </Button>
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

      {/* Pattern Legend */}
      <div className="bg-card/30 border-border mt-8 rounded-lg border p-4">
        <h4 className="text-muted-foreground mb-3 text-sm font-medium">Pattern Difficulty Guide</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${difficultyColorClass("easy", "dot")}`}></div>
            <span className="text-muted-foreground">Easy - Good for beginners</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${difficultyColorClass("medium", "dot")}`}></div>
            <span className="text-muted-foreground">Medium - Core interview problems</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${difficultyColorClass("hard", "dot")}`}></div>
            <span className="text-muted-foreground">Hard - Advanced challenges</span>
          </div>
        </div>
      </div>
    </div>
  )
})
