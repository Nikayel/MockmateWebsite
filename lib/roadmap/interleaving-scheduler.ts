/**
 * Interleaving Scheduler
 *
 * Implements research-backed interleaved practice for optimal learning.
 * Key insight: Mixing RELATED patterns improves discrimination and retention.
 *
 * Research: Interleaved practice produces 20-30% better long-term retention
 * than blocked practice, despite feeling harder in the moment.
 */

import { DSAPattern } from "@/lib/types/dsa-patterns"
import { PrioritizedQuestion, DailyPlan } from "@/lib/data/company-questions/types"
import { formatPatternLabel } from "@/lib/pattern-labels"

/**
 * Pattern clusters for effective interleaving
 * Only mix patterns within the same cluster
 */
export const PATTERN_CLUSTERS: Record<string, DSAPattern[]> = {
  // Array manipulation techniques
  "array-manipulation": ["arrays-hashing", "two-pointers", "sliding-window"],

  // Linear data structures
  "linear-structures": ["linked-list", "stack", "monotonic-stack", "monotonic-queue"],

  // Tree traversals and operations
  "tree-operations": ["trees", "binary-search-tree", "dfs", "bfs"],

  // Graph algorithms
  "graph-algorithms": ["graphs", "dfs", "bfs", "union-find", "topological-sort", "dijkstra"],

  // Optimization techniques
  optimization: ["greedy", "binary-search", "dp-1d"],

  // Dynamic programming family
  "dynamic-programming": ["dp-1d", "dp-2d", "dp-knapsack", "dp-lcs", "dp-tree"],

  // Search and backtracking
  "search-backtrack": ["backtracking", "dfs"],

  // String algorithms
  "string-algorithms": ["string", "string-matching", "trie"],

  // Advanced structures
  "advanced-structures": ["heap", "trie", "priority-queue"],

  // Math and bit operations
  "math-bit": ["math-geometry", "bit-manipulation"],
}

/**
 * Get the cluster a pattern belongs to
 */
export function getPatternCluster(pattern: DSAPattern): string | null {
  for (const [cluster, patterns] of Object.entries(PATTERN_CLUSTERS)) {
    if (patterns.includes(pattern)) {
      return cluster
    }
  }
  return null
}

/**
 * Get related patterns (same cluster)
 */
export function getRelatedPatterns(pattern: DSAPattern): DSAPattern[] {
  const cluster = getPatternCluster(pattern)
  if (!cluster) return [pattern]

  return PATTERN_CLUSTERS[cluster] || [pattern]
}

/**
 * Check if two patterns are related (can be interleaved)
 */
export function arePatternsRelated(pattern1: DSAPattern, pattern2: DSAPattern): boolean {
  const cluster1 = getPatternCluster(pattern1)
  const cluster2 = getPatternCluster(pattern2)

  return cluster1 !== null && cluster1 === cluster2
}

/**
 * Interleaving configuration
 */
export interface InterleavingConfig {
  // Use blocking for brand new patterns (first N problems)
  blockingThreshold: number

  // Max patterns to mix in one session
  maxPatternsPerSession: number

  // Review to new problem ratio
  reviewToNewRatio: number

  // Min problems before switching patterns (within interleaving)
  minProblemsBeforeSwitch: number
}

export const DEFAULT_INTERLEAVING_CONFIG: InterleavingConfig = {
  blockingThreshold: 3, // Block first 3 problems of new pattern
  maxPatternsPerSession: 3, // Max 3 related patterns at once
  reviewToNewRatio: 0.7, // 70% review, 30% new
  minProblemsBeforeSwitch: 1, // Can switch after each problem
}

/**
 * Pattern familiarity levels
 */
export type PatternFamiliarity = "unknown" | "seen" | "practiced" | "confident"

/**
 * User's pattern state for scheduling decisions
 */
export interface PatternState {
  pattern: DSAPattern
  familiarity: PatternFamiliarity
  problemsSolved: number
  lastPracticed: Date | null
  averageScore: number
}

