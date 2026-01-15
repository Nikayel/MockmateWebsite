/**
 * Enhanced User Profile System
 *
 * Comprehensive user profiling like top tech companies (Netflix, Spotify, Duolingo).
 * Tracks cognitive patterns, behavioral signals, and builds a knowledge graph.
 *
 * Features:
 * - Cognitive Profile: Learning style, problem-solving approach, pattern recognition
 * - Behavioral Profile: Motivation patterns, engagement signals, fatigue detection
 * - Knowledge Graph: Concept mastery, prerequisite gaps, misconceptions
 * - Temporal Profile: Skill decay, retention curves, growth predictions
 */

import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type { CompanyId } from "@/lib/data/company-questions/types"
import { adminDb } from "@/lib/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"
import {
  getUserPerformanceRAG,
  type UserPerformanceProfile,
  type SessionAnalysis,
} from "./user-performance-rag"
// NEW: Import production-grade behavioral analysis
import {
  generateAccurateBehavioralProfile,
  assessDataQuality,
  type AccurateBehavioralProfile,
} from "./behavioral-analysis"

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Cognitive profile - how the user thinks and learns
 */
export interface CognitiveProfile {
  // Learning style indicators
  learningStyle: {
    primary: "visual" | "textual" | "example-based" | "exploratory"
    secondary: "visual" | "textual" | "example-based" | "exploratory" | null
    confidence: number // 0-100
  }

  // Problem-solving approach
  problemSolvingApproach: {
    style: "top-down" | "bottom-up" | "mixed"
    planningTendency: "planner" | "improviser" | "balanced" // Do they plan before coding?
    debuggingStyle: "systematic" | "intuitive" | "print-based"
  }

  // Pattern recognition ability
  patternRecognition: {
    speed: "slow" | "moderate" | "fast"
    accuracy: number // 0-100
    transferAbility: number // Can apply patterns to new contexts (0-100)
  }

  // Working memory indicators
  workingMemory: {
    complexityTolerance: "low" | "medium" | "high" // Handles complex problems?
    contextSwitchingCost: "low" | "medium" | "high" // How much perf drops when switching
  }
}

/**
 * Behavioral profile - motivation and engagement patterns
 */
export interface BehavioralProfile {
  // Motivation patterns
  motivation: {
    type: "streak-driven" | "goal-driven" | "mastery-driven" | "social-driven"
    consistency: number // 0-100, how regular is practice
    peakMotivationDay: "weekday" | "weekend" | "any"
  }

  // Engagement signals
  engagement: {
    averageSessionLength: number // minutes
    sessionsPerWeek: number
    completionRate: number // % of started sessions completed
    hintUsageRate: number // % of sessions where hints used
  }

  // Challenge preference
  challengePreference: {
    optimalDifficulty: "easy" | "medium" | "hard" | "adaptive"
    riskTolerance: "low" | "medium" | "high" // Tries hard problems?
    frustrationThreshold: number // Minutes before giving up (0 = never gives up)
  }

  // Fatigue/burnout signals
  fatigue: {
    currentLevel: "none" | "mild" | "moderate" | "high"
    burnoutRisk: number // 0-100
    recommendedBreak: boolean
    lastBreakDays: number
  }
}

/**
 * Knowledge graph - concept mastery and gaps
 */
export interface KnowledgeGraph {
  // Concept mastery (more granular than pattern proficiency)
  concepts: ConceptMastery[]

  // Prerequisite gaps
  gaps: PrerequisiteGap[]

  // Detected misconceptions
  misconceptions: DetectedMisconception[]

  // Learning connections
  connections: {
    strongConnections: string[] // Concepts user connects well
    weakConnections: string[] // Concepts user fails to connect
  }
}

export interface ConceptMastery {
  concept: string
  parentPattern: DSAPattern
  masteryLevel: number // 0-100
  lastPracticed: Date | null
  practiceCount: number
  decayRate: number // How fast skill decays (0-1, higher = faster decay)
  predictedMastery: number // Predicted current mastery accounting for decay
}

export interface PrerequisiteGap {
  pattern: DSAPattern
  missingPrerequisites: {
    concept: string
    importance: "critical" | "important" | "helpful"
    suggestedResource?: string
  }[]
  impact: "blocking" | "slowing" | "minor"
}

export interface DetectedMisconception {
  id: string
  pattern: DSAPattern
  concept: string
  misconceptionType: MisconceptionType
  description: string
  frequency: number // How often this error occurs
  lastSeen: Date
  status: "active" | "resolving" | "resolved"
  suggestedFix: string
}

export type MisconceptionType =
  | "off-by-one"
  | "wrong-data-structure"
  | "incorrect-complexity"
  | "missing-edge-case"
  | "wrong-algorithm"
  | "syntax-confusion"
  | "logic-error"
  | "boundary-confusion"
  | "initialization-error"
  | "termination-condition"

/**
 * Temporal profile - skill changes over time
 */
export interface TemporalProfile {
  // Skill decay tracking
  skillDecay: {
    pattern: DSAPattern
    daysSincePractice: number
    estimatedDecay: number // % of skill lost
    urgency: "none" | "low" | "medium" | "high"
  }[]

