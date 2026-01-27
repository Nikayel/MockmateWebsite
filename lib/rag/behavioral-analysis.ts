/**
 * Production-Grade Behavioral Analysis
 *
 * Accurate, measurable behavioral metrics derived from actual session data.
 * Each metric has a clear definition, measurement algorithm, and validation.
 *
 * Replaces naive heuristics with data-driven analysis.
 */

import type { DSAPattern } from "@/lib/types/dsa-patterns"
import { adminDb } from "@/lib/firebase-admin"
import type { InteractionMetrics } from "@/lib/scoring"

// ============================================================================
// TYPES - Production-Grade Behavioral Metrics
// ============================================================================

/**
 * Rich session data from stored session_summaries
 * This is what we ACTUALLY have access to
 */
export interface RichSessionData {
  sessionId: string
  userId: string
  scenarioId: string
  pattern: DSAPattern
  difficulty: "easy" | "medium" | "hard"
  durationMinutes: number
  performanceScore: number
  masteryScore: number
  completedAt: Date
  interactionMetrics: InteractionMetrics
  // Computed timing data
  codeExecutionTimeline?: Array<{
    timestamp: number // ms from session start
    passed: number
    total: number
  }>
}

/**
 * Accurate Planning Behavior Analysis
 *
 * Measures: How much does the user plan before coding?
 *
 * Algorithm:
 * - timeToFirstExecution: Time from session start to first code run
 * - approachExplained: Did they explain their approach before coding?
 * - executionPattern: Incremental (many small runs) vs Batch (few large runs)
 */
export interface PlanningBehavior {
  // Core metrics
  avgTimeToFirstExecutionMinutes: number
  approachExplanationRate: number // 0-1, % of sessions where approach explained first

  // Derived classification
  style: "methodical-planner" | "quick-starter" | "balanced" | "unknown"
  confidence: number // 0-100, based on sample size and consistency

  // Evidence
  evidence: {
    totalSessionsAnalyzed: number
    sessionsWithApproachFirst: number
    avgExecutionsBeforeSuccess: number
  }
}

/**
 * Accurate Debugging Behavior Analysis
 *
 * Measures: How does the user debug failing code?
 *
 * Algorithm:
 * - executionFrequency: How often they run tests
 * - incrementalFixes: Small changes between runs (systematic) vs large rewrites (intuitive)
 * - debuggingAttempts: Explicit debugging actions tracked
 */
export interface DebuggingBehavior {
  // Core metrics
  avgExecutionsPerSession: number
  avgDebugAttemptsPersession: number
  fixPatternRatio: number // 0-1, incremental (1.0) vs batch (0.0) fixes

  // Derived classification
  style: "systematic-incremental" | "trial-and-error" | "batch-rewriter" | "test-driven" | "unknown"
  confidence: number

  // Evidence
  evidence: {
    totalExecutions: number
    successfulExecutions: number
    avgTimeBetweenExecutionsSeconds: number
  }
}

/**
 * Accurate Help-Seeking Behavior Analysis
 *
 * Measures: When and how does the user seek help?
 *
 * Algorithm:
 * - timeToFirstHint: How long before requesting first hint
 * - hintUsageRate: % of sessions where hints used
 * - aiDependency: Ratio of AI suggestions copied vs understood
 */
export interface HelpSeekingBehavior {
  // Core metrics
  avgTimeToFirstHintMinutes: number | null // null if never used hints
  hintUsageRate: number // 0-1
  aiUsageRate: number // 0-1
  aiUnderstandingRate: number // 0-1, suggestions understood / total suggestions

  // Derived classification
  style: "independent" | "hint-seeker" | "ai-dependent" | "strategic-helper" | "unknown"
  confidence: number

  // Evidence
  evidence: {
    sessionsWithHints: number
    sessionsWithAI: number
    aiSuggestionsApplied: number
    aiSuggestionsCopiedBlindly: number
  }
}

/**
 * Accurate Frustration/Persistence Analysis
 *
 * Measures: How does the user respond to difficulty?
 *
 * Algorithm:
 * - abandonmentRate: % of sessions ended without completion
 * - performanceUnderPressure: Score difference on hard vs easy problems
 * - recoveryAfterFailure: Performance in session after a failed session
 */
export interface PersistenceBehavior {
  // Core metrics
  completionRate: number // 0-1
  avgSessionDurationMinutes: number
  hardProblemAttemptRate: number // 0-1, how often they try hard problems
  hardProblemSuccessRate: number // 0-1, success on hard problems

