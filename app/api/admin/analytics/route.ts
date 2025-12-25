import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase-admin"
import {
  getFirebaseAnalyticsOverview,
  getFirebaseAnalyticsEvents,
  getFirebaseAnalyticsAcquisition,
  getFirebaseAnalyticsConversions,
} from "@/lib/firebase-analytics-admin"

// Admin user IDs (should match admin/usage route)
const ADMIN_USER_IDS = [
  process.env.ADMIN_USER_ID,
].filter((id): id is string => Boolean(id))

/**
 * Verify admin access using Firebase Auth token
 */
async function verifyAdminAccess(request: NextRequest): Promise<{ authorized: boolean; userId?: string }> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false }
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the Firebase ID token
    if (!adminAuth) {
      return { authorized: false }
    }

    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // SECURITY: Only trust hardcoded admin list from environment variables
    // Never read admin status from user-writable Firestore fields
    if (ADMIN_USER_IDS.includes(userId)) {
      return { authorized: true, userId }
    }

    return { authorized: false }
  } catch (error) {
    // Token verification failed
    return { authorized: false }
  }
}

/**
 * Admin Analytics API
 * Returns aggregate metrics for admin dashboard
 *
 * Requires admin authentication via Firebase ID token
 */

export async function GET(request: NextRequest) {
  try {
    // Verify Admin SDK is initialized
    if (!adminDb) {
      return NextResponse.json(
        {
          success: false,
          error: "Firebase Admin SDK not initialized. Check server configuration."
        },
        { status: 500 }
      )
    }

    // Verify admin access
    const auth = await verifyAdminAccess(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get("timeRange") || "7d" // 7d, 30d, 90d, all

    // Calculate date range
    const now = new Date()
    let startDate: Date | null = null

    switch (timeRange) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = null
    }

    // Fetch all users
    let profilesSnapshot
    try {
      profilesSnapshot = await adminDb.collection("profiles").get()
    } catch (error) {
      console.error("Error fetching profiles:", error)
      profilesSnapshot = { size: 0, docs: [] } as any
    }
    const totalUsers = profilesSnapshot.size || 0

    // Count by subscription tier
    const tierCounts = {
      free: 0,
      pro: 0,
      enterprise: 0,
    }

    if (profilesSnapshot.docs) {
      profilesSnapshot.docs.forEach((doc: any) => {
        const profile = doc.data()
        const tier = profile.subscription_tier || "free"
        if (tier in tierCounts) {
          tierCounts[tier as keyof typeof tierCounts]++
        }
      })
    }

    // Fetch sessions (with time range filter if applicable)
    let sessionsSnapshot
    try {
      if (startDate) {
        sessionsSnapshot = await adminDb
          .collection("interview_sessions")
          .where("started_at", ">=", startDate.toISOString())
          .get()
      } else {
        sessionsSnapshot = await adminDb.collection("interview_sessions").get()
      }
    } catch (error) {
      console.error("Error fetching sessions:", error)
      sessionsSnapshot = { size: 0, docs: [] } as any
    }

    const totalSessions = sessionsSnapshot.size || 0
    let completedSessions = 0
    let totalPerformanceScore = 0
    let sessionsWithScore = 0

    const sessionsByType: Record<string, number> = {}
    const sessionsByDifficulty: Record<string, number> = {}

    if (sessionsSnapshot.docs) {
      sessionsSnapshot.docs.forEach((doc: any) => {
        const session = doc.data()

        if (session.completed_at) {
          completedSessions++
        }

        if (session.performance_score !== undefined) {
          totalPerformanceScore += session.performance_score
          sessionsWithScore++
        }

        // Count by type
        const type = session.type || "unknown"
        sessionsByType[type] = (sessionsByType[type] || 0) + 1

        // Count by difficulty
        const difficulty = session.difficulty || "unknown"
        sessionsByDifficulty[difficulty] = (sessionsByDifficulty[difficulty] || 0) + 1
      })
    }

    const avgPerformanceScore = sessionsWithScore > 0
      ? Math.round(totalPerformanceScore / sessionsWithScore)
      : 0

    // Fetch analytics events
    let eventsSnapshot
    try {
      if (startDate) {
        eventsSnapshot = await adminDb
          .collection("analytics_events")
          .where("timestamp", ">=", startDate.toISOString())
          .get()
      } else {
        eventsSnapshot = await adminDb.collection("analytics_events").get()
      }
    } catch (error) {
      console.error("Error fetching analytics events:", error)
      eventsSnapshot = { size: 0, docs: [] } as any
    }

    const eventCounts: Record<string, number> = {}
    let totalCodeExecutions = 0
    let passedCodeExecutions = 0

    if (eventsSnapshot.docs) {
      eventsSnapshot.docs.forEach((doc: any) => {
        const event = doc.data()
        const eventName = event.event_name || "unknown"
        eventCounts[eventName] = (eventCounts[eventName] || 0) + 1

        if (eventName === "code_execution") {
          totalCodeExecutions++
          if (event.properties?.passed) {
            passedCodeExecutions++
          }
        }
      })
    }

    const codeExecutionPassRate = totalCodeExecutions > 0
      ? Math.round((passedCodeExecutions / totalCodeExecutions) * 100)
      : 0

    // Calculate revenue metrics (assuming $25 for Pro)
    const mrr = tierCounts.pro * 25 // Monthly Recurring Revenue

    // Fetch recent errors (last 100) - handle potential index error gracefully
    let recentErrors: Array<{
      timestamp: string
      errorType?: string
      errorMessage?: string
      page?: string
      userId?: string
    }> = []

    try {
      const errorsSnapshot = await adminDb
        .collection("analytics_events")
        .where("event_name", "==", "error")
        .orderBy("timestamp", "desc")
        .limit(100)
        .get()

      recentErrors = errorsSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          timestamp: data.timestamp,
          errorType: data.properties?.errorType,
          errorMessage: data.properties?.errorMessage,
          page: data.properties?.page,
          userId: data.properties?.userId,
        }
      })
    } catch (error) {
      console.error("Error fetching errors (may need composite index):", error)
      // Try without orderBy as fallback
      try {
        const errorsSnapshot = await adminDb
          .collection("analytics_events")
          .where("event_name", "==", "error")
          .limit(100)
          .get()

        recentErrors = errorsSnapshot.docs
          .map(doc => {
            const data = doc.data()
            return {
              timestamp: data.timestamp,
              errorType: data.properties?.errorType,
              errorMessage: data.properties?.errorMessage,
              page: data.properties?.page,
              userId: data.properties?.userId,
            }
          })
          .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""))
          .slice(0, 100)
      } catch (fallbackError) {
        console.error("Error fetching errors (fallback):", fallbackError)
      }
    }

    // Fetch Firebase Analytics data (if configured)
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365
    const firebaseAnalytics = await getFirebaseAnalyticsOverview(days)
    const firebaseEvents = await getFirebaseAnalyticsEvents(
      ["sign_up", "login", "session_start", "session_complete", "purchase", "code_execution", "ai_interaction"],
      days
    )
    const firebaseAcquisition = await getFirebaseAnalyticsAcquisition(days)
    const firebaseConversions = await getFirebaseAnalyticsConversions(days)

    return NextResponse.json({
      success: true,
      timeRange,
      metrics: {
        users: {
          total: totalUsers,
          byTier: tierCounts,
        },
        sessions: {
          total: totalSessions,
          completed: completedSessions,
          inProgress: totalSessions - completedSessions,
          avgPerformanceScore,
          byType: sessionsByType,
          byDifficulty: sessionsByDifficulty,
        },
        revenue: {
          mrr,
          arr: mrr * 12, // Annual Recurring Revenue
        },
        analytics: {
          totalEvents: eventsSnapshot.size || 0,
          byEventType: eventCounts,
          codeExecutions: {
            total: totalCodeExecutions,
            passed: passedCodeExecutions,
            passRate: codeExecutionPassRate,
          },
        },
        errors: {
          total: recentErrors.length,
          recent: recentErrors,
        },
        // Firebase Analytics data (if available)
        firebaseAnalytics: firebaseAnalytics ? {
          activeUsers: firebaseAnalytics.activeUsers,
          newUsers: firebaseAnalytics.newUsers,
          pageViews: firebaseAnalytics.pageViews,
          sessions: firebaseAnalytics.sessions,
          avgSessionDuration: firebaseAnalytics.avgSessionDuration,
          bounceRate: firebaseAnalytics.bounceRate,
          engagementRate: firebaseAnalytics.engagementRate,
          eventsByType: firebaseAnalytics.eventsByType,
          acquisition: firebaseAcquisition || [],
          conversions: firebaseConversions || {},
        } : null,
      },
    })
  } catch (error) {
    console.error("Admin analytics API error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch analytics"
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error("Error details:", { errorMessage, errorStack })
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorStack : undefined
      },
      { status: 500 }
    )
  }
}