/**
 * Determine practice mode for a pattern
 */
export function getPracticeMode(
  patternState: PatternState,
  config: InterleavingConfig = DEFAULT_INTERLEAVING_CONFIG
): "blocked" | "interleaved" {
  // New patterns start with blocking
  if (patternState.familiarity === "unknown") {
    return "blocked"
  }

  // If under blocking threshold, continue blocking
  if (patternState.problemsSolved < config.blockingThreshold) {
    return "blocked"
  }

  // Otherwise, interleave
  return "interleaved"
}

/**
 * Group questions by pattern cluster
 */
export function groupByCluster(
  questions: PrioritizedQuestion[]
): Map<string, PrioritizedQuestion[]> {
  const clusters = new Map<string, PrioritizedQuestion[]>()

  for (const question of questions) {
    const cluster = getPatternCluster(question.pattern) || "other"
    const existing = clusters.get(cluster) || []
    existing.push(question)
    clusters.set(cluster, existing)
  }

  return clusters
}

/**
 * Interleave questions within a cluster
 *
 * Creates a sequence that alternates between patterns
 * while respecting priority scores
 */
export function interleaveCluster(
  questions: PrioritizedQuestion[],
  config: InterleavingConfig = DEFAULT_INTERLEAVING_CONFIG
): PrioritizedQuestion[] {
  if (questions.length <= 1) return questions

  // Group by pattern
  const byPattern = new Map<DSAPattern, PrioritizedQuestion[]>()
  for (const q of questions) {
    const existing = byPattern.get(q.pattern) || []
    existing.push(q)
    byPattern.set(q.pattern, existing)
  }

  // Sort each pattern's questions by priority
  for (const [, qs] of byPattern) {
    qs.sort((a, b) => b.priorityScore - a.priorityScore)
  }

  // Get pattern order by average priority
  const patternPriorities = Array.from(byPattern.entries())
    .map(([pattern, qs]) => ({
      pattern,
      avgPriority: qs.reduce((sum, q) => sum + q.priorityScore, 0) / qs.length,
    }))
    .sort((a, b) => b.avgPriority - a.avgPriority)

  // Limit to max patterns
  const activePatterns = patternPriorities
    .slice(0, config.maxPatternsPerSession)
    .map((p) => p.pattern)

  // Interleave using round-robin with priority weighting
  const result: PrioritizedQuestion[] = []
  const indices = new Map<DSAPattern, number>(activePatterns.map((p) => [p, 0]))

  let patternIndex = 0
  const maxIterations = questions.length * 2 // Prevent infinite loop
  let iterations = 0

  while (result.length < questions.length && iterations < maxIterations) {
    iterations++
    const currentPattern = activePatterns[patternIndex % activePatterns.length]
    const patternQuestions = byPattern.get(currentPattern) || []
    const currentIndex = indices.get(currentPattern) || 0

    if (currentIndex < patternQuestions.length) {
      result.push(patternQuestions[currentIndex])
      indices.set(currentPattern, currentIndex + 1)
    }

    patternIndex++
  }

  // Add remaining questions from excluded patterns
  for (const [pattern, qs] of byPattern) {
    if (!activePatterns.includes(pattern)) {
      for (const q of qs) {
        if (!result.find((r) => r.scenarioId === q.scenarioId)) {
          result.push(q)
        }
      }
    }
  }

  return result
}

/**
 * Build an interleaved daily schedule
 */