  // Retention analysis
  retention: {
    shortTermRetention: number // 0-100, remembers after 1 day
    mediumTermRetention: number // 0-100, remembers after 1 week
    longTermRetention: number // 0-100, remembers after 1 month
  }

  // Growth trajectory
  growth: {
    currentVelocity: number // Score improvement per week
    projectedLevel: "beginner" | "intermediate" | "advanced" | "expert"
    projectedTimeToGoal: number | null // Days to reach target
    accelerating: boolean
  }

  // Optimal review schedule
  reviewSchedule: {
    pattern: DSAPattern
    nextReviewDate: Date
    intervalDays: number
    priority: "critical" | "high" | "medium" | "low"
  }[]
}

/**
 * Complete Enhanced User Profile
 */
export interface EnhancedUserProfile {
  userId: string
  version: number
  lastUpdated: Date

  // Core profiles
  cognitive: CognitiveProfile
  behavioral: BehavioralProfile
  knowledgeGraph: KnowledgeGraph
  temporal: TemporalProfile

  // Quick access insights
  insights: UserInsight[]

  // Interview readiness
  interviewReadiness: {
    overall: number // 0-100
    byCompany: { company: CompanyId; readiness: number }[]
    strongestAreas: DSAPattern[]
    criticalGaps: string[]
    estimatedPrepDays: number
  }
}

export interface UserInsight {
  id: string
  type: "strength" | "weakness" | "opportunity" | "risk" | "milestone"
  icon: string // Emoji for UI
  title: string
  description: string
  actionable: boolean
  action?: string
  priority: "high" | "medium" | "low"
  createdAt: Date
}

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyze cognitive profile from session data
 */
function analyzeCognitiveProfile(sessions: SessionAnalysis[]): CognitiveProfile {
  if (sessions.length < 3) {
    return getDefaultCognitiveProfile()
  }

  // Analyze learning style based on hint usage and code patterns
  const hintHeavySessions = sessions.filter((s) => s.hintsUsed > 2).length
  const quickSolves = sessions.filter((s) => s.duration < 900 && s.score > 70).length // < 15 min
  const exploratorySignals = sessions.filter((s) => s.testsRun > 5).length

  let primaryStyle: CognitiveProfile["learningStyle"]["primary"] = "textual"
  if (hintHeavySessions / sessions.length > 0.5) {
    primaryStyle = "example-based"
  } else if (exploratorySignals / sessions.length > 0.4) {
    primaryStyle = "exploratory"
  } else if (quickSolves / sessions.length > 0.3) {
    primaryStyle = "visual" // Quick pattern recognition suggests visual
  }

  // Analyze problem-solving approach
  const avgTestsBeforePass =
    sessions.filter((s) => s.score > 70).reduce((sum, s) => sum + s.testsRun, 0) /
    Math.max(sessions.filter((s) => s.score > 70).length, 1)

  const planningTendency =
    avgTestsBeforePass < 3 ? "planner" : avgTestsBeforePass > 7 ? "improviser" : "balanced"

  // Analyze pattern recognition
  const patternScores = new Map<DSAPattern, number[]>()
  for (const s of sessions) {
    const scores = patternScores.get(s.pattern) || []
    scores.push(s.score)
    patternScores.set(s.pattern, scores)
  }

  let transferAbility = 50
  const patternsWithMultipleSessions = Array.from(patternScores.entries()).filter(
    ([, scores]) => scores.length >= 2
  )

  if (patternsWithMultipleSessions.length >= 2) {
    // Check if improvement in one pattern correlates with improvement in related patterns
    const improvements = patternsWithMultipleSessions.map(([, scores]) => {
      const sorted = [...scores]
      return sorted[sorted.length - 1] - sorted[0]
    })
    const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length
    transferAbility = Math.min(100, Math.max(0, 50 + avgImprovement))
  }

  // Complexity tolerance
  const hardProblemSuccess = sessions
    .filter((s) => s.difficulty === "hard")
    .filter((s) => s.score > 60).length
  const hardProblemAttempts = sessions.filter((s) => s.difficulty === "hard").length

  const complexityTolerance =
    hardProblemAttempts === 0
      ? "medium"
      : hardProblemSuccess / hardProblemAttempts > 0.5
        ? "high"
        : hardProblemSuccess / hardProblemAttempts > 0.2
          ? "medium"
          : "low"

  return {
    learningStyle: {
      primary: primaryStyle,
      secondary: primaryStyle === "textual" ? "example-based" : "textual",
      confidence: Math.min(100, sessions.length * 5),
    },
    problemSolvingApproach: {
      style:
        planningTendency === "planner"
          ? "top-down"
          : planningTendency === "improviser"
            ? "bottom-up"
            : "mixed",
      planningTendency,
      debuggingStyle: avgTestsBeforePass > 5 ? "print-based" : "systematic",
    },
    patternRecognition: {
      speed:
        quickSolves / sessions.length > 0.4
          ? "fast"
          : quickSolves / sessions.length > 0.2
            ? "moderate"
            : "slow",
      accuracy: sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length,
      transferAbility,
    },
    workingMemory: {
      complexityTolerance,
      contextSwitchingCost: "medium", // Would need more data to determine
    },
  }
}

