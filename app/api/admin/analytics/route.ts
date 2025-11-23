import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, limit as firestoreLimit, Timestamp } from "firebase/firestore"

/**
 * Admin Analytics API
 * Returns aggregate metrics for admin dashboard
 *
 * IMPORTANT: In production, add authentication middleware to verify admin access
 */

export async function GET(request: NextRequest) {
  try {
    // TODO: Add admin authentication check
    // const isAdmin = await verifyAdminAccess(request)
    // if (!isAdmin) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    // }

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
    const profilesSnapshot = await getDocs(collection(db, "profiles"))
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
      tierCounts[tier as keyof typeof tierCounts]++
    })

    // Fetch sessions (with time range filter if applicable)
    let sessionsQuery = query(collection(db, "interview_sessions"))
    if (startDate) {
      sessionsQuery = query(
        sessionsQuery,
        where("started_at", ">=", startDate.toISOString())
      )
    }
    const sessionsSnapshot = await getDocs(sessionsQuery)

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
    let eventsQuery = query(collection(db, "analytics_events"))
    if (startDate) {
      eventsQuery = query(
        eventsQuery,
        where("timestamp", ">=", startDate.toISOString())
      )
    }
    const eventsSnapshot = await getDocs(eventsQuery)

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
    const errorsQuery = query(
      collection(db, "analytics_events"),
      where("event_name", "==", "error"),
      orderBy("timestamp", "desc"),
      firestoreLimit(100)
    )
    const errorsSnapshot = await getDocs(errorsQuery)
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
