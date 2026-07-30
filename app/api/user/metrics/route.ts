/**
 * User Metrics API
 *
 * Provides comprehensive metrics data for the user dashboard including:
 * - Overall statistics
 * - Pattern-based performance
 * - Performance trends
 * - Session history
 */

import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { getUserStats, getRecentSessions, getPerformanceTrends } from "@/lib/session-metrics"
import { getUserUsageSummary } from "@/lib/usage-tracking"
import { getMasteryStatistics, getUserScoreStats } from "@/lib/scoring/index"
import { calculateTechnicalScoreFromBreakdown } from "@/lib/constants"
import { clampPracticeMinutes } from "@/lib/session-duration"
import { logger } from "@/lib/logger"

/**
 * @deprecated Technical score is now unified with Mastery score.
 * Prefer using session.mastery_score or session.technical_score directly.
 *
 * This fallback calculates from breakdown using the centralized function.
 * Only used when mastery_score is not available.
 */
function calculateTechScoreFallback(
  understanding: number,
  problemSolving: number,
  codeQuality: number
): number {
  // Uses centralized calculateTechnicalScoreFromBreakdown from lib/constants.ts
  return calculateTechnicalScoreFromBreakdown({
    codeQualityScore: codeQuality,
    problemSolvingScore: problemSolving,
    understandingScore: understanding,
  })
}

/**
 * Fallback: Get stats directly from interview_sessions if user_stats is empty
 * This handles cases where sessions were completed but user_stats wasn't populated
 */