/**
 * Analyze behavioral profile from session data
 */
function analyzeBehavioralProfile(sessions: SessionAnalysis[]): BehavioralProfile {
  if (sessions.length < 3) {
    return getDefaultBehavioralProfile()
  }

  // Session timing analysis
  const sessionsByDay = new Map<number, number>()
  const sessionsByWeek = new Map<number, number>()

  for (const s of sessions) {
    const day = s.timestamp.getDay()
    const week = Math.floor(s.timestamp.getTime() / (7 * 24 * 60 * 60 * 1000))
    sessionsByDay.set(day, (sessionsByDay.get(day) || 0) + 1)
    sessionsByWeek.set(week, (sessionsByWeek.get(week) || 0) + 1)
  }

  // Peak motivation day
  const weekendSessions = (sessionsByDay.get(0) || 0) + (sessionsByDay.get(6) || 0)
  const weekdaySessions = sessions.length - weekendSessions
  const peakMotivationDay =
    weekendSessions > weekdaySessions * 0.4
      ? "weekend"
      : weekdaySessions > weekendSessions * 2
        ? "weekday"
        : "any"

  // Consistency calculation
  const weeksActive = sessionsByWeek.size
  const totalWeeks = Math.max(
    1,
    Math.ceil(
      (Date.now() - Math.min(...sessions.map((s) => s.timestamp.getTime()))) /
        (7 * 24 * 60 * 60 * 1000)
    )
  )
  const consistency = Math.min(100, (weeksActive / totalWeeks) * 100)

  // Average session metrics
  const avgSessionLength = sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length / 60
  const completedSessions = sessions.filter((s) => s.score > 0).length
  const completionRate = (completedSessions / sessions.length) * 100
  const hintUsageRate = (sessions.filter((s) => s.hintsUsed > 0).length / sessions.length) * 100

  // Challenge preference
  const difficultyAttempts = {
    easy: sessions.filter((s) => s.difficulty === "easy").length,
    medium: sessions.filter((s) => s.difficulty === "medium").length,
    hard: sessions.filter((s) => s.difficulty === "hard").length,
  }
  const totalAttempts = sessions.length
  const hardRatio = difficultyAttempts.hard / totalAttempts

  // Fatigue detection
  const recentSessions = sessions.slice(0, 10)
  const recentAvgScore = recentSessions.reduce((sum, s) => sum + s.score, 0) / recentSessions.length
  const olderSessions = sessions.slice(10, 20)
  const olderAvgScore =
    olderSessions.length > 0
      ? olderSessions.reduce((sum, s) => sum + s.score, 0) / olderSessions.length
      : recentAvgScore

  const performanceDrop = olderAvgScore - recentAvgScore
  const fatigueLevel =
    performanceDrop > 20
      ? "high"
      : performanceDrop > 10
        ? "moderate"
        : performanceDrop > 5
          ? "mild"
          : "none"

  // Days since last session
  const lastSessionDate = sessions[0]?.timestamp || new Date()
  const daysSinceLastSession = Math.floor(
    (Date.now() - lastSessionDate.getTime()) / (24 * 60 * 60 * 1000)
  )

  return {
    motivation: {
      type: consistency > 70 ? "streak-driven" : hardRatio > 0.3 ? "mastery-driven" : "goal-driven",
      consistency,
      peakMotivationDay,
    },
    engagement: {
      averageSessionLength: avgSessionLength,
      sessionsPerWeek: sessions.length / Math.max(1, totalWeeks),
      completionRate,
      hintUsageRate,
    },
    challengePreference: {
      optimalDifficulty:
        difficultyAttempts.hard > difficultyAttempts.easy
          ? "hard"
          : difficultyAttempts.medium > difficultyAttempts.easy
            ? "medium"
            : "adaptive",
      riskTolerance: hardRatio > 0.3 ? "high" : hardRatio > 0.1 ? "medium" : "low",
      frustrationThreshold: avgSessionLength * 2, // Estimate based on avg session
    },
    fatigue: {
      currentLevel: fatigueLevel,
      burnoutRisk: fatigueLevel === "high" ? 80 : fatigueLevel === "moderate" ? 50 : 20,
      recommendedBreak:
        fatigueLevel === "high" || (daysSinceLastSession === 0 && sessions.length > 3),
      lastBreakDays: daysSinceLastSession,
    },
  }
}

/**
 * Build knowledge graph from session data
 */