export function buildInterleavedSchedule(
  questions: PrioritizedQuestion[],
  patternStates: Map<DSAPattern, PatternState>,
  dailyMinutes: number,
  config: InterleavingConfig = DEFAULT_INTERLEAVING_CONFIG
): DailyPlan {
  const today = new Date()

  // Separate review vs new questions
  const reviewQuestions: PrioritizedQuestion[] = []
  const newQuestions: PrioritizedQuestion[] = []

  for (const q of questions) {
    const state = patternStates.get(q.pattern)
    if (
      state &&
      state.familiarity !== "unknown" &&
      state.problemsSolved >= config.blockingThreshold
    ) {
      reviewQuestions.push(q)
    } else {
      newQuestions.push(q)
    }
  }

  // Calculate target counts based on ratio
  const totalProblems = Math.floor(dailyMinutes / 30) // ~30 min per problem avg
  const targetReview = Math.floor(totalProblems * config.reviewToNewRatio)
  const targetNew = totalProblems - targetReview

  // Select and interleave review questions by cluster
  const selectedReview = selectAndInterleave(
    reviewQuestions,
    targetReview,
    dailyMinutes * config.reviewToNewRatio,
    config
  )

  // For new patterns, use blocking (grouped by pattern)
  const selectedNew = selectBlocked(
    newQuestions,
    targetNew,
    dailyMinutes * (1 - config.reviewToNewRatio)
  )

  // Combine: Start with some review, then new, then more review
  // This provides warm-up and prevents fatigue from all new material
  const warmupCount = Math.min(1, selectedReview.length)
  const warmup = selectedReview.slice(0, warmupCount)
  const remainingReview = selectedReview.slice(warmupCount)

  const combined = [...warmup, ...selectedNew, ...remainingReview]

  // Determine theme
  const patterns = [...new Set(combined.map((q) => q.pattern))]
  const cluster = patterns.length > 0 ? getPatternCluster(patterns[0]) : null
  const theme = getSessionTheme(patterns, cluster)

  return {
    date: today,
    dayNumber: 1, // Will be set by caller
    targetMinutes: combined.reduce((sum, q) => sum + q.estimatedMinutes, 0),
    theme,
    focusPatterns: patterns,
    questions: combined.map((q) => ({
      scenarioId: q.scenarioId,
      title: q.title,
      pattern: q.pattern,
      difficulty: q.difficulty,
      estimatedMinutes: q.estimatedMinutes,
      status: "pending" as const,
    })),
  }
}

/**
 * Select and interleave questions up to time limit
 */
function selectAndInterleave(
  questions: PrioritizedQuestion[],
  maxCount: number,
  maxMinutes: number,
  config: InterleavingConfig
): PrioritizedQuestion[] {
  // Group by cluster
  const clusters = groupByCluster(questions)

  // Get highest priority cluster
  let bestCluster = ""
  let bestPriority = -1

  for (const [cluster, qs] of clusters) {
    const avgPriority = qs.reduce((s, q) => s + q.priorityScore, 0) / qs.length
    if (avgPriority > bestPriority) {
      bestPriority = avgPriority
      bestCluster = cluster
    }
  }

  // Interleave the best cluster
  const clusterQuestions = clusters.get(bestCluster) || []
  const interleaved = interleaveCluster(clusterQuestions, config)

  // Select up to limits
  const selected: PrioritizedQuestion[] = []
  let totalMinutes = 0

  for (const q of interleaved) {
    if (selected.length >= maxCount || totalMinutes + q.estimatedMinutes > maxMinutes) {
      break
    }
    selected.push(q)
    totalMinutes += q.estimatedMinutes
  }

  return selected
}

/**
 * Select questions using blocking (no interleaving)
 */
function selectBlocked(
  questions: PrioritizedQuestion[],
  maxCount: number,
  maxMinutes: number
): PrioritizedQuestion[] {
  // Sort by priority
  const sorted = [...questions].sort((a, b) => b.priorityScore - a.priorityScore)

  // Group consecutive by pattern (keep patterns together)
  const grouped = new Map<DSAPattern, PrioritizedQuestion[]>()
  for (const q of sorted) {
    const existing = grouped.get(q.pattern) || []
    existing.push(q)
    grouped.set(q.pattern, existing)
  }

  // Select pattern groups
  const selected: PrioritizedQuestion[] = []
  let totalMinutes = 0

  for (const [, qs] of grouped) {
    for (const q of qs) {
      if (selected.length >= maxCount || totalMinutes + q.estimatedMinutes > maxMinutes) {
        return selected
      }
      selected.push(q)
      totalMinutes += q.estimatedMinutes
    }
  }

  return selected
}