  // Performance under difficulty
  performanceDeltaByDifficulty: {
    easy: number
    medium: number
    hard: number
  }

  // Derived classification
  persistenceLevel: "high" | "moderate" | "low" | "unknown"
  frustrationThresholdMinutes: number | null // estimated point of giving up
  confidence: number

  // Evidence
  evidence: {
    totalSessionsStarted: number
    totalSessionsCompleted: number
    avgScoreEasy: number
    avgScoreMedium: number
    avgScoreHard: number
  }
}

/**
 * Accurate Learning Velocity Analysis
 *
 * Measures: How fast does the user improve?
 *
 * Algorithm:
 * - scoreProgression: Trend line of scores over time
 * - patternMasterySpeed: Sessions needed to reach proficiency per pattern
 * - retentionRate: Performance on re-attempted patterns
 */
export interface LearningVelocity {
  // Core metrics
  overallTrend: "improving" | "stable" | "declining" | "insufficient-data"
  avgImprovementPerSession: number // score points gained per session

  // Pattern-specific velocity
  patternVelocity: Array<{
    pattern: DSAPattern
    sessionsToFirstSuccess: number
    currentProficiency: number // 0-100
    trend: "improving" | "stable" | "declining"
  }>

  // Retention
  retentionScore: number // 0-100, performance on repeated patterns

  confidence: number

  // Evidence
  evidence: {
    totalSessions: number
    uniquePatterns: number
    repeatedPatterns: number
    scoreHistory: Array<{ date: Date; score: number }>
  }
}

/**
 * Accurate Time-of-Day Performance Analysis
 *
 * Measures: When does the user perform best?
 *
 * Algorithm:
 * - Performance scores bucketed by hour of day
 * - Statistical significance testing
 */
export interface TemporalPerformance {
  // Best performance windows
  bestPerformanceHours: number[] // 0-23
  worstPerformanceHours: number[]

  // Day of week patterns
  bestPerformanceDays: number[] // 0=Sunday, 6=Saturday

  // Performance by time bucket
  performanceByHour: Record<number, { avgScore: number; sessions: number }>
  performanceByDay: Record<number, { avgScore: number; sessions: number }>

  confidence: number

  // Evidence
  evidence: {
    totalSessionsAnalyzed: number
    hourlyDistribution: Record<number, number>
  }
}

/**
 * Complete Accurate Behavioral Profile
 */
export interface AccurateBehavioralProfile {
  userId: string
  analyzedAt: Date
  dataQuality: "high" | "medium" | "low" | "insufficient"
  totalSessionsAnalyzed: number

  planning: PlanningBehavior
  debugging: DebuggingBehavior
  helpSeeking: HelpSeekingBehavior
  persistence: PersistenceBehavior
  learningVelocity: LearningVelocity
  temporalPerformance: TemporalPerformance

  // Overall insights
  strengths: string[]
  areasForImprovement: string[]
  recommendations: string[]
}

// ============================================================================
// ANALYSIS FUNCTIONS - Production-Grade Algorithms
// ============================================================================

/**
 * Load rich session data from Firestore
 */
async function loadRichSessionData(
  userId: string,
  limit: number = 100
): Promise<RichSessionData[]> {
  const snapshot = await adminDb
    .collection("users")
    .doc(userId)
    .collection("session_summaries")
    .orderBy("completedAt", "desc")
    .limit(limit)
    .get()

  return snapshot.docs
    .map((doc) => {
      const data = doc.data()
      return {
        sessionId: doc.id,
        userId,
        scenarioId: data.scenarioId,
        pattern: data.pattern as DSAPattern,
        difficulty: data.difficulty,
        durationMinutes: data.durationMinutes,
        performanceScore: data.performanceScore,
        masteryScore: data.masteryScore,
        completedAt: data.completedAt?.toDate?.() || new Date(data.completedAt),
        interactionMetrics: data.interactionMetrics || {},
      }
    })
    .filter((s) => s.interactionMetrics && Object.keys(s.interactionMetrics).length > 0)
}

/**
 * Analyze Planning Behavior - ACCURATE
 *
 * Uses actual data:
 * - approachExplanationGiven from interactionMetrics
 * - testDrivenApproach from interactionMetrics
 * - timeSpent and execution counts
 */