function buildKnowledgeGraph(
  sessions: SessionAnalysis[],
  existingMisconceptions: DetectedMisconception[] = []
): KnowledgeGraph {
  const concepts: ConceptMastery[] = []
  const gaps: PrerequisiteGap[] = []

  // Pattern to concepts mapping
  const patternConcepts: Record<string, string[]> = {
    "arrays-hashing": ["hash-maps", "two-pointers", "frequency-counting", "prefix-sum"],
    "two-pointers": ["pointer-manipulation", "sliding-window-basics", "sorted-array-tricks"],
    "sliding-window": ["window-expansion", "window-contraction", "window-state"],
    stack: ["lifo-principle", "monotonic-stack", "expression-parsing"],
    "binary-search": ["search-space", "mid-calculation", "boundary-conditions"],
    "linked-list": ["pointer-manipulation", "fast-slow-pointers", "reversal"],
    trees: ["tree-traversal", "recursion", "bfs-dfs"],
    heap: ["heap-property", "priority-queue", "k-elements"],
    backtracking: ["state-space-tree", "pruning", "constraint-satisfaction"],
    graphs: ["graph-representation", "bfs", "dfs", "shortest-path"],
    "dp-1d": ["overlapping-subproblems", "optimal-substructure", "memoization"],
    "dp-2d": ["state-transitions", "grid-dp", "string-dp"],
    greedy: ["local-optimum", "proof-of-correctness", "sorting-strategy"],
    intervals: ["interval-sorting", "merge-intervals", "sweep-line"],
    "bit-manipulation": ["bitwise-operators", "bit-masking", "xor-tricks"],
    trie: ["prefix-tree", "string-matching", "autocomplete"],
    "union-find": ["disjoint-sets", "path-compression", "union-by-rank"],
  }

  // Analyze concept mastery - only for patterns the user has actually practiced
  const patternSessions = new Map<DSAPattern, SessionAnalysis[]>()
  const practicedPatterns = new Set<DSAPattern>()

  for (const s of sessions) {
    const existing = patternSessions.get(s.pattern) || []
    existing.push(s)
    patternSessions.set(s.pattern, existing)
    practicedPatterns.add(s.pattern)
  }

  for (const [pattern, patternSessionList] of patternSessions) {
    const conceptList = patternConcepts[pattern] || [pattern]
    const avgScore =
      patternSessionList.reduce((sum, s) => sum + s.score, 0) / patternSessionList.length
    const lastPracticed = patternSessionList[0]?.timestamp || null
    const daysSincePractice = lastPracticed
      ? (Date.now() - lastPracticed.getTime()) / (24 * 60 * 60 * 1000)
      : 999

    for (const concept of conceptList) {
      // Calculate decay (skills decay ~10% per week without practice)
      const decayRate = 0.1
      const weeksSincePractice = daysSincePractice / 7
      const decay = Math.min(0.5, decayRate * weeksSincePractice) // Max 50% decay

      concepts.push({
        concept,
        parentPattern: pattern,
        masteryLevel: avgScore,
        lastPracticed,
        practiceCount: patternSessionList.length,
        decayRate,
        predictedMastery: Math.max(0, avgScore * (1 - decay)),
      })
    }
  }

  // Detect prerequisite gaps - ONLY for patterns the user has actually attempted
  // Don't show gaps for patterns they haven't tried yet
  const patternPrerequisites: Record<string, DSAPattern[]> = {
    "dp-1d": ["arrays-hashing", "recursion" as DSAPattern],
    "dp-2d": ["dp-1d"],
    graphs: ["trees", "stack"],
    backtracking: ["trees", "recursion" as DSAPattern],
    heap: ["arrays-hashing", "trees"],
    trie: ["trees", "strings" as DSAPattern],
  }

  for (const [pattern, prereqs] of Object.entries(patternPrerequisites)) {
    // CRITICAL FIX: Only check prerequisites for patterns the user has actually practiced
    // This prevents showing "dp-1d prerequisite gap" to users who haven't even tried dp-1d
    if (!practicedPatterns.has(pattern as DSAPattern)) {
      continue
    }

    const patternMastery = concepts.find((c) => c.parentPattern === pattern)?.predictedMastery || 0

    // Only flag as a gap if they're struggling with the pattern (score < 60)
    if (patternMastery < 60) {
      const missingPrereqs = prereqs.filter((prereq) => {
        // Check if they've practiced the prerequisite
        const prereqConcept = concepts.find((c) => c.parentPattern === prereq)
        // If they haven't practiced prereq OR their prereq mastery is low
        const prereqMastery = prereqConcept?.predictedMastery || 0
        // Only flag if prereq wasn't practiced or has low score
        return !practicedPatterns.has(prereq) || prereqMastery < 70
      })

      if (missingPrereqs.length > 0) {
        gaps.push({
          pattern: pattern as DSAPattern,
          missingPrerequisites: missingPrereqs.map((prereq) => ({
            concept: prereq,
            importance: practicedPatterns.has(prereq)
              ? ("important" as const)
              : ("critical" as const),
          })),
          impact: missingPrereqs.length > 1 ? "blocking" : "slowing",
        })
      }
    }
  }

  return {
    concepts,
    gaps,
    misconceptions: existingMisconceptions,
    connections: {
      strongConnections: concepts.filter((c) => c.predictedMastery > 70).map((c) => c.concept),
      weakConnections: concepts.filter((c) => c.predictedMastery < 40).map((c) => c.concept),
    },
  }
}

/**
 * Build temporal profile with decay and scheduling
 */