/**
 * Generate a theme name for the session
 */
function getSessionTheme(patterns: DSAPattern[], cluster: string | null): string {
  if (patterns.length === 0) return "Practice Session"

  if (patterns.length === 1) {
    return `${formatPatternLabel(patterns[0])} Focus`
  }

  if (cluster) {
    const clusterNames: Record<string, string> = {
      "array-manipulation": "Array Techniques",
      "linear-structures": "Linear Data Structures",
      "tree-operations": "Tree Mastery",
      "graph-algorithms": "Graph Exploration",
      optimization: "Optimization Strategies",
      "dynamic-programming": "Dynamic Programming",
      "search-backtrack": "Search & Backtracking",
      "string-algorithms": "String Processing",
      "advanced-structures": "Advanced Structures",
      "math-bit": "Math & Bit Operations",
    }
    return clusterNames[cluster] || "Mixed Practice"
  }

  return "Mixed Practice"
}

/**
 * Calculate interleaving effectiveness score
 *
 * Higher score = better interleaving
 */
export function calculateInterleavingScore(questions: PrioritizedQuestion[]): number {
  if (questions.length <= 1) return 0

  let transitions = 0
  let relatedTransitions = 0

  for (let i = 1; i < questions.length; i++) {
    const prev = questions[i - 1].pattern
    const curr = questions[i].pattern

    if (prev !== curr) {
      transitions++
      if (arePatternsRelated(prev, curr)) {
        relatedTransitions++
      }
    }
  }

  if (transitions === 0) return 0

  // Score based on:
  // 1. Number of transitions (more = better interleaving)
  // 2. Related transitions (related patterns = better learning)
  const transitionScore = Math.min(100, (transitions / questions.length) * 100)
  const relatedScore = (relatedTransitions / transitions) * 100

  return Math.round(transitionScore * 0.4 + relatedScore * 0.6)
}

/**
 * Daily structure recommendations
 */
export interface DailyStructureRecommendation {
  warmupMinutes: number
  coreMinutes: number
  challengeMinutes: number
  reviewMinutes: number
  totalMinutes: number
  structure: "light" | "standard" | "intense"
}

/**
 * Get recommended daily structure based on available time
 */
export function getRecommendedStructure(
  availableMinutes: number,
  daysRemaining: number,
  experienceLevel: "intern" | "beginner" | "intermediate" | "advanced"
): DailyStructureRecommendation {
  // Time urgency factor
  const urgencyFactor = daysRemaining <= 7 ? 1.2 : daysRemaining <= 14 ? 1.1 : 1.0

  // Experience adjustment
  const expFactor = {
    intern: 0.8, // Shorter, more focused
    beginner: 0.9,
    intermediate: 1.0,
    advanced: 1.1, // Can handle more
  }[experienceLevel]

  const adjustedMinutes = Math.round(availableMinutes * expFactor * urgencyFactor)

  if (adjustedMinutes < 60) {
    return {
      warmupMinutes: 10,
      coreMinutes: adjustedMinutes - 15,
      challengeMinutes: 0,
      reviewMinutes: 5,
      totalMinutes: adjustedMinutes,
      structure: "light",
    }
  }

  if (adjustedMinutes < 120) {
    return {
      warmupMinutes: 15,
      coreMinutes: Math.round(adjustedMinutes * 0.6),
      challengeMinutes: Math.round(adjustedMinutes * 0.15),
      reviewMinutes: 15,
      totalMinutes: adjustedMinutes,
      structure: "standard",
    }
  }

  return {
    warmupMinutes: 15,
    coreMinutes: Math.round(adjustedMinutes * 0.55),
    challengeMinutes: Math.round(adjustedMinutes * 0.2),
    reviewMinutes: 20,
    totalMinutes: adjustedMinutes,
    structure: "intense",
  }
}