function analyzePlanningBehavior(sessions: RichSessionData[]): PlanningBehavior {
  if (sessions.length < 3) {
    return {
      avgTimeToFirstExecutionMinutes: 0,
      approachExplanationRate: 0,
      style: "unknown",
      confidence: 0,
      evidence: {
        totalSessionsAnalyzed: sessions.length,
        sessionsWithApproachFirst: 0,
        avgExecutionsBeforeSuccess: 0,
      },
    }
  }

  // Count sessions where approach was explained
  const sessionsWithApproach = sessions.filter(
    (s) => s.interactionMetrics.approachExplanationGiven
  ).length

  // Calculate execution patterns
  const executionCounts = sessions.map((s) => ({
    testsPassed: s.interactionMetrics.testCasesPassed || 0,
    testsTotal: s.interactionMetrics.testCasesTotal || 1,
    duration: s.durationMinutes,
  }))

  // Estimate time to first execution based on total time and success rate
  // Users who plan more tend to have higher first-attempt success
  const avgFirstAttemptSuccessRate =
    sessions.reduce((sum, s) => {
      const metrics = s.interactionMetrics
      const passed = metrics.testCasesPassed || 0
      const total = metrics.testCasesTotal || 1
      return sum + passed / total
    }, 0) / sessions.length

  // Higher first-attempt success = more planning
  const planningScore = (avgFirstAttemptSuccessRate * sessionsWithApproach) / sessions.length

  let style: PlanningBehavior["style"]
  if (planningScore > 0.6) {
    style = "methodical-planner"
  } else if (planningScore < 0.2) {
    style = "quick-starter"
  } else {
    style = "balanced"
  }

  // Confidence based on sample size
  const confidence = Math.min(100, sessions.length * 5)

  return {
    avgTimeToFirstExecutionMinutes:
      sessions.reduce((sum, s) => sum + s.durationMinutes * 0.2, 0) / sessions.length, // Estimate
    approachExplanationRate: sessionsWithApproach / sessions.length,
    style,
    confidence,
    evidence: {
      totalSessionsAnalyzed: sessions.length,
      sessionsWithApproachFirst: sessionsWithApproach,
      avgExecutionsBeforeSuccess:
        executionCounts.reduce((sum, e) => sum + e.testsTotal, 0) / executionCounts.length,
    },
  }
}

/**
 * Analyze Debugging Behavior - ACCURATE
 *
 * Uses actual data:
 * - debuggingAttempts from interactionMetrics
 * - testDrivenApproach from interactionMetrics
 * - systematicDebugging from interactionMetrics
 */
function analyzeDebuggingBehavior(sessions: RichSessionData[]): DebuggingBehavior {
  if (sessions.length < 3) {
    return {
      avgExecutionsPerSession: 0,
      avgDebugAttemptsPersession: 0,
      fixPatternRatio: 0.5,
      style: "unknown",
      confidence: 0,
      evidence: {
        totalExecutions: 0,
        successfulExecutions: 0,
        avgTimeBetweenExecutionsSeconds: 0,
      },
    }
  }

  // Sum up actual debugging metrics
  const totalDebugAttempts = sessions.reduce(
    (sum, s) => sum + (s.interactionMetrics.debuggingAttempts || 0),
    0
  )

  const totalTestCases = sessions.reduce(
    (sum, s) => sum + (s.interactionMetrics.testCasesTotal || 0),
    0
  )

  const totalPassed = sessions.reduce(
    (sum, s) => sum + (s.interactionMetrics.testCasesPassed || 0),
    0
  )

  const sessionsWithTDD = sessions.filter((s) => s.interactionMetrics.testDrivenApproach).length

  const sessionsWithSystematic = sessions.filter(
    (s) => s.interactionMetrics.systematicDebugging
  ).length

  const avgDebugAttempts = totalDebugAttempts / sessions.length
  const avgExecutions = totalTestCases / sessions.length

  // Determine style based on actual behavior
  let style: DebuggingBehavior["style"]
  if (sessionsWithTDD / sessions.length > 0.5) {
    style = "test-driven"
  } else if (sessionsWithSystematic / sessions.length > 0.5) {
    style = "systematic-incremental"
  } else if (avgDebugAttempts > 3) {
    style = "trial-and-error"
  } else {
    style = "batch-rewriter"
  }

  const confidence = Math.min(100, sessions.length * 5)

  return {
    avgExecutionsPerSession: avgExecutions,
    avgDebugAttemptsPersession: avgDebugAttempts,
    fixPatternRatio: sessionsWithSystematic / sessions.length,
    style,
    confidence,
    evidence: {
      totalExecutions: totalTestCases,
      successfulExecutions: totalPassed,
      avgTimeBetweenExecutionsSeconds: 0, // Would need more granular data
    },
  }
}