function buildTemporalProfile(
  sessions: SessionAnalysis[],
  knowledgeGraph: KnowledgeGraph
): TemporalProfile {
  // Skill decay analysis
  const skillDecay: TemporalProfile["skillDecay"] = []
  const patternLastPracticed = new Map<DSAPattern, Date>()

  for (const s of sessions) {
    if (
      !patternLastPracticed.has(s.pattern) ||
      s.timestamp > patternLastPracticed.get(s.pattern)!
    ) {
      patternLastPracticed.set(s.pattern, s.timestamp)
    }
  }

  for (const [pattern, lastDate] of patternLastPracticed) {
    const daysSince = (Date.now() - lastDate.getTime()) / (24 * 60 * 60 * 1000)
    const decay = Math.min(50, daysSince * 1.5) // ~1.5% decay per day, max 50%

    skillDecay.push({
      pattern,
      daysSincePractice: Math.floor(daysSince),
      estimatedDecay: decay,
      urgency: decay > 30 ? "high" : decay > 20 ? "medium" : decay > 10 ? "low" : "none",
    })
  }

  // Retention analysis
  const retentionScores = sessions
    .filter((s) => s.score > 60)
    .map((s) => {
      // Check if there's a follow-up session on the same pattern
      const followUp = sessions.find(
        (fs) =>
          fs.pattern === s.pattern &&
          fs.timestamp > s.timestamp &&
          fs.timestamp.getTime() - s.timestamp.getTime() > 24 * 60 * 60 * 1000
      )
      return followUp ? followUp.score : null
    })
    .filter((s): s is number => s !== null)

  const avgRetention =
    retentionScores.length > 0
      ? retentionScores.reduce((a, b) => a + b, 0) / retentionScores.length
      : 70

  // Growth trajectory
  const recentScores = sessions.slice(0, 10).map((s) => s.score)
  const olderScores = sessions.slice(10, 20).map((s) => s.score)
  const recentAvg =
    recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : 0
  const olderAvg =
    olderScores.length > 0 ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length : recentAvg

  const velocity = (recentAvg - olderAvg) / Math.max(1, sessions.length / 10) // Per week estimate

  // Review schedule based on spaced repetition
  const reviewSchedule: TemporalProfile["reviewSchedule"] = skillDecay
    .filter((sd) => sd.urgency !== "none")
    .map((sd) => {
      const baseDays = sd.urgency === "high" ? 1 : sd.urgency === "medium" ? 3 : 7
      return {
        pattern: sd.pattern,
        nextReviewDate: new Date(Date.now() + baseDays * 24 * 60 * 60 * 1000),
        intervalDays: baseDays,
        priority:
          sd.urgency === "high"
            ? ("critical" as const)
            : sd.urgency === "medium"
              ? ("high" as const)
              : ("medium" as const),
      }
    })
    .sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime())

  return {
    skillDecay: skillDecay.sort((a, b) => b.estimatedDecay - a.estimatedDecay),
    retention: {
      shortTermRetention: avgRetention,
      mediumTermRetention: avgRetention * 0.85,
      longTermRetention: avgRetention * 0.7,
    },
    growth: {
      currentVelocity: velocity,
      projectedLevel: recentAvg > 80 ? "advanced" : recentAvg > 60 ? "intermediate" : "beginner",
      projectedTimeToGoal: velocity > 0 ? Math.ceil((80 - recentAvg) / velocity) * 7 : null,
      accelerating: velocity > 2,
    },
    reviewSchedule,
  }
}

/**
 * Generate user insights from profiles
 */
