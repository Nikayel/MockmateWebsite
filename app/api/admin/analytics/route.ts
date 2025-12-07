import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/admin-auth"

/**
 * Admin Analytics API
 * Returns aggregate metrics for admin dashboard
 * Requires admin authentication
 */

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await verifyAdminAccess(request)
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      )
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

    // Fetch all users using Admin SDK
    const profilesSnapshot = await adminDb.collection("profiles").get()
    const totalUsers = profilesSnapshot.size

    // Count by subscription tier
    const tierCounts = {
      free: 0,
      pro: 0,
      enterprise: 0,
    }

    profilesSnapshot.forEach((doc) => {
      const profile = doc.data()
      const tier = profile.subscription_tier || "free"
      if (tier in tierCounts) {
        tierCounts[tier as keyof typeof tierCounts]++
      }
    })

    // Fetch sessions (with time range filter if applicable)
    let sessionsQuery: FirebaseFirestore.Query = adminDb.collection("interview_sessions")
    if (startDate) {
      sessionsQuery = sessionsQuery.where("started_at", ">=", startDate.toISOString())
    }
    const sessionsSnapshot = await sessionsQuery.get()

    const totalSessions = sessionsSnapshot.size
    let completedSessions = 0
    let totalPerformanceScore = 0
    let sessionsWithScore = 0

    const sessionsByType: Record<string, number> = {}
    const sessionsByDifficulty: Record<string, number> = {}

    sessionsSnapshot.forEach((doc) => {
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

    const avgPerformanceScore = sessionsWithScore > 0
      ? Math.round(totalPerformanceScore / sessionsWithScore)
      : 0

    // Fetch analytics events
    let eventsQuery: FirebaseFirestore.Query = adminDb.collection("analytics_events")
    if (startDate) {
      eventsQuery = eventsQuery.where("timestamp", ">=", startDate.toISOString())
    }
    const eventsSnapshot = await eventsQuery.get()

    const eventCounts: Record<string, number> = {}
    let totalCodeExecutions = 0
    let passedCodeExecutions = 0

    eventsSnapshot.forEach((doc) => {
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

    const codeExecutionPassRate = totalCodeExecutions > 0
      ? Math.round((passedCodeExecutions / totalCodeExecutions) * 100)
      : 0

    // Calculate revenue metrics (assuming $25 for Pro)
    const mrr = tierCounts.pro * 25 // Monthly Recurring Revenue

    // Fetch recent errors (last 100)
    const errorsSnapshot = await adminDb
      .collection("analytics_events")
      .where("event_name", "==", "error")
      .orderBy("timestamp", "desc")
      .limit(100)
      .get()

    const recentErrors = errorsSnapshot.docs.map(doc => ({
      timestamp: doc.data().timestamp,
      errorType: doc.data().properties?.errorType,
      errorMessage: doc.data().properties?.errorMessage,
      page: doc.data().properties?.page,
      userId: doc.data().properties?.userId,
    }))

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
          totalEvents: eventsSnapshot.size,
          byEventType: eventCounts,
          codeExecutions: {
            total: totalCodeExecutions,
            passed: passedCodeExecutions,
            passRate: codeExecutionPassRate,
          },
        },
        errors: {
          total: errorsSnapshot.size,
          recent: recentErrors,
        },
      },
    })
  } catch (error) {
    console.error("Admin analytics API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}