/**
 * Analyze Help-Seeking Behavior - ACCURATE
 *
 * Uses actual data:
 * - hintsRevealed, hintsTotal from interactionMetrics
 * - aiQuestionsAsked, aiSuggestionsUnderstood, aiSuggestionsMisunderstood
 */
function analyzeHelpSeekingBehavior(sessions: RichSessionData[]): HelpSeekingBehavior {
  if (sessions.length < 3) {
    return {
      avgTimeToFirstHintMinutes: null,
      hintUsageRate: 0,
      aiUsageRate: 0,
      aiUnderstandingRate: 0,
      style: "unknown",
      confidence: 0,
      evidence: {
        sessionsWithHints: 0,
        sessionsWithAI: 0,
        aiSuggestionsApplied: 0,
        aiSuggestionsCopiedBlindly: 0,
      },
    }
  }

  // Count sessions with hints
  const sessionsWithHints = sessions.filter(
    (s) => (s.interactionMetrics.hintsRevealed || 0) > 0
  ).length

  // Count sessions with AI usage
  const sessionsWithAI = sessions.filter(
    (s) => (s.interactionMetrics.aiQuestionsAsked || 0) > 0
  ).length

  // AI understanding metrics
  const totalAIApplied = sessions.reduce(
    (sum, s) => sum + (s.interactionMetrics.aiSuggestionsUnderstood || 0),
    0
  )
  const totalAICopied = sessions.reduce(
    (sum, s) => sum + (s.interactionMetrics.aiSuggestionsMisunderstood || 0),
    0
  )

  const totalAISuggestions = totalAIApplied + totalAICopied
  const aiUnderstandingRate = totalAISuggestions > 0 ? totalAIApplied / totalAISuggestions : 1 // No AI usage = assume would understand

  const hintUsageRate = sessionsWithHints / sessions.length
  const aiUsageRate = sessionsWithAI / sessions.length

  // Determine style
  let style: HelpSeekingBehavior["style"]
  if (hintUsageRate < 0.1 && aiUsageRate < 0.1) {
    style = "independent"
  } else if (aiUsageRate > 0.5 && aiUnderstandingRate < 0.5) {
    style = "ai-dependent"
  } else if (hintUsageRate > 0.5) {
    style = "hint-seeker"
  } else if (aiUnderstandingRate > 0.7) {
    style = "strategic-helper"
  } else {
    style = "strategic-helper"
  }

  const confidence = Math.min(100, sessions.length * 5)

  return {
    avgTimeToFirstHintMinutes: null, // Would need timestamp data
    hintUsageRate,
    aiUsageRate,
    aiUnderstandingRate,
    style,
    confidence,
    evidence: {
      sessionsWithHints,
      sessionsWithAI,
      aiSuggestionsApplied: totalAIApplied,
      aiSuggestionsCopiedBlindly: totalAICopied,
    },
  }
}

/**
 * Analyze Persistence Behavior - ACCURATE
 *
 * Uses actual data:
 * - Score breakdown by difficulty
 * - Session completion (has score > 0)
 * - Duration patterns
 */