function generateInsights(
  cognitive: CognitiveProfile,
  behavioral: BehavioralProfile,
  knowledgeGraph: KnowledgeGraph,
  temporal: TemporalProfile
): UserInsight[] {
  const insights: UserInsight[] = []
  const now = new Date()

  // Strength insights
  if (cognitive.patternRecognition.speed === "fast") {
    insights.push({
      id: "insight-fast-pattern",
      type: "strength",
      icon: "⚡",
      title: "Quick Pattern Recognition",
      description: "You identify patterns faster than average. Use this to tackle harder problems.",
      actionable: true,
      action: "Try more hard-level problems",
      priority: "medium",
      createdAt: now,
    })
  }

  // Weakness insights
  if (knowledgeGraph.gaps.length > 0) {
    const criticalGap = knowledgeGraph.gaps[0]
    insights.push({
      id: "insight-prereq-gap",
      type: "weakness",
      icon: "🔧",
      title: `Prerequisite Gap: ${criticalGap.pattern}`,
      description: `You're missing foundations in ${criticalGap.missingPrerequisites.map((p) => p.concept).join(", ")}`,
      actionable: true,
      action: `Practice ${criticalGap.missingPrerequisites[0].concept} first`,
      priority: "high",
      createdAt: now,
    })
  }

  // Fatigue warning
  if (behavioral.fatigue.currentLevel === "high") {
    insights.push({
      id: "insight-fatigue",
      type: "risk",
      icon: "😴",
      title: "Fatigue Detected",
      description: "Your recent performance is dropping. Consider taking a break.",
      actionable: true,
      action: "Take a 1-2 day break",
      priority: "high",
      createdAt: now,
    })
  }

  // Decay warning
  const urgentDecay = temporal.skillDecay.find((sd) => sd.urgency === "high")
  if (urgentDecay) {
    insights.push({
      id: "insight-decay",
      type: "risk",
      icon: "📉",
      title: `Skill Decay: ${urgentDecay.pattern}`,
      description: `You haven't practiced ${urgentDecay.pattern} in ${urgentDecay.daysSincePractice} days. Skills are fading.`,
      actionable: true,
      action: `Review ${urgentDecay.pattern} today`,
      priority: "high",
      createdAt: now,
    })
  }

  // Opportunity insights
  if (temporal.growth.accelerating) {
    insights.push({
      id: "insight-growth",
      type: "milestone",
      icon: "🚀",
      title: "Accelerating Growth",
      description: "Your improvement rate is increasing. Keep up the momentum!",
      actionable: false,
      priority: "low",
      createdAt: now,
    })
  }

  // Consistency milestone
  if (behavioral.motivation.consistency > 80) {
    insights.push({
      id: "insight-consistency",
      type: "milestone",
      icon: "🔥",
      title: "Consistency Champion",
      description: `${Math.round(behavioral.motivation.consistency)}% weekly consistency. You're building strong habits.`,
      actionable: false,
      priority: "low",
      createdAt: now,
    })
  }

  // Misconception alert
  const activeMisconception = knowledgeGraph.misconceptions.find((m) => m.status === "active")
  if (activeMisconception) {
    insights.push({
      id: "insight-misconception",
      type: "weakness",
      icon: "⚠️",
      title: `Common Mistake: ${activeMisconception.misconceptionType}`,
      description: activeMisconception.description,
      actionable: true,
      action: activeMisconception.suggestedFix,
      priority: "high",
      createdAt: now,
    })
  }

  return insights.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

/**
 * Calculate interview readiness
 */
function calculateInterviewReadiness(
  knowledgeGraph: KnowledgeGraph,
  temporal: TemporalProfile,
  behavioral: BehavioralProfile
): EnhancedUserProfile["interviewReadiness"] {
  // Overall readiness based on concept mastery
  const avgMastery =
    knowledgeGraph.concepts.length > 0
      ? knowledgeGraph.concepts.reduce((sum, c) => sum + c.predictedMastery, 0) /
        knowledgeGraph.concepts.length
      : 0

  // Penalty for gaps and misconceptions
  const gapPenalty = knowledgeGraph.gaps.length * 5
  const misconceptionPenalty =
    knowledgeGraph.misconceptions.filter((m) => m.status === "active").length * 3

  const overall = Math.max(0, Math.min(100, avgMastery - gapPenalty - misconceptionPenalty))

  // Strongest areas - sort by mastery and take top 5 patterns
  // First, get unique patterns with their highest concept mastery
  const patternMasteryMap = new Map<DSAPattern, number>()
  for (const concept of knowledgeGraph.concepts) {
    const current = patternMasteryMap.get(concept.parentPattern) || 0
    patternMasteryMap.set(concept.parentPattern, Math.max(current, concept.predictedMastery))
  }

  // Sort by mastery (descending) and take top 5
  const strongestAreas = [...patternMasteryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pattern]) => pattern)

  // Critical gaps
  const criticalGaps = knowledgeGraph.gaps
    .filter((g) => g.impact === "blocking")
    .flatMap((g) => g.missingPrerequisites.map((p) => p.concept))

  // Estimated prep days based on velocity
  const targetReadiness = 80
  const velocity = temporal.growth.currentVelocity
  const estimatedPrepDays =
    velocity > 0 ? Math.ceil((targetReadiness - overall) / velocity) * 7 : 90

  return {
    overall: Math.round(overall),
    byCompany: [], // Would need company-specific weighting
    strongestAreas,
    criticalGaps,
    estimatedPrepDays,
  }
}

// ============================================================================
// DEFAULT PROFILES
// ============================================================================

function getDefaultCognitiveProfile(): CognitiveProfile {
  return {
    learningStyle: { primary: "textual", secondary: null, confidence: 0 },
    problemSolvingApproach: {
      style: "mixed",
      planningTendency: "balanced",
      debuggingStyle: "systematic",
    },
    patternRecognition: { speed: "moderate", accuracy: 50, transferAbility: 50 },
    workingMemory: { complexityTolerance: "medium", contextSwitchingCost: "medium" },
  }
}

