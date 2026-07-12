/**
 * Admin User Profile API
 *
 * GET: View detailed enhanced profile for any user
 * Includes cognitive profile, skill insights, misconceptions, and learning data
 */

import { NextRequest, NextResponse } from "next/server"
import {
  verifyAdminAccess,
  successResponse,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/admin/middleware"
import { logAdminAction } from "@/lib/admin/audit"
import {
  getEnhancedUserProfile,
  getUserInsights,
  getInterviewReadiness,
  getAccurateBehavioralProfile,
  getUserDataQuality,
} from "@/lib/rag/enhanced-user-profile"
import { adminDb, adminAuth } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"
import { DEFAULT_TIMEZONE } from "@/lib/email/timezone"
import { reconcileStreak } from "@/lib/spaced-repetition/streak"
import type { Profile } from "@/lib/types"

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

    // Verify user exists (Firebase Auth has all users; profiles may be missing for GitHub-only)
    const [profileDoc, authUser] = await Promise.all([
      adminDb.collection("profiles").doc(userId).get(),
      adminAuth.getUser(userId).catch(() => null),
    ])

    if (!authUser) {
      return errorResponse("User not found", 404)
    }

    const profileData = profileDoc.exists ? profileDoc.data() : null
    const email = profileData?.email || authUser.email || ""
    const fullName = profileData?.full_name || authUser.displayName || ""
    const createdAt =
      profileData?.created_at || authUser.metadata?.creationTime || new Date().toISOString()

    // Auth-only users (no profile): still fetch sessions & learning state (they may have activity)
    if (!profileDoc.exists) {
      const [recentSessions, learningState] = await Promise.all([
        getRecentSessionsForUser(userId),
        getLearningStateForUser(userId),
      ])

      await logAdminAction(adminId, "view_user_profile", {
        targetUserId: userId,
        targetEmail: email,
      })
      return successResponse({
        user: {
          id: userId,
          email,
          fullName,
          subscriptionTier: "free",
          subscriptionStatus: "none",
          createdAt,
          onboardingCompleted: false,
          authOnly: true,
        },
        enhancedProfile: null,
        insights: [],
        interviewReadiness: null,
        misconceptions: {
          total: 0,
          resolved: 0,
          active: 0,
          totalOccurrences: 0,
          byPattern: {},
          byType: {},
          topMisconceptions: [],
        },
        recentSessions,
        learningState,
        accurateBehavior: {
          dataQuality: "insufficient",
          sessionsAnalyzed: 0,
          missingDataPoints: [],
          planning: null,
          debugging: null,
          helpSeeking: null,
          persistence: null,
          learningVelocity: null,
          temporalPerformance: null,
          strengths: [],
          areasForImprovement: [],
          recommendations: [],
        },
      })
    }

    // Fetch all enhanced profile data in parallel (user has profile)
    const [
      enhancedProfile,
      insights,
      interviewReadiness,
      misconceptionData,
      accurateBehavior,
      dataQuality,
    ] = await Promise.all([
      getEnhancedUserProfile(userId),
      getUserInsights(userId),
      getInterviewReadiness(userId),
      getMisconceptionsSummary(userId),
      getAccurateBehavioralProfile(userId), // NEW: Production-grade behavioral analysis
      getUserDataQuality(userId), // NEW: Data quality assessment
    ])

    // Get recent session activity
    const recentSessions = await getRecentSessionsForUser(userId)

    // Get learning state
    const learningState = await getLearningStateForUser(userId)

    // Log admin action for audit
    await logAdminAction(adminId, "view_user_profile", {
      targetUserId: userId,
      targetEmail: profileData?.email,
    })

    return successResponse({
      user: {
        id: userId,
        email: profileData?.email || "",
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
      // NEW: Production-grade behavioral analysis
      accurateBehavior: {
        dataQuality: dataQuality.quality,
        sessionsAnalyzed: dataQuality.sessionsCount,
        missingDataPoints: dataQuality.missingDataPoints,
        planning: accurateBehavior.planning,
        debugging: accurateBehavior.debugging,
        helpSeeking: accurateBehavior.helpSeeking,
        persistence: accurateBehavior.persistence,
        learningVelocity: accurateBehavior.learningVelocity,
        temporalPerformance: accurateBehavior.temporalPerformance,
        strengths: accurateBehavior.strengths,
        areasForImprovement: accurateBehavior.areasForImprovement,
        recommendations: accurateBehavior.recommendations,
      },
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
      .collection("user_misconceptions")
      .where("userId", "==", userId)
      .get()

    const allMisconceptions = misconceptionsSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        type: data.misconceptionType || data.type,
        pattern: data.pattern,
        occurrences: data.frequency || data.occurrences || 1,
        resolved: data.status === "resolved",
        firstSeen: data.createdAt?.toDate?.() || data.firstSeen?.toDate?.() || data.firstSeen,
        lastSeen: data.lastSeen?.toDate?.() || data.lastSeen,
      }
    })

    // Calculate summary stats
    const byPattern: Record<string, number> = {}
    const byType: Record<string, number> = {}
    let totalOccurrences = 0
    let resolvedCount = 0

    allMisconceptions.forEach((m) => {
      byPattern[m.pattern] = (byPattern[m.pattern] || 0) + m.occurrences
      byType[m.type] = (byType[m.type] || 0) + 1
      totalOccurrences += m.occurrences
      if (m.resolved) resolvedCount++
    })

    // Get top misconceptions (most frequent)
    const topMisconceptions = [...allMisconceptions]
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 5)
      .map((m) => ({
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
 * Primary source: interview_sessions collection (has authoritative scores)
 * Fallback: session_summaries subcollection (may have stale scores from old algorithms)
 */
async function getRecentSessionsForUser(userId: string) {
  try {
    // Primary: Use interview_sessions collection (source of truth for scores)
    const sessionsSnap = await adminDb
      .collection("interview_sessions")
      .where("user_id", "==", userId)
      .where("completed_at", "!=", null)
      .orderBy("completed_at", "desc")
      .limit(10)
      .get()

    if (sessionsSnap.docs.length > 0) {
      return sessionsSnap.docs.map((doc) => {
        const data = doc.data()
        const completedAt = data.completed_at?.toDate?.() || data.completed_at
        const startedAt = data.started_at?.toDate?.() || data.started_at
        return {
          id: doc.id,
          problemId: data.scenario_id || doc.id,
          problemTitle: data.topic || data.scenario_title || data.scenario_id,
          pattern: data.pattern,
          difficulty: data.difficulty,
          performance: data.performance_score, // Use snake_case field from interview_sessions
          duration:
            completedAt && startedAt
              ? Math.round(
                  (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000
                )
              : undefined,
          completed: true,
          timestamp: completedAt,
        }
      })
    }

    // Fallback: Try session_summaries subcollection (may have stale scores)
    const summariesSnap = await adminDb
      .collection("users")
      .doc(userId)
      .collection("session_summaries")
      .orderBy("completedAt", "desc")
      .limit(10)
      .get()

    if (summariesSnap.docs.length > 0) {
      return summariesSnap.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          problemId: data.scenarioId || doc.id,
          problemTitle: data.scenarioId,
          pattern: data.pattern,
          difficulty: data.difficulty,
          performance: data.performanceScore,
          duration: data.durationMinutes,
          completed: true,
          timestamp: data.completedAt,
        }
      })
    }

    // No sessions found in any collection
    return []
  } catch (error) {
    logger.error("Error fetching recent sessions for admin", { error, userId })
    return []
  }
}

/**
 * Get learning state for a user
 * Aggregates data from:
 * - user_learning_state: streak, topics, last activity
 * - problem_mastery: problem-level mastery (unified collection)
 * - user_stats: aggregate session stats (PRIMARY FALLBACK)
 * - users/{userId}/session_summaries: individual sessions (SECONDARY FALLBACK)
 */
async function getLearningStateForUser(userId: string) {
  try {
    // Fetch data from all relevant sources in parallel (including profile for timezone)
    const [learningDoc, statsDoc, masterySnap, sessionSummariesSnap, profileDoc] =
      await Promise.all([
        adminDb.collection("user_learning_state").doc(userId).get(),
        adminDb.collection("user_stats").doc(userId).get(),
        // Use problem_mastery (unified collection for SR + score tracking)
        adminDb.collection("problem_mastery").doc(userId).collection("problems").get(),
        // Also fetch session summaries as fallback for computing stats
        adminDb
          .collection("users")
          .doc(userId)
          .collection("session_summaries")
          .orderBy("completedAt", "desc")
          .limit(100)
          .get(),
        // Fetch profile for timezone-aware streak calculation
        adminDb.collection("profiles").doc(userId).get(),
      ])

    // Get user's timezone for accurate streak calculation
    const userTimezone = profileDoc.exists
      ? (profileDoc.data() as Profile).notification_preferences?.timezone || DEFAULT_TIMEZONE
      : DEFAULT_TIMEZONE

    const learningData = learningDoc.exists ? learningDoc.data() : null
    const statsData = statsDoc.exists ? statsDoc.data() : null
    const masteryDocs = masterySnap.docs
    const sessionDocs = sessionSummariesSnap.docs

    // Calculate pattern progress from problem mastery
    const patternProgress: Record<string, number> = {}
    const patternCounts: Record<string, { total: number; mastered: number }> = {}
    let totalSolved = 0
    let totalMasteryScore = 0

    masteryDocs.forEach((doc) => {
      const data = doc.data()
      const pattern = data.pattern || "unknown"

      if (!patternCounts[pattern]) {
        patternCounts[pattern] = { total: 0, mastered: 0 }
      }
      patternCounts[pattern].total++

      // Count as solved if mastery level is proficient or higher
      if (["proficient", "expert", "mastered", "reviewing"].includes(data.mastery_level)) {
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
      const patternSessions: Record<string, { count: number; totalScore: number; solved: number }> =
        {}

      sessionDocs.forEach((doc) => {
        const data = doc.data()
        const pattern = data.pattern || "unknown"
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
      const mostRecent = topicEntries.sort(
        (a: any, b: any) =>
          new Date(b[1].last_practiced_at || 0).getTime() -
          new Date(a[1].last_practiced_at || 0).getTime()
      )[0]
      currentPattern = (mostRecent[1] as any).pattern
    } else if (sessionDocs.length > 0) {
      // Fallback to most recent session
      currentPattern = sessionDocs[0].data().pattern || null
    }

    // Calculate total problems attempted - use multiple fallbacks
    const totalProblemsAttempted =
      masteryDocs.length > 0
        ? masteryDocs.length
        : sessionDocs.length > 0
          ? new Set(sessionDocs.map((d) => d.data().scenarioId)).size // Unique problems
          : statsData?.totalSessions || 0

    // Calculate average performance with fallbacks
    let averagePerformance = 0
    if (masteryDocs.length > 0 && totalMasteryScore > 0) {
      averagePerformance = Math.round(totalMasteryScore / masteryDocs.length)
    } else if (sessionDocs.length > 0) {
      const totalSessionScore = sessionDocs.reduce(
        (sum, doc) => sum + (doc.data().performanceScore || 0),
        0
      )
      averagePerformance = Math.round(totalSessionScore / sessionDocs.length)
    } else if (statsData?.averageScore) {
      averagePerformance = Math.round(statsData.averageScore)
    }

    // Calculate streak - reset at read time if it is stale due to inactivity.
    // reconcileStreak is the single source of truth for this timezone-aware
    // read-side reconciliation (a gap of more than one calendar day -> 0).
    const studyStreak = reconcileStreak(
      learningData?.streak_days,
      learningData?.last_session_at,
      userTimezone
    )

    return {
      currentPattern,
      patternsCompleted,
      totalProblemsAttempted,
      totalProblemsSolved:
        totalSolved || sessionDocs.filter((d) => (d.data().performanceScore || 0) >= 70).length,
      averagePerformance,
      studyStreak,
      lastActive:
        learningData?.last_session_at ||
        statsData?.lastSessionAt ||
        (sessionDocs.length > 0 ? sessionDocs[0].data().completedAt : null),
      patternProgress,
    }
  } catch (error) {
    logger.error("Error fetching learning state for admin", { error, userId })
    return null
  }
}
