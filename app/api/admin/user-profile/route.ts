/**
 * Admin User Profile API
 *
 * GET: View detailed enhanced profile for any user
 * Includes cognitive profile, skill insights, misconceptions, and learning data
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess, successResponse, unauthorizedResponse, errorResponse } from "@/lib/admin/middleware"
import { logAdminAction } from "@/lib/admin/audit"
import { getEnhancedUserProfile, getUserInsights, getInterviewReadiness } from "@/lib/rag/enhanced-user-profile"
import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request)
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error!, authResult.status || 401)
  }

  const adminId = authResult.context!.userId

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return errorResponse("userId query parameter is required", 400)
    }

    // Verify user exists
    const profileDoc = await adminDb.collection("profiles").doc(userId).get()
    if (!profileDoc.exists) {
      return errorResponse("User not found", 404)
    }

    const profileData = profileDoc.data()

    // Fetch all enhanced profile data in parallel
    const [enhancedProfile, insights, interviewReadiness, misconceptionData] = await Promise.all([
      getEnhancedUserProfile(userId),
      getUserInsights(userId),
      getInterviewReadiness(userId),
      getMisconceptionsSummary(userId),
    ])

    // Get recent session activity
    const recentSessions = await getRecentSessionsForUser(userId)

    // Get learning state
    const learningState = await getLearningStateForUser(userId)

    // Log admin action for audit
    await logAdminAction(adminId, 'view_user_profile', {
      targetUserId: userId,
      targetEmail: profileData?.email,
    })

    return successResponse({
      user: {
        id: userId,
        email: profileData?.email,
        fullName: profileData?.full_name,
        subscriptionTier: profileData?.subscription_tier,
        subscriptionStatus: profileData?.subscription_status,
        createdAt: profileData?.created_at,
        onboardingCompleted: profileData?.onboarding_completed,
      },
      enhancedProfile,
      insights,
      interviewReadiness,
      misconceptions: misconceptionData,
      recentSessions,
      learningState,
    })
  } catch (error: any) {
    logger.error("Error fetching user profile for admin", { error, adminId })
    return errorResponse(error.message || "Failed to fetch user profile", 500)
  }
}

/**
 * Get misconceptions summary for a user
 */
async function getMisconceptionsSummary(userId: string) {
  try {
    // Query all misconceptions for the user (both active and resolved)
    const misconceptionsSnapshot = await adminDb
      .collection('user_misconceptions')
      .where('userId', '==', userId)
      .get()

    const allMisconceptions = misconceptionsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        type: data.misconceptionType || data.type,
        pattern: data.pattern,
        occurrences: data.frequency || data.occurrences || 1,
        resolved: data.status === 'resolved',
        firstSeen: data.createdAt?.toDate?.() || data.firstSeen?.toDate?.() || data.firstSeen,
        lastSeen: data.lastSeen?.toDate?.() || data.lastSeen,
      }
    })

    // Calculate summary stats
    const byPattern: Record<string, number> = {}
    const byType: Record<string, number> = {}
    let totalOccurrences = 0
    let resolvedCount = 0

    allMisconceptions.forEach(m => {
      byPattern[m.pattern] = (byPattern[m.pattern] || 0) + m.occurrences
      byType[m.type] = (byType[m.type] || 0) + 1
      totalOccurrences += m.occurrences
      if (m.resolved) resolvedCount++
    })

    // Get top misconceptions (most frequent)
    const topMisconceptions = [...allMisconceptions]
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 5)
      .map(m => ({
        type: m.type,
        pattern: m.pattern,
        occurrences: m.occurrences,
        resolved: m.resolved,
        firstSeen: m.firstSeen?.toDate?.() || m.firstSeen,
        lastSeen: m.lastSeen?.toDate?.() || m.lastSeen,
      }))

    return {
      total: allMisconceptions.length,
      resolved: resolvedCount,
      active: allMisconceptions.length - resolvedCount,
      totalOccurrences,
      byPattern,
      byType,
      topMisconceptions,
    }
  } catch (error) {
    logger.error("Error fetching misconceptions for admin", { error, userId })
    return {
      total: 0,
      resolved: 0,
      active: 0,
      totalOccurrences: 0,
      byPattern: {},
      byType: {},
      topMisconceptions: [],
    }
  }
}