function getDefaultBehavioralProfile(): BehavioralProfile {
  return {
    motivation: { type: "goal-driven", consistency: 0, peakMotivationDay: "any" },
    engagement: {
      averageSessionLength: 0,
      sessionsPerWeek: 0,
      completionRate: 0,
      hintUsageRate: 0,
    },
    challengePreference: {
      optimalDifficulty: "adaptive",
      riskTolerance: "medium",
      frustrationThreshold: 45,
    },
    fatigue: { currentLevel: "none", burnoutRisk: 0, recommendedBreak: false, lastBreakDays: 0 },
  }
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class EnhancedProfileService {
  private cache = new Map<string, { profile: EnhancedUserProfile; timestamp: number }>()
  private CACHE_TTL = 30 * 60 * 1000 // 30 minutes

  /**
   * Get or build enhanced user profile
   */
  async getEnhancedProfile(userId: string): Promise<EnhancedUserProfile> {
    // Check cache
    const cached = this.cache.get(userId)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.profile
    }

    // Try to load from Firestore
    try {
      const profileDoc = await adminDb.collection("enhanced_user_profiles").doc(userId).get()

      if (profileDoc.exists) {
        const data = profileDoc.data()!
        const lastUpdated = (data.lastUpdated as Timestamp).toDate()

        // If updated within last hour, use cached
        if (Date.now() - lastUpdated.getTime() < 60 * 60 * 1000) {
          const profile = this.deserializeProfile(data, userId)
          this.cache.set(userId, { profile, timestamp: Date.now() })
          return profile
        }
      }
    } catch (error) {
      console.error("[EnhancedProfile] Error loading profile:", error)
    }

    // Build fresh profile
    return await this.buildEnhancedProfile(userId)
  }

  /**
   * Build enhanced profile from session data
   */
  async buildEnhancedProfile(userId: string): Promise<EnhancedUserProfile> {
    try {
      // Get base performance data
      const performanceRAG = getUserPerformanceRAG()
      const baseProfile = await performanceRAG.getPerformanceProfile(userId)

      // Get raw session data for deeper analysis from session_summaries subcollection
      const sessionsSnapshot = await adminDb
        .collection("users")
        .doc(userId)
        .collection("session_summaries")
        .orderBy("completedAt", "desc")
        .limit(100)
        .get()

      const sessions = sessionsSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((s: Record<string, unknown>) => s.performanceScore !== undefined)
        .map((s: Record<string, unknown>) => this.sessionToAnalysis(s))

      // Load existing misconceptions
      const misconceptionsSnapshot = await adminDb
        .collection("user_misconceptions")
        .where("userId", "==", userId)
        .where("status", "==", "active")
        .get()

      const existingMisconceptions = misconceptionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        lastSeen: (doc.data().lastSeen as Timestamp).toDate(),
      })) as DetectedMisconception[]

      // Build all profile components
      const cognitive = analyzeCognitiveProfile(sessions)
      const behavioral = analyzeBehavioralProfile(sessions)
      const knowledgeGraph = buildKnowledgeGraph(sessions, existingMisconceptions)
      const temporal = buildTemporalProfile(sessions, knowledgeGraph)
      const insights = generateInsights(cognitive, behavioral, knowledgeGraph, temporal)
      const interviewReadiness = calculateInterviewReadiness(knowledgeGraph, temporal, behavioral)

      const enhancedProfile: EnhancedUserProfile = {
        userId,
        version: 1,
        lastUpdated: new Date(),
        cognitive,
        behavioral,
        knowledgeGraph,
        temporal,
        insights,
        interviewReadiness,
      }

      // Save to Firestore
      await this.saveProfile(enhancedProfile)

      // Update cache
      this.cache.set(userId, { profile: enhancedProfile, timestamp: Date.now() })

      return enhancedProfile
    } catch (error) {
      console.error("[EnhancedProfile] Error building profile:", error)
      return this.createEmptyProfile(userId)
    }
  }

  /**
   * Get quick insights without full profile build
   */
  async getQuickInsights(userId: string): Promise<UserInsight[]> {
    const profile = await this.getEnhancedProfile(userId)
    return profile.insights
  }

  /**
   * Get interview readiness score
   */
  async getInterviewReadiness(userId: string): Promise<EnhancedUserProfile["interviewReadiness"]> {
    const profile = await this.getEnhancedProfile(userId)
    return profile.interviewReadiness
  }

  /**
   * Convert session summary doc to analysis
   * Maps session_summaries subcollection format to SessionAnalysis
   */
  private sessionToAnalysis(session: Record<string, unknown>): SessionAnalysis {
    const scoreBreakdown = session.scoreBreakdown as Record<string, unknown> | undefined
    const interactionMetrics = session.interactionMetrics as Record<string, unknown> | undefined

    const performanceScore =
      (session.performanceScore as number) || (scoreBreakdown?.overallScore as number) || 0
    const masteryScore = (session.masteryScore as number) || performanceScore // Fallback to performanceScore if masteryScore not available

    return {
      sessionId: (session.sessionId as string) || (session.id as string),
      userId: session.userId as string,
      scenarioId: session.scenarioId as string,
      pattern: (session.pattern || "arrays-hashing") as DSAPattern,
      difficulty: (session.difficulty || "medium") as "easy" | "medium" | "hard",
      score: masteryScore, // MASTERY score for technical analysis
      performanceScore: performanceScore, // PERFORMANCE score for interview readiness
      duration: ((session.durationMinutes as number) || 0) * 60, // Convert to seconds
      hintsUsed: (interactionMetrics?.hintsUsed as number) || 0,
      testsRun: (interactionMetrics?.codeExecutions as number) || 0,
      testsPassed: (interactionMetrics?.testsPassed as number) || 0,
      codeQuality: (scoreBreakdown?.codeQualityScore as number) || 50,
      timestamp: session.completedAt
        ? (session.completedAt as Timestamp).toDate?.() || new Date(session.completedAt as string)
        : new Date(),
    }
  }

  /**
   * Save profile to Firestore
   */
  private async saveProfile(profile: EnhancedUserProfile): Promise<void> {
    const serialized = {
      ...profile,
      lastUpdated: Timestamp.fromDate(profile.lastUpdated),
      knowledgeGraph: {
        ...profile.knowledgeGraph,
        concepts: profile.knowledgeGraph.concepts.map((c) => ({
          ...c,
          lastPracticed: c.lastPracticed ? Timestamp.fromDate(c.lastPracticed) : null,
        })),
        misconceptions: profile.knowledgeGraph.misconceptions.map((m) => ({
          ...m,
          lastSeen: Timestamp.fromDate(m.lastSeen),
        })),
      },
      temporal: {
        ...profile.temporal,
        reviewSchedule: profile.temporal.reviewSchedule.map((r) => ({
          ...r,
          nextReviewDate: Timestamp.fromDate(r.nextReviewDate),
        })),
      },
      insights: profile.insights.map((i) => ({
        ...i,
        createdAt: Timestamp.fromDate(i.createdAt),
      })),
    }

    await adminDb.collection("enhanced_user_profiles").doc(profile.userId).set(serialized)
  }

  /**
   * Deserialize profile from Firestore
   */
  private deserializeProfile(data: Record<string, unknown>, userId: string): EnhancedUserProfile {
    return {
      userId,
      version: data.version as number,
      lastUpdated: (data.lastUpdated as Timestamp).toDate(),
      cognitive: data.cognitive as CognitiveProfile,
      behavioral: data.behavioral as BehavioralProfile,
      knowledgeGraph: {
        ...(data.knowledgeGraph as KnowledgeGraph),
        concepts: ((data.knowledgeGraph as KnowledgeGraph).concepts || []).map((c) => ({
          ...c,
          lastPracticed: c.lastPracticed
            ? (c.lastPracticed as unknown as Timestamp).toDate()
            : null,
        })),
        misconceptions: ((data.knowledgeGraph as KnowledgeGraph).misconceptions || []).map((m) => ({
          ...m,
          lastSeen: (m.lastSeen as unknown as Timestamp).toDate(),
        })),
      },
      temporal: {
        ...(data.temporal as TemporalProfile),
        reviewSchedule: ((data.temporal as TemporalProfile).reviewSchedule || []).map((r) => ({
          ...r,
          nextReviewDate: (r.nextReviewDate as unknown as Timestamp).toDate(),
        })),
      },
      insights: ((data.insights as UserInsight[]) || []).map((i) => ({
        ...i,
        createdAt: (i.createdAt as unknown as Timestamp).toDate(),
      })),
      interviewReadiness: data.interviewReadiness as EnhancedUserProfile["interviewReadiness"],
    }
  }

  /**
   * Create empty profile for new users
   */
  private createEmptyProfile(userId: string): EnhancedUserProfile {
    const now = new Date()
    return {
      userId,
      version: 1,
      lastUpdated: now,
      cognitive: getDefaultCognitiveProfile(),
      behavioral: getDefaultBehavioralProfile(),
      knowledgeGraph: {
        concepts: [],
        gaps: [],
        misconceptions: [],
        connections: { strongConnections: [], weakConnections: [] },
      },
      temporal: {
        skillDecay: [],
        retention: { shortTermRetention: 70, mediumTermRetention: 60, longTermRetention: 50 },
        growth: {
          currentVelocity: 0,
          projectedLevel: "beginner",
          projectedTimeToGoal: null,
          accelerating: false,
        },
        reviewSchedule: [],
      },
      insights: [
        {
          id: "insight-welcome",
          type: "opportunity",
          icon: "👋",
          title: "Welcome to Mockmate!",
          description: "Complete a few practice sessions to unlock personalized insights.",
          actionable: true,
          action: "Start your first practice",
          priority: "high",
          createdAt: now,
        },
      ],
      interviewReadiness: {
        overall: 0,
        byCompany: [],
        strongestAreas: [],
        criticalGaps: [],
        estimatedPrepDays: 90,
      },
    }
  }
}

