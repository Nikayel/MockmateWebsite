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
import { getMisconceptionTracker } from "@/lib/rag/misconception-detection"
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
    const tracker = getMisconceptionTracker(userId)
    const allMisconceptions = await tracker.getAll()

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
 */
async function getRecentSessionsForUser(userId: string) {
  try {
    const sessionsSnap = await adminDb
      .collection("sessions")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .limit(10)
      .get()

    return sessionsSnap.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        problemId: data.problemId,
        problemTitle: data.problemTitle,
        pattern: data.pattern,
        difficulty: data.difficulty,
        performance: data.performance,
        duration: data.duration,
        completed: data.completed,
        timestamp: data.timestamp?.toDate?.() || data.timestamp,
      }
    })
  } catch (error) {
    logger.error("Error fetching recent sessions for admin", { error, userId })
    return []
  }
}

/**
 * Get learning state for a user
 */
async function getLearningStateForUser(userId: string) {
  try {
    const learningDoc = await adminDb.collection("user_learning_state").doc(userId).get()

    if (!learningDoc.exists) {
      return null
    }

    const data = learningDoc.data()
    return {
      currentPattern: data?.currentPattern,
      patternsCompleted: data?.patternsCompleted || [],
      totalProblemsAttempted: data?.totalProblemsAttempted || 0,
      totalProblemsSolved: data?.totalProblemsSolved || 0,
      averagePerformance: data?.averagePerformance || 0,
      studyStreak: data?.studyStreak || 0,
      lastActive: data?.lastActive?.toDate?.() || data?.lastActive,
      patternProgress: data?.patternProgress || {},
    }
  } catch (error) {
    logger.error("Error fetching learning state for admin", { error, userId })
    return null
  }
}