/**
 * Get recent sessions for a user
 * Queries from users/{userId}/session_summaries which is where session data is stored
 */
async function getRecentSessionsForUser(userId: string) {
  try {
    // First try the session_summaries subcollection (primary source)
    const summariesSnap = await adminDb
      .collection("users")
      .doc(userId)
      .collection("session_summaries")
      .orderBy("completedAt", "desc")
      .limit(10)
      .get()

    if (summariesSnap.docs.length > 0) {
      return summariesSnap.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          problemId: data.scenarioId || doc.id,
          problemTitle: data.scenarioId, // Title stored in scenario ID for summaries
          pattern: data.pattern,
          difficulty: data.difficulty,
          performance: data.performanceScore,
          duration: data.durationMinutes,
          completed: true,
          timestamp: data.completedAt,
        }
      })
    }

    // Fallback: Try session_metrics collection
    const metricsSnap = await adminDb
      .collection("session_metrics")
      .where("userId", "==", userId)
      .orderBy("startedAt", "desc")
      .limit(10)
      .get()

    return metricsSnap.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        problemId: data.scenarioId,
        problemTitle: data.scenarioTitle,
        pattern: data.pattern,
        difficulty: data.difficulty,
        performance: data.performanceScore,
        duration: data.completedAt ? Math.round(
          (new Date(data.completedAt).getTime() - new Date(data.startedAt).getTime()) / 60000
        ) : undefined,
        completed: !!data.completedAt,
        timestamp: data.completedAt || data.startedAt,
      }
    })
  } catch (error) {
    logger.error("Error fetching recent sessions for admin", { error, userId })
    return []
  }
}

/**
 * Get learning state for a user
 * Aggregates data from:
 * - user_learning_state: streak, topics, last activity
 * - user_problem_mastery: problem-level mastery
 * - user_stats: aggregate session stats (PRIMARY FALLBACK)
 * - users/{userId}/session_summaries: individual sessions (SECONDARY FALLBACK)
 */