async function getStatsFromInterviewSessions(userId: string): Promise<{
  totalSessions: number
  totalPracticeMinutes: number
  averageScore: number
  averageTechnicalScore: number // Code-focused score (excludes communication)
  patternStats: Record<
    string,
    { sessions: number; averageScore: number; averageTechnicalScore: number; bestScore: number }
  >
  difficultyStats: Record<
    string,
    { sessions: number; averageScore: number; averageTechnicalScore: number }
  >
  lastSessionAt?: string
} | null> {
  try {
    const snapshot = await adminDb
      .collection("interview_sessions")
      .where("user_id", "==", userId)
      .where("completed_at", "!=", null)
      .get()

    if (snapshot.empty) return null

    const sessions = snapshot.docs.map((doc) => doc.data())

    // Aggregate stats
    let totalPracticeMinutes = 0
    let totalScore = 0
    let totalTechnicalScore = 0
    let scoredSessions = 0
    let lastSessionAt: string | undefined
    const patternStats: Record<
      string,
      {
        sessions: number
        totalScore: number
        totalTechnicalScore: number
        averageScore: number
        averageTechnicalScore: number
        bestScore: number
      }
    > = {}
    const difficultyStats: Record<
      string,
      {
        sessions: number
        totalScore: number
        totalTechnicalScore: number
        averageScore: number
        averageTechnicalScore: number
      }
    > = {}

    for (const session of sessions) {
      // Calculate duration. Shares the clamp with lib/session-metrics.ts so this
      // fallback and the stored `user_stats` aggregate can never report different
      // totals for the same history.
      totalPracticeMinutes += clampPracticeMinutes(session.started_at, session.completed_at)

      // Track score if available
      if (session.performance_score !== undefined && session.performance_score !== null) {
        totalScore += session.performance_score
        scoredSessions++

        // Technical score = Mastery score (objective metrics: tests, time, independence)
        // Priority: technical_score (already mastery) > mastery_score > fallback calculation
        if (session.technical_score !== undefined) {
          totalTechnicalScore += session.technical_score
        } else if (session.mastery_score !== undefined) {
          totalTechnicalScore += session.mastery_score
        } else {
          // Fallback: calculate from breakdown using deprecated method
          const breakdown = session.score_breakdown || session.scoreBreakdown
          if (breakdown) {
            const understanding = breakdown.understanding || breakdown.understandingScore || 0
            const problemSolving = breakdown.problemSolving || breakdown.problemSolvingScore || 0
            const codeQuality = breakdown.codeQuality || breakdown.codeQualityScore || 0
            totalTechnicalScore += calculateTechScoreFallback(
              understanding,
              problemSolving,
              codeQuality
            )
          } else {
            // Last resort: estimate technical as performance score
            totalTechnicalScore += session.performance_score
          }
        }
      }

      // Track last session
      if (!lastSessionAt || session.completed_at > lastSessionAt) {
        lastSessionAt = session.completed_at
      }

      // Pattern stats
      const pattern = session.pattern || "unknown"
      if (!patternStats[pattern]) {
        patternStats[pattern] = {
          sessions: 0,
          totalScore: 0,
          totalTechnicalScore: 0,
          averageScore: 0,
          averageTechnicalScore: 0,
          bestScore: 0,
        }
      }
      patternStats[pattern].sessions++
      if (session.performance_score !== undefined) {
        patternStats[pattern].totalScore += session.performance_score
        patternStats[pattern].bestScore = Math.max(
          patternStats[pattern].bestScore,
          session.performance_score
        )

        // Technical score = Mastery score for pattern
        if (session.technical_score !== undefined) {
          patternStats[pattern].totalTechnicalScore += session.technical_score
        } else if (session.mastery_score !== undefined) {
          patternStats[pattern].totalTechnicalScore += session.mastery_score
        } else {
          // Fallback: calculate from breakdown
          const patternBreakdown = session.score_breakdown || session.scoreBreakdown
          if (patternBreakdown) {
            const understanding =
              patternBreakdown.understanding || patternBreakdown.understandingScore || 0
            const problemSolving =
              patternBreakdown.problemSolving || patternBreakdown.problemSolvingScore || 0
            const codeQuality =
              patternBreakdown.codeQuality || patternBreakdown.codeQualityScore || 0
            patternStats[pattern].totalTechnicalScore += calculateTechScoreFallback(
              understanding,
              problemSolving,
              codeQuality
            )
          } else {
            patternStats[pattern].totalTechnicalScore += session.performance_score
          }
        }
      }

      // Difficulty stats
      const difficulty = session.difficulty || "medium"
      if (!difficultyStats[difficulty]) {
        difficultyStats[difficulty] = {
          sessions: 0,
          totalScore: 0,
          totalTechnicalScore: 0,
          averageScore: 0,
          averageTechnicalScore: 0,
        }
      }
      difficultyStats[difficulty].sessions++
      if (session.performance_score !== undefined) {
        difficultyStats[difficulty].totalScore += session.performance_score

        // Technical score = Mastery score for difficulty
        if (session.technical_score !== undefined) {
          difficultyStats[difficulty].totalTechnicalScore += session.technical_score
        } else if (session.mastery_score !== undefined) {
          difficultyStats[difficulty].totalTechnicalScore += session.mastery_score
        } else {
          // Fallback: calculate from breakdown
          const diffBreakdown = session.score_breakdown || session.scoreBreakdown
          if (diffBreakdown) {
            const understanding =
              diffBreakdown.understanding || diffBreakdown.understandingScore || 0
            const problemSolving =
              diffBreakdown.problemSolving || diffBreakdown.problemSolvingScore || 0
            const codeQuality = diffBreakdown.codeQuality || diffBreakdown.codeQualityScore || 0
            difficultyStats[difficulty].totalTechnicalScore += calculateTechScoreFallback(
              understanding,
              problemSolving,
              codeQuality
            )
          } else {
            difficultyStats[difficulty].totalTechnicalScore += session.performance_score
          }
        }
      }
    }

    // Calculate averages
    for (const pattern of Object.keys(patternStats)) {
      const p = patternStats[pattern]
      p.averageScore = p.sessions > 0 ? Math.round(p.totalScore / p.sessions) : 0
      p.averageTechnicalScore = p.sessions > 0 ? Math.round(p.totalTechnicalScore / p.sessions) : 0
    }
    for (const diff of Object.keys(difficultyStats)) {
      const d = difficultyStats[diff]
      d.averageScore = d.sessions > 0 ? Math.round(d.totalScore / d.sessions) : 0
      d.averageTechnicalScore = d.sessions > 0 ? Math.round(d.totalTechnicalScore / d.sessions) : 0
    }

    return {
      totalSessions: sessions.length,
      totalPracticeMinutes,
      averageScore: scoredSessions > 0 ? Math.round(totalScore / scoredSessions) : 0,
      averageTechnicalScore:
        scoredSessions > 0 ? Math.round(totalTechnicalScore / scoredSessions) : 0,
      patternStats,
      difficultyStats,
      lastSessionAt,
    }
  } catch (error) {
    logger.error("[User Metrics API] Fallback stats error", { error })
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Get time range from query params
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get("days") || "30", 10)

    // Fetch all metrics in parallel
    const [stats, recentSessions, trends, usageSummary, masteryStats, scoreStats] =
      await Promise.all([
        getUserStats(userId),
        getRecentSessions(userId, 10),
        getPerformanceTrends(userId, days),
        getUserUsageSummary(userId),
        getMasteryStatistics(userId).catch(() => ({
          total: 0,
          new: 0,
          learning: 0,
          reviewing: 0,
          mastered: 0,
        })),
        getUserScoreStats(userId).catch(() => null),
      ])

    // Fallback: if user_stats is empty, try to get stats from interview_sessions directly
    let finalStats = stats
    if (!stats || stats.totalSessions === 0) {
      const fallbackStats = await getStatsFromInterviewSessions(userId)
      if (fallbackStats && fallbackStats.totalSessions > 0) {
        finalStats = fallbackStats
      }
    }

    // Calculate technical score from recent sessions
    // Technical score = Mastery score (objective: tests, time, independence)
    // Priority: masteryScore > technicalScore > fallback from breakdown
    let technicalScoreOverride: number | null = null
    const patternTechnicalScores: Record<string, number> = {}
    const difficultyTechnicalScores: Record<string, number> = {}

    if (recentSessions.length > 0) {
      // Helper to get technical score from a session
      // Prefers mastery score, falls back to breakdown calculation
      const getTechScore = (session: (typeof recentSessions)[0]): number | null => {
        // First priority: mastery score (if available on session)
        if ((session as any).masteryScore !== undefined) {
          return (session as any).masteryScore
        }
        // Second: technical score (which is now mastery-based)
        if ((session as any).technicalScore !== undefined) {
          return (session as any).technicalScore
        }
        // Fallback: calculate from breakdown using deprecated method
        if (session.scoreBreakdown) {
          return calculateTechScoreFallback(
            session.scoreBreakdown.understandingScore || 0,
            session.scoreBreakdown.problemSolvingScore || 0,
            session.scoreBreakdown.codeQualityScore || 0
          )
        }
        return null
      }

      // Get tech scores for all sessions that have one
      const sessionsWithTechScore = recentSessions
        .map((s) => ({ session: s, techScore: getTechScore(s) }))
        .filter((x) => x.techScore !== null) as Array<{
        session: (typeof recentSessions)[0]
        techScore: number
      }>

      if (sessionsWithTechScore.length > 0) {
        // Calculate overall technical score
        technicalScoreOverride = Math.round(
          sessionsWithTechScore.reduce((sum, x) => sum + x.techScore, 0) /
            sessionsWithTechScore.length
        )

        // Calculate per-pattern technical scores
        const patternGroups: Record<string, number[]> = {}
        sessionsWithTechScore.forEach(({ session, techScore }) => {
          if (!patternGroups[session.pattern]) patternGroups[session.pattern] = []
          patternGroups[session.pattern].push(techScore)
        })
        for (const [pattern, scores] of Object.entries(patternGroups)) {
          patternTechnicalScores[pattern] = Math.round(
            scores.reduce((a, b) => a + b, 0) / scores.length
          )
        }

        // Calculate per-difficulty technical scores
        const diffGroups: Record<string, number[]> = {}
        sessionsWithTechScore.forEach(({ session, techScore }) => {
          if (!diffGroups[session.difficulty]) diffGroups[session.difficulty] = []
          diffGroups[session.difficulty].push(techScore)
        })
        for (const [diff, scores] of Object.entries(diffGroups)) {
          difficultyTechnicalScores[diff] = Math.round(
            scores.reduce((a, b) => a + b, 0) / scores.length
          )
        }
      }
    }

    // Build response
    const response = {
      success: true,
      data: {
        overview: {
          totalSessions: finalStats?.totalSessions || 0,
          totalPracticeMinutes: finalStats?.totalPracticeMinutes || 0,
          totalPracticeHours: Math.round((finalStats?.totalPracticeMinutes || 0) / 6) / 10, // 1 decimal place
          averageScore: finalStats?.averageScore || 0, // Overall score (includes communication 30%)
          averageTechnicalScore:
            technicalScoreOverride ?? // Use calculated technical score from breakdowns
            (finalStats as any)?.averageTechnicalScore ??
            finalStats?.averageScore ??
            0, // Code-focused score (excludes communication)
          lastSessionAt: finalStats?.lastSessionAt || null,
        },
        patterns: Object.entries(finalStats?.patternStats || {})
          .map(([pattern, data]) => {
            const techScore =
              patternTechnicalScores[pattern] ?? // Use calculated from breakdowns
              (data as any).averageTechnicalScore ??
              data.averageScore
            return {
              pattern,
              displayName: formatPatternName(pattern),
              sessions: data.sessions,
              averageScore: data.averageScore, // Overall score
              averageTechnicalScore: techScore, // Code-focused score from breakdowns
              bestScore: data.bestScore,
              proficiency: getProficiencyLevel(techScore), // Base proficiency on technical score
            }
          })
          .sort((a, b) => b.sessions - a.sessions),
        difficulty: Object.entries(finalStats?.difficultyStats || {}).map(([difficulty, data]) => ({
          difficulty,
          sessions: data.sessions,
          averageScore: data.averageScore,
          averageTechnicalScore:
            difficultyTechnicalScores[difficulty] ??
            (data as any).averageTechnicalScore ??
            data.averageScore,
        })),
        trends: {
          daily: trends.daily,
          weeklyAverage: trends.weeklyAverage,
          trend: trends.trend,
          trendDescription: getTrendDescription(trends.trend),
        },
        recentSessions: recentSessions.map((session) => ({
          id: session.sessionId,
          scenarioId: session.scenarioId,
          pattern: session.pattern,
          difficulty: session.difficulty,
          performanceScore: session.performanceScore,
          durationMinutes: session.durationMinutes,
          completedAt: session.completedAt,
          feedback: session.feedback?.level || "average",
          scoreBreakdown: session.scoreBreakdown
            ? {
                codeQuality: session.scoreBreakdown.codeQualityScore,
                problemSolving: session.scoreBreakdown.problemSolvingScore,
                understanding: session.scoreBreakdown.understandingScore,
                communication: session.scoreBreakdown.communicationScore,
              }
            : null,
        })),
        // Aggregate score breakdown from recent sessions
        scoreBreakdown:
          recentSessions.length > 0
            ? (() => {
                const sessionsWithBreakdown = recentSessions.filter((s) => s.scoreBreakdown)
                if (sessionsWithBreakdown.length === 0) return null

                const avg = (arr: number[]) =>
                  arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
                return {
                  codeQuality: avg(
                    sessionsWithBreakdown.map((s) => s.scoreBreakdown?.codeQualityScore || 0)
                  ),
                  problemSolving: avg(
                    sessionsWithBreakdown.map((s) => s.scoreBreakdown?.problemSolvingScore || 0)
                  ),
                  understanding: avg(
                    sessionsWithBreakdown.map((s) => s.scoreBreakdown?.understandingScore || 0)
                  ),
                  communication: avg(
                    sessionsWithBreakdown.map((s) => s.scoreBreakdown?.communicationScore || 0)
                  ),
                }
              })()
            : null,
        usage: usageSummary
          ? {
              totalCost: usageSummary.totalCost,
              totalRequests: usageSummary.totalRequests,
              budgetUsedPercent: usageSummary.budgetUsedPercent,
              budgetRemaining: usageSummary.budgetRemaining,
            }
          : null,
        // Mastery statistics for spaced repetition progress
        mastery: {
          total: masteryStats.total,
          mastered: masteryStats.mastered,
          reviewing: masteryStats.reviewing,
          learning: masteryStats.learning,
          new: masteryStats.new,
          // Mastery percentage (mastered / total practiced)
          masteryRate:
            masteryStats.total > 0
              ? Math.round((masteryStats.mastered / masteryStats.total) * 100)
              : 0,
        },
        // Averages from scoring system (if available)
        averages: scoreStats
          ? {
              overall: scoreStats.averageOverallScore,
              technical: scoreStats.averageTechnicalScore,
              mastery: scoreStats.averageMasteryScore,
            }
          : null,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error("[User Metrics API] Error", { error })
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 })
  }
}

