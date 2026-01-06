/**
 * useDSARoadmap Hook
 *
 * Manages DSA roadmap state including:
 * - Node statistics calculation
 * - Pattern unlocking logic
 * - Connection path generation
 * - Progress tracking
 */

import { useState, useMemo, useRef } from "react"
import { scenarios, type Scenario, type DSAScenario } from "@/lib/scenarios"
import {
  PATTERN_ROADMAP,
  type DSAPattern,
  isPatternUnlocked,
  getPatternPrerequisites,
} from "@/lib/types/dsa-patterns"

// Type for node stats
export interface NodeStats {
  scenarios: Scenario[]
  completed: number
  total: number
  progress: number
  isComplete: boolean
}

export interface UseDSARoadmapOptions {
  completedProblems?: string[]
}

export interface UseDSARoadmapReturn {
  // UI State
  expandedNode: string | null
  setExpandedNode: (node: string | null) => void
  hoveredNode: string | null
  setHoveredNode: (node: string | null) => void
  containerRef: React.RefObject<HTMLDivElement | null>

  // Computed Data
  nodeStats: Record<string, NodeStats>
  unlockedPatterns: Record<string, boolean>
  connections: Array<{ from: string; to: string; isActive: boolean }>
  totalProblems: number
  totalCompleted: number

  // Helper Functions
  inferPattern: (scenario: Scenario) => DSAPattern | null
  getPatternPrerequisites: typeof getPatternPrerequisites
}

// Infer pattern from scenario
export function inferPattern(scenario: Scenario): DSAPattern | null {
  if (scenario.type !== "dsa") return null
  const dsaScenario = scenario as DSAScenario
  if (dsaScenario.pattern) return dsaScenario.pattern

  const tags = scenario.tags.map((t) => t.toLowerCase())
  const title = scenario.title.toLowerCase()

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
  if (tags.includes("stack") || title.includes("parentheses") || title.includes("stack")) {
    return "stack"
  }
  if (
    tags.includes("binary-search") ||
    title.includes("binary search") ||
    title.includes("rotated")
  ) {
    return "binary-search"
  }
  if (
    tags.includes("linked-list") ||
    title.includes("linked list") ||
    title.includes("lru cache")
  ) {
    return "linked-list"
  }
  if (
    tags.includes("tree") ||
    tags.includes("binary-tree") ||
    title.includes("tree") ||
    title.includes("bst")
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
    title.includes("top k")
  ) {
    return "heap"
  }
  if (
    tags.includes("backtracking") ||
    title.includes("permutation") ||
    title.includes("combination") ||
    title.includes("subsets")
  ) {
    return "backtracking"
  }
  if (
    tags.includes("graph") ||
    tags.includes("bfs") ||
    tags.includes("dfs") ||
    title.includes("island") ||
    title.includes("course schedule")
  ) {
    return "graphs"
  }
  if (
    tags.includes("dynamic-programming") ||
    tags.includes("dp") ||
    title.includes("climbing stairs") ||
    title.includes("coin change") ||
    title.includes("house robber")
  ) {
    return "dp-1d"
  }
  if (tags.includes("greedy") || title.includes("jump game") || title.includes("gas station")) {
    return "greedy"
  }
  if (tags.includes("interval") || title.includes("interval")) {
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

  return "arrays-hashing"
}

export function useDSARoadmap({
  completedProblems = [],
}: UseDSARoadmapOptions = {}): UseDSARoadmapReturn {
  const [expandedNode, setExpandedNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate completion status for each pattern node
  const nodeStats = useMemo((): Record<string, NodeStats> => {
    const dsaScenarios = scenarios.filter((s) => s.type === "dsa")
    const stats: Record<string, NodeStats> = {}

    PATTERN_ROADMAP.forEach((node) => {
      const nodeScenarios = dsaScenarios.filter((s) => {
        const pattern = inferPattern(s)
        return pattern && node.patterns.includes(pattern)
      })

      const completed = nodeScenarios.filter((s) => completedProblems.includes(s.id)).length
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
    const completedPatternIds = PATTERN_ROADMAP.filter(
      (node) => nodeStats[node.id]?.isComplete
    ).map((node) => node.id)

    return PATTERN_ROADMAP.reduce(
      (acc, node) => {
        acc[node.id] = isPatternUnlocked(node.id, completedPatternIds)
        return acc
      },
      {} as Record<string, boolean>
    )
  }, [nodeStats])

  const totalProblems = Object.values(nodeStats).reduce((sum, s) => sum + s.total, 0)
  const totalCompleted = Object.values(nodeStats).reduce((sum, s) => sum + s.completed, 0)

  // Generate SVG paths for connections
  const connections = useMemo(() => {
    const paths: { from: string; to: string; isActive: boolean }[] = []

    PATTERN_ROADMAP.forEach((node) => {
      node.prerequisites.forEach((prereqId) => {
        const isActive = nodeStats[prereqId]?.isComplete || false
        paths.push({ from: prereqId, to: node.id, isActive })
      })
    })

    return paths
  }, [nodeStats])

  return {
    expandedNode,
    setExpandedNode,
    hoveredNode,
    setHoveredNode,
    containerRef,
    nodeStats,
    unlockedPatterns,
    connections,
    totalProblems,
    totalCompleted,
    inferPattern,
    getPatternPrerequisites,
  }
}