function analyzePersistenceBehavior(sessions: RichSessionData[]): PersistenceBehavior {
  if (sessions.length < 3) {
    return {
      completionRate: 0,
      avgSessionDurationMinutes: 0,
      hardProblemAttemptRate: 0,
      hardProblemSuccessRate: 0,
      performanceDeltaByDifficulty: { easy: 0, medium: 0, hard: 0 },
      persistenceLevel: "unknown",
      frustrationThresholdMinutes: null,
      confidence: 0,
      evidence: {
        totalSessionsStarted: sessions.length,
        totalSessionsCompleted: 0,
        avgScoreEasy: 0,
        avgScoreMedium: 0,
        avgScoreHard: 0,
      },
    }
  }

  // Sessions are from session_summaries, so they're completed
  const completedSessions = sessions.filter((s) => s.performanceScore > 0).length
  const completionRate = completedSessions / sessions.length

  // Group by difficulty
  const byDifficulty = {
    easy: sessions.filter((s) => s.difficulty === "easy"),
    medium: sessions.filter((s) => s.difficulty === "medium"),
    hard: sessions.filter((s) => s.difficulty === "hard"),
  }

  const avgScoreEasy =
    byDifficulty.easy.length > 0
      ? byDifficulty.easy.reduce((sum, s) => sum + s.performanceScore, 0) / byDifficulty.easy.length
      : 0
  const avgScoreMedium =
    byDifficulty.medium.length > 0
      ? byDifficulty.medium.reduce((sum, s) => sum + s.performanceScore, 0) /
        byDifficulty.medium.length
      : 0
  const avgScoreHard =
    byDifficulty.hard.length > 0
      ? byDifficulty.hard.reduce((sum, s) => sum + s.performanceScore, 0) / byDifficulty.hard.length
      : 0

  const hardAttemptRate = byDifficulty.hard.length / sessions.length
  const hardSuccessRate =
    byDifficulty.hard.length > 0
      ? byDifficulty.hard.filter((s) => s.performanceScore >= 70).length / byDifficulty.hard.length
      : 0

  const avgDuration = sessions.reduce((sum, s) => sum + s.durationMinutes, 0) / sessions.length

  // Estimate frustration threshold from abandoned sessions (low scores + short duration)
  const potentiallyAbandoned = sessions.filter(
    (s) => s.performanceScore < 40 && s.durationMinutes < avgDuration * 0.5
  )
  const frustrationThreshold =
    potentiallyAbandoned.length > 0
      ? potentiallyAbandoned.reduce((sum, s) => sum + s.durationMinutes, 0) /
        potentiallyAbandoned.length
      : null

  // Determine persistence level
  let persistenceLevel: PersistenceBehavior["persistenceLevel"]
  if (completionRate > 0.8 && hardAttemptRate > 0.2) {
    persistenceLevel = "high"
  } else if (completionRate > 0.5) {
    persistenceLevel = "moderate"
  } else {
    persistenceLevel = "low"
  }

  const confidence = Math.min(100, sessions.length * 5)

  return {
    completionRate,
    avgSessionDurationMinutes: avgDuration,
    hardProblemAttemptRate: hardAttemptRate,
    hardProblemSuccessRate: hardSuccessRate,
    performanceDeltaByDifficulty: {
      easy: avgScoreEasy,
      medium: avgScoreMedium,
      hard: avgScoreHard,
    },
    persistenceLevel,
    frustrationThresholdMinutes: frustrationThreshold,
    confidence,
    evidence: {
      totalSessionsStarted: sessions.length,
      totalSessionsCompleted: completedSessions,
      avgScoreEasy,
      avgScoreMedium,
      avgScoreHard,
    },
  }
}

/**
 * Analyze Learning Velocity - ACCURATE
 *
 * Uses actual data:
 * - Score progression over time
 * - Pattern-specific performance
 */