// Singleton instance
let enhancedProfileServiceInstance: EnhancedProfileService | null = null

export function getEnhancedProfileService(): EnhancedProfileService {
  if (!enhancedProfileServiceInstance) {
    enhancedProfileServiceInstance = new EnhancedProfileService()
  }
  return enhancedProfileServiceInstance
}

// Convenience exports
export async function getEnhancedUserProfile(userId: string): Promise<EnhancedUserProfile> {
  return getEnhancedProfileService().getEnhancedProfile(userId)
}

export async function getUserInsights(userId: string): Promise<UserInsight[]> {
  return getEnhancedProfileService().getQuickInsights(userId)
}

export async function getInterviewReadiness(
  userId: string
): Promise<EnhancedUserProfile["interviewReadiness"]> {
  return getEnhancedProfileService().getInterviewReadiness(userId)
}

// ============================================================================
// PRODUCTION-GRADE BEHAVIORAL ANALYSIS EXPORTS
// ============================================================================

/**
 * Get accurate behavioral profile using production-grade analysis
 * This uses ACTUAL session data, not naive heuristics
 */
export async function getAccurateBehavioralProfile(userId: string): Promise<AccurateBehavioralProfile> {
  return generateAccurateBehavioralProfile(userId)
}

/**
 * Assess data quality for a user's behavioral analysis
 */
export async function getUserDataQuality(userId: string) {
  return assessDataQuality(userId)
}

// Re-export types for convenience
export type { AccurateBehavioralProfile } from "./behavioral-analysis"