async function getLearningStateForUser(userId: string) {
  try {
    // Fetch data from all relevant sources in parallel
    const [learningDoc, statsDoc, masterySnap, sessionSummariesSnap] = await Promise.all([
      adminDb.collection("user_learning_state").doc(userId).get(),
      adminDb.collection("user_stats").doc(userId).get(),
      adminDb.collection("user_problem_mastery").doc(userId).collection("problems").get(),
      // Also fetch session summaries as fallback for computing stats
      adminDb.collection("users").doc(userId).collection("session_summaries")
        .orderBy("completedAt", "desc").limit(100).get(),
    ])

    const learningData = learningDoc.exists ? learningDoc.data() : null
    const statsData = statsDoc.exists ? statsDoc.data() : null
    const masteryDocs = masterySnap.docs
    const sessionDocs = sessionSummariesSnap.docs

    // Calculate pattern progress from problem mastery
    const patternProgress: Record<string, number> = {}
    const patternCounts: Record<string, { total: number; mastered: number }> = {}
    let totalSolved = 0
    let totalMasteryScore = 0

    masteryDocs.forEach(doc => {
      const data = doc.data()
      const pattern = data.pattern || 'unknown'

      if (!patternCounts[pattern]) {
        patternCounts[pattern] = { total: 0, mastered: 0 }
      }
      patternCounts[pattern].total++

      // Count as solved if mastery level is proficient or higher
      if (['proficient', 'expert', 'mastered', 'reviewing'].includes(data.mastery_level)) {
        patternCounts[pattern].mastered++
        totalSolved++
      }

      if (data.average_score || data.last_score) {
        totalMasteryScore += data.average_score || data.last_score
      }
    })

    // Calculate pattern progress percentages
    Object.entries(patternCounts).forEach(([pattern, counts]) => {
      patternProgress[pattern] = Math.round((counts.mastered / counts.total) * 100)
    })

    // FALLBACK: If no mastery data, compute from session summaries
    if (masteryDocs.length === 0 && sessionDocs.length > 0) {
      const patternSessions: Record<string, { count: number; totalScore: number; solved: number }> = {}

      sessionDocs.forEach(doc => {
        const data = doc.data()
        const pattern = data.pattern || 'unknown'
        const score = data.performanceScore || 0

        if (!patternSessions[pattern]) {
          patternSessions[pattern] = { count: 0, totalScore: 0, solved: 0 }
        }
        patternSessions[pattern].count++
        patternSessions[pattern].totalScore += score
        if (score >= 70) {
          patternSessions[pattern].solved++
        }
      })

      Object.entries(patternSessions).forEach(([pattern, stats]) => {
        const avgScore = Math.round(stats.totalScore / stats.count)
        patternProgress[pattern] = avgScore
        patternCounts[pattern] = { total: stats.count, mastered: stats.solved }
        totalSolved += stats.solved
      })
    }

    // Get patterns that are "completed" (70%+ average score)
    const patternsCompleted = Object.entries(patternProgress)
      .filter(([, progress]) => progress >= 70)
      .map(([pattern]) => pattern)

    // Determine current pattern (most recent topic from learning state or session summaries)
    let currentPattern: string | null = null
    const topics = learningData?.topics || {}
    const topicEntries = Object.entries(topics)

    if (topicEntries.length > 0) {
      const mostRecent = topicEntries.sort((a: any, b: any) =>
        new Date(b[1].last_practiced_at || 0).getTime() - new Date(a[1].last_practiced_at || 0).getTime()
      )[0]
      currentPattern = (mostRecent[1] as any).pattern
    } else if (sessionDocs.length > 0) {
      // Fallback to most recent session
      currentPattern = sessionDocs[0].data().pattern || null
    }

    // Calculate total problems attempted - use multiple fallbacks
    const totalProblemsAttempted = masteryDocs.length > 0
      ? masteryDocs.length
      : sessionDocs.length > 0
        ? new Set(sessionDocs.map(d => d.data().scenarioId)).size  // Unique problems
        : statsData?.totalSessions || 0

    // Calculate average performance with fallbacks
    let averagePerformance = 0
    if (masteryDocs.length > 0 && totalMasteryScore > 0) {
      averagePerformance = Math.round(totalMasteryScore / masteryDocs.length)
    } else if (sessionDocs.length > 0) {
      const totalSessionScore = sessionDocs.reduce((sum, doc) => sum + (doc.data().performanceScore || 0), 0)
      averagePerformance = Math.round(totalSessionScore / sessionDocs.length)
    } else if (statsData?.averageScore) {
      averagePerformance = Math.round(statsData.averageScore)
    }

    // Calculate streak - check if it should be reset due to inactivity
    let studyStreak = learningData?.streak_days || 0
    if (learningData?.last_session_date) {
      const lastSessionDate = new Date(learningData.last_session_date)
      const today = new Date()
      const daysDiff = Math.floor((today.getTime() - lastSessionDate.getTime()) / (24 * 60 * 60 * 1000))

      // If more than 1 day since last session, streak is effectively 0 (needs new session to restart)
      if (daysDiff > 1) {
        studyStreak = 0
      }
    }

    return {
      currentPattern,
      patternsCompleted,
      totalProblemsAttempted,
      totalProblemsSolved: totalSolved || (sessionDocs.filter(d => (d.data().performanceScore || 0) >= 70).length),
      averagePerformance,
      studyStreak,
      lastActive: learningData?.last_session_at || statsData?.lastSessionAt ||
        (sessionDocs.length > 0 ? sessionDocs[0].data().completedAt : null),
      patternProgress,
    }
  } catch (error) {
    logger.error("Error fetching learning state for admin", { error, userId })
    return null
  }
}