// Helper functions
function formatPatternName(pattern: string): string {
  const names: Record<string, string> = {
    "arrays-hashing": "Arrays & Hashing",
    "two-pointers": "Two Pointers",
    "sliding-window": "Sliding Window",
    stack: "Stack",
    "binary-search": "Binary Search",
    "linked-list": "Linked List",
    trees: "Trees",
    heap: "Heap / Priority Queue",
    backtracking: "Backtracking",
    graphs: "Graphs",
    "dp-1d": "1D Dynamic Programming",
    "dp-2d": "2D Dynamic Programming",
    greedy: "Greedy",
    intervals: "Intervals",
    "bit-manipulation": "Bit Manipulation",
    trie: "Trie",
    "union-find": "Union Find",
    "advanced-graphs": "Advanced Graphs",
    "math-geometry": "Math & Geometry",
  }
  return (
    names[pattern] ||
    pattern
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  )
}

function getProficiencyLevel(
  score: number
): "novice" | "learning" | "practicing" | "proficient" | "expert" {
  if (score >= 90) return "expert"
  if (score >= 75) return "proficient"
  if (score >= 55) return "practicing"
  if (score >= 35) return "learning"
  return "novice"
}

function getTrendDescription(trend: "improving" | "stable" | "declining"): string {
  switch (trend) {
    case "improving":
      return "You're making great progress! Keep up the momentum."
    case "stable":
      return "Consistent performance. Try tackling harder problems to level up."
    case "declining":
      return "Your scores have dipped. Consider reviewing fundamentals."
  }
}