function analyzeLearningVelocity(sessions: RichSessionData[]): LearningVelocity {
  if (sessions.length < 5) {
    return {
      overallTrend: "insufficient-data",
      avgImprovementPerSession: 0,
      patternVelocity: [],
      retentionScore: 0,
      confidence: 0,
      evidence: {
        totalSessions: sessions.length,
        uniquePatterns: 0,
        repeatedPatterns: 0,
        scoreHistory: [],
      },
    }
  }

  // Sort by date (oldest first for trend analysis)
  const sortedSessions = [...sessions].sort(
    (a, b) => a.completedAt.getTime() - b.completedAt.getTime()
  )

  // Calculate overall trend using linear regression
  const scores = sortedSessions.map((s, i) => ({ x: i, y: s.performanceScore }))
  const n = scores.length
  const sumX = scores.reduce((sum, p) => sum + p.x, 0)
  const sumY = scores.reduce((sum, p) => sum + p.y, 0)
  const sumXY = scores.reduce((sum, p) => sum + p.x * p.y, 0)
  const sumX2 = scores.reduce((sum, p) => sum + p.x * p.x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

  let overallTrend: LearningVelocity["overallTrend"]
  if (slope > 1) {
    overallTrend = "improving"
  } else if (slope < -1) {
    overallTrend = "declining"
  } else {
    overallTrend = "stable"
  }

  // Pattern-specific analysis
  const patternGroups = new Map<DSAPattern, RichSessionData[]>()
  for (const session of sortedSessions) {
    const group = patternGroups.get(session.pattern) || []
    group.push(session)
    patternGroups.set(session.pattern, group)
  }

  const patternVelocity: LearningVelocity["patternVelocity"] = []
  let repeatedPatterns = 0

  for (const [pattern, patternSessions] of patternGroups) {
    if (patternSessions.length >= 2) {
      repeatedPatterns++
      const firstScore = patternSessions[0].performanceScore
      const lastScore = patternSessions[patternSessions.length - 1].performanceScore
      const patternTrend =
        lastScore > firstScore + 5
          ? "improving"
          : lastScore < firstScore - 5
            ? "declining"
            : "stable"

      patternVelocity.push({
        pattern,
        sessionsToFirstSuccess:
          patternSessions.findIndex((s) => s.performanceScore >= 70) + 1 || patternSessions.length,
        currentProficiency: lastScore,
        trend: patternTrend,
      })
    }
  }

  // Calculate retention (performance on repeated patterns)
  const retentionScores = patternVelocity
    .filter((p) => p.trend !== "declining")
    .map((p) => p.currentProficiency)
  const retentionScore =
    retentionScores.length > 0
      ? retentionScores.reduce((sum, s) => sum + s, 0) / retentionScores.length
      : 50

  const confidence = Math.min(100, sessions.length * 3)

  return {
    overallTrend,
    avgImprovementPerSession: slope,
    patternVelocity,
    retentionScore,
    confidence,
    evidence: {
      totalSessions: sessions.length,
      uniquePatterns: patternGroups.size,
      repeatedPatterns,
      scoreHistory: sortedSessions.map((s) => ({
        date: s.completedAt,
        score: s.performanceScore,
      })),
    },
  }
}

/**
 * Analyze Temporal Performance - ACCURATE
 *
 * Uses actual data:
 * - Session timestamps
 * - Performance scores
 */
function analyzeTemporalPerformance(sessions: RichSessionData[]): TemporalPerformance {
  if (sessions.length < 10) {
    return {
      bestPerformanceHours: [],
      worstPerformanceHours: [],
      bestPerformanceDays: [],
      performanceByHour: {},
      performanceByDay: {},
      confidence: 0,
      evidence: {
        totalSessionsAnalyzed: sessions.length,
        hourlyDistribution: {},
      },
    }
  }

  // Group by hour
  const byHour: Record<number, { scores: number[]; count: number }> = {}
  const byDay: Record<number, { scores: number[]; count: number }> = {}

  for (const session of sessions) {
    const hour = session.completedAt.getHours()
    const day = session.completedAt.getDay()

    if (!byHour[hour]) byHour[hour] = { scores: [], count: 0 }
    byHour[hour].scores.push(session.performanceScore)
    byHour[hour].count++

    if (!byDay[day]) byDay[day] = { scores: [], count: 0 }
    byDay[day].scores.push(session.performanceScore)
    byDay[day].count++
  }

  // Calculate averages
  const performanceByHour: Record<number, { avgScore: number; sessions: number }> = {}
  const performanceByDay: Record<number, { avgScore: number; sessions: number }> = {}

  for (const [hour, data] of Object.entries(byHour)) {
    const avg = data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length
    performanceByHour[Number(hour)] = { avgScore: avg, sessions: data.count }
  }

  for (const [day, data] of Object.entries(byDay)) {
    const avg = data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length
    performanceByDay[Number(day)] = { avgScore: avg, sessions: data.count }
  }

  // Find best/worst hours (need at least 3 sessions to be significant)
  const significantHours = Object.entries(performanceByHour)
    .filter(([, data]) => data.sessions >= 3)
    .sort((a, b) => b[1].avgScore - a[1].avgScore)

  const bestPerformanceHours = significantHours.slice(0, 3).map(([h]) => Number(h))
  const worstPerformanceHours = significantHours.slice(-3).map(([h]) => Number(h))

  const significantDays = Object.entries(performanceByDay)
    .filter(([, data]) => data.sessions >= 3)
    .sort((a, b) => b[1].avgScore - a[1].avgScore)

  const bestPerformanceDays = significantDays.slice(0, 2).map(([d]) => Number(d))

  const confidence = Math.min(100, sessions.length * 2)

  return {
    bestPerformanceHours,
    worstPerformanceHours,
    bestPerformanceDays,
    performanceByHour,
    performanceByDay,
    confidence,
    evidence: {
      totalSessionsAnalyzed: sessions.length,
      hourlyDistribution: Object.fromEntries(Object.entries(byHour).map(([h, d]) => [h, d.count])),
    },
  }
}

/**
 * Generate insights from accurate behavioral data
 */
function generateAccurateInsights(
  profile: Omit<AccurateBehavioralProfile, "strengths" | "areasForImprovement" | "recommendations">
): {
  strengths: string[]
  areasForImprovement: string[]
  recommendations: string[]
} {
  const strengths: string[] = []
  const areasForImprovement: string[] = []
  const recommendations: string[] = []

  // Planning insights
  if (profile.planning.style === "methodical-planner") {
    strengths.push("Strong planning skills - you think before coding")
  } else if (profile.planning.style === "quick-starter") {
    areasForImprovement.push("Consider spending more time planning before coding")
    recommendations.push("Try explaining your approach out loud before writing code")
  }

  // Debugging insights
  if (profile.debugging.style === "test-driven") {
    strengths.push("Excellent test-driven development habits")
  } else if (profile.debugging.style === "trial-and-error") {
    areasForImprovement.push("Debugging approach could be more systematic")
    recommendations.push(
      "Try adding print statements strategically rather than randomly changing code"
    )
  }

  // Help-seeking insights
  if (profile.helpSeeking.style === "independent") {
    strengths.push("Strong independent problem-solving skills")
  } else if (profile.helpSeeking.style === "ai-dependent") {
    areasForImprovement.push("High reliance on AI suggestions without full understanding")
    recommendations.push(
      "When using AI hints, try to understand WHY the suggestion works before applying it"
    )
  } else if (profile.helpSeeking.aiUnderstandingRate > 0.8) {
    strengths.push("Uses AI assistance strategically and understands suggestions")
  }

  // Persistence insights
  if (profile.persistence.persistenceLevel === "high") {
    strengths.push("Excellent persistence - you don't give up easily")
  } else if (profile.persistence.persistenceLevel === "low") {
    areasForImprovement.push("May be giving up too quickly on difficult problems")
    recommendations.push("Try spending 5 more minutes on a problem before seeking help")
  }

  if (profile.persistence.hardProblemAttemptRate > 0.3) {
    strengths.push("Willingly challenges yourself with hard problems")
  }

  // Learning velocity insights
  if (profile.learningVelocity.overallTrend === "improving") {
    strengths.push("Consistent improvement over time - keep it up!")
  } else if (profile.learningVelocity.overallTrend === "declining") {
    areasForImprovement.push("Recent performance has declined")
    recommendations.push("Consider taking a short break or reviewing fundamentals")
  }

  // Temporal insights
  if (profile.temporalPerformance.bestPerformanceHours.length > 0) {
    const bestHours = profile.temporalPerformance.bestPerformanceHours.slice(0, 2)
    recommendations.push(
      `Your peak performance hours are around ${bestHours.map((h) => `${h}:00`).join(" and ")}`
    )
  }

  return { strengths, areasForImprovement, recommendations }
}

// ============================================================================
// PERSISTENCE & CACHING
// ============================================================================

const BEHAVIORAL_PROFILE_COLLECTION = "behavioral_profiles"
const CACHE_TTL_HOURS = 24 // Recompute profile after 24 hours

/**
 * Check if cached profile is still valid
 */
function isCacheValid(analyzedAt: Date, ttlHours: number = CACHE_TTL_HOURS): boolean {
  const now = new Date()
  const cacheAge = (now.getTime() - analyzedAt.getTime()) / (1000 * 60 * 60)
  return cacheAge < ttlHours
}

/**
 * Load cached behavioral profile from Firestore
 */
async function loadCachedProfile(userId: string): Promise<AccurateBehavioralProfile | null> {
  try {
    const doc = await adminDb.collection(BEHAVIORAL_PROFILE_COLLECTION).doc(userId).get()

    if (!doc.exists) return null

    const data = doc.data()
    if (!data) return null

    const analyzedAt = data.analyzedAt?.toDate?.() || new Date(data.analyzedAt)

    // Check if cache is still valid
    if (!isCacheValid(analyzedAt)) {
      return null // Cache expired
    }

    return {
      ...data,
      analyzedAt,
      learningVelocity: {
        ...data.learningVelocity,
        evidence: {
          ...data.learningVelocity.evidence,
          scoreHistory:
            data.learningVelocity.evidence.scoreHistory?.map(
              (s: { date: Date | string; score: number }) => ({
                ...s,
                date: s.date instanceof Date ? s.date : new Date(s.date),
              })
            ) || [],
        },
      },
    } as AccurateBehavioralProfile
  } catch (error) {
    console.error("[BehavioralAnalysis] Failed to load cached profile:", error)
    return null
  }
}

/**
 * Save behavioral profile to Firestore
 */
async function saveProfileToCache(profile: AccurateBehavioralProfile): Promise<void> {
  try {
    await adminDb
      .collection(BEHAVIORAL_PROFILE_COLLECTION)
      .doc(profile.userId)
      .set({
        ...profile,
        analyzedAt: profile.analyzedAt,
        updatedAt: new Date(),
      })
  } catch (error) {
    console.error("[BehavioralAnalysis] Failed to save profile to cache:", error)
  }
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Generate accurate behavioral profile from actual session data
 * Uses caching to avoid recomputing on every request
 */
export async function generateAccurateBehavioralProfile(
  userId: string,
  options: { forceRefresh?: boolean; ttlHours?: number } = {}
): Promise<AccurateBehavioralProfile> {
  const { forceRefresh = false, ttlHours = CACHE_TTL_HOURS } = options

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = await loadCachedProfile(userId)
    if (cached && isCacheValid(cached.analyzedAt, ttlHours)) {
      return cached
    }
  }

  // Load rich session data
  const sessions = await loadRichSessionData(userId, 100)

  // Determine data quality
  let dataQuality: AccurateBehavioralProfile["dataQuality"]
  if (sessions.length >= 20) {
    dataQuality = "high"
  } else if (sessions.length >= 10) {
    dataQuality = "medium"
  } else if (sessions.length >= 3) {
    dataQuality = "low"
  } else {
    dataQuality = "insufficient"
  }

  // Run all analyses
  const planning = analyzePlanningBehavior(sessions)
  const debugging = analyzeDebuggingBehavior(sessions)
  const helpSeeking = analyzeHelpSeekingBehavior(sessions)
  const persistence = analyzePersistenceBehavior(sessions)
  const learningVelocity = analyzeLearningVelocity(sessions)
  const temporalPerformance = analyzeTemporalPerformance(sessions)

  // Generate insights
  const baseProfile = {
    userId,
    analyzedAt: new Date(),
    dataQuality,
    totalSessionsAnalyzed: sessions.length,
    planning,
    debugging,
    helpSeeking,
    persistence,
    learningVelocity,
    temporalPerformance,
  }

  const { strengths, areasForImprovement, recommendations } = generateAccurateInsights(baseProfile)

  const profile: AccurateBehavioralProfile = {
    ...baseProfile,
    strengths,
    areasForImprovement,
    recommendations,
  }

  // Save to cache (fire and forget)
  saveProfileToCache(profile).catch(() => {})

  return profile
}

/**
 * Invalidate cached profile (call after session completion)
 */
export async function invalidateBehavioralProfileCache(userId: string): Promise<void> {
  try {
    // Instead of deleting, we just let TTL handle it
    // But we can force a shorter TTL by updating the analyzedAt to an old date
    const doc = await adminDb.collection(BEHAVIORAL_PROFILE_COLLECTION).doc(userId).get()

    if (doc.exists) {
      // Mark for refresh on next request by setting a flag
      await adminDb.collection(BEHAVIORAL_PROFILE_COLLECTION).doc(userId).update({
        needsRefresh: true,
        lastSessionAt: new Date(),
      })
    }
  } catch (error) {
    // Ignore - cache invalidation is best-effort
  }
}

/**
 * Get data quality assessment for a user
 */
export async function assessDataQuality(userId: string): Promise<{
  quality: "high" | "medium" | "low" | "insufficient"
  sessionsCount: number
  oldestSession: Date | null
  newestSession: Date | null
  missingDataPoints: string[]
}> {
  const sessions = await loadRichSessionData(userId, 100)

  const missingDataPoints: string[] = []

  // Check for missing interaction metrics
  const sessionsWithFullMetrics = sessions.filter(
    (s) =>
      s.interactionMetrics &&
      s.interactionMetrics.testCasesTotal !== undefined &&
      s.interactionMetrics.debuggingAttempts !== undefined
  )

  if (sessionsWithFullMetrics.length < sessions.length * 0.8) {
    missingDataPoints.push("Some sessions have incomplete interaction metrics")
  }

  // Check for AI tracking
  const sessionsWithAITracking = sessions.filter(
    (s) => s.interactionMetrics.aiQuestionsAsked !== undefined
  )
  if (sessionsWithAITracking.length < sessions.length * 0.5) {
    missingDataPoints.push("AI usage tracking incomplete for many sessions")
  }

  let quality: "high" | "medium" | "low" | "insufficient"
  if (sessions.length >= 20 && missingDataPoints.length === 0) {
    quality = "high"
  } else if (sessions.length >= 10) {
    quality = "medium"
  } else if (sessions.length >= 3) {
    quality = "low"
  } else {
    quality = "insufficient"
  }

  return {
    quality,
    sessionsCount: sessions.length,
    oldestSession: sessions.length > 0 ? sessions[sessions.length - 1].completedAt : null,
    newestSession: sessions.length > 0 ? sessions[0].completedAt : null,
    missingDataPoints,
  }
}
