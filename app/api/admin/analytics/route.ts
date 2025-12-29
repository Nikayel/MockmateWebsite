import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import {
  getFirebaseAnalyticsOverview,
  getFirebaseAnalyticsEvents,
  getFirebaseAnalyticsAcquisition,
  getFirebaseAnalyticsConversions,
} from "@/lib/firebase-analytics-admin"
import { verifyAdminAccess, parseAdminQueryParams } from "@/lib/admin/middleware"
import { calculateMRR, calculateARR, getMonthlyPrice } from "@/lib/pricing"
import { adminCache, getCacheKey, CACHE_TTL } from "@/lib/admin/cache"
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfDay, startOfWeek, startOfMonth, parseISO } from "date-fns"

/**
 * Generate time-series data for charts
 */
async function generateTimeSeriesData(
  profilesSnapshot: FirebaseFirestore.QuerySnapshot | { docs: any[] },
  sessionsSnapshot: FirebaseFirestore.QuerySnapshot | { docs: any[] },
  startDate: Date | null,
  timeRange: string
): Promise<{
  users: Array<{ date: string; total: number; free: number; pro: number; enterprise: number }>
  sessions: Array<{ date: string; total: number; completed: number }>
  revenue: Array<{ date: string; mrr: number }>
}> {
  const now = new Date()
  const start = startDate || new Date(now.getFullYear() - 1, 0, 1)

  // Determine interval based on time range
  let intervals: Date[]
  let dateFormat: string
  let getIntervalStart: (date: Date) => Date

  if (timeRange === "7d") {
    intervals = eachDayOfInterval({ start, end: now })
    dateFormat = "MMM d"
    getIntervalStart = startOfDay
  } else if (timeRange === "30d") {
    intervals = eachDayOfInterval({ start, end: now })
    dateFormat = "MMM d"
    getIntervalStart = startOfDay
  } else if (timeRange === "90d") {
    intervals = eachWeekOfInterval({ start, end: now })
    dateFormat = "MMM d"
    getIntervalStart = startOfWeek
  } else {
    intervals = eachMonthOfInterval({ start, end: now })
    dateFormat = "MMM yyyy"
    getIntervalStart = startOfMonth
  }

  // Initialize data structures
  const usersByDate: Record<string, { total: number; free: number; pro: number; enterprise: number }> = {}
  const sessionsByDate: Record<string, { total: number; completed: number }> = {}

  // Initialize all intervals
  intervals.forEach((date) => {
    const key = format(date, "yyyy-MM-dd")
    usersByDate[key] = { total: 0, free: 0, pro: 0, enterprise: 0 }
    sessionsByDate[key] = { total: 0, completed: 0 }
  })

  // Process profiles for user growth
  if (profilesSnapshot.docs) {
    profilesSnapshot.docs.forEach((doc: any) => {
      const profile = doc.data()
      const createdAt = profile.created_at || profile.createdAt

      if (createdAt) {
        try {
          const date = typeof createdAt === "string"
            ? parseISO(createdAt)
            : createdAt.toDate?.() || new Date(createdAt)

          const intervalStart = getIntervalStart(date)
          const key = format(intervalStart, "yyyy-MM-dd")

          if (usersByDate[key]) {
            usersByDate[key].total++
            const tier = profile.subscription_tier || "free"
            if (tier === "pro") usersByDate[key].pro++
            else if (tier === "enterprise") usersByDate[key].enterprise++
            else usersByDate[key].free++
          }
        } catch {
          // Skip invalid dates
        }
      }
    })
  }

  // Process sessions
  if (sessionsSnapshot.docs) {
    sessionsSnapshot.docs.forEach((doc: any) => {
      const session = doc.data()
      const startedAt = session.started_at

      if (startedAt) {
        try {
          const date = typeof startedAt === "string"
            ? parseISO(startedAt)
            : startedAt.toDate?.() || new Date(startedAt)

          const intervalStart = getIntervalStart(date)
          const key = format(intervalStart, "yyyy-MM-dd")

          if (sessionsByDate[key]) {
            sessionsByDate[key].total++
            if (session.completed_at) {
              sessionsByDate[key].completed++
            }
          }
        } catch {
          // Skip invalid dates
        }
      }
    })
  }

  // Convert to arrays with cumulative counts for users
  let cumulativeUsers = { total: 0, free: 0, pro: 0, enterprise: 0 }
  const users = intervals.map((date) => {
    const key = format(date, "yyyy-MM-dd")
    const data = usersByDate[key] || { total: 0, free: 0, pro: 0, enterprise: 0 }

    cumulativeUsers.total += data.total
    cumulativeUsers.free += data.free
    cumulativeUsers.pro += data.pro
    cumulativeUsers.enterprise += data.enterprise

    return {
      date: format(date, dateFormat),
      total: cumulativeUsers.total,
      free: cumulativeUsers.free,
      pro: cumulativeUsers.pro,
      enterprise: cumulativeUsers.enterprise,
    }
  })

  // Sessions are not cumulative
  const sessions = intervals.map((date) => {
    const key = format(date, "yyyy-MM-dd")
    const data = sessionsByDate[key] || { total: 0, completed: 0 }
    return {
      date: format(date, dateFormat),
      total: data.total,
      completed: data.completed,
    }
  })

  // Calculate revenue based on cumulative pro/enterprise users
  const revenue = users.map((u) => ({
    date: u.date,
    mrr: u.pro * getMonthlyPrice("pro") + u.enterprise * getMonthlyPrice("enterprise"),
  }))

  return { users, sessions, revenue }
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

    // Verify admin access using RBAC middleware
    const authResult = await verifyAdminAccess(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 403 }
      )
    }

    // Parse query params using middleware helper
    const { timeRange, startDate } = parseAdminQueryParams(request)

    // Check cache first
    const cacheKey = getCacheKey('analytics', { timeRange })
    const cachedResponse = adminCache.get<any>(cacheKey)
    if (cachedResponse) {
      return NextResponse.json({
        ...cachedResponse,
        cached: true,
      })
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

    // Calculate revenue metrics using centralized pricing
    const mrr = calculateMRR(tierCounts)

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

    // Generate time-series data for charts
    const timeSeries = await generateTimeSeriesData(
      profilesSnapshot,
      sessionsSnapshot,
      startDate,
      timeRange
    )

    // Fetch Firebase Analytics data (if configured)
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365
    const firebaseAnalytics = await getFirebaseAnalyticsOverview(days)
    const firebaseEvents = await getFirebaseAnalyticsEvents(
      ["sign_up", "login", "session_start", "session_complete", "purchase", "code_execution", "ai_interaction"],
      days
    )
    const firebaseAcquisition = await getFirebaseAnalyticsAcquisition(days)
    const firebaseConversions = await getFirebaseAnalyticsConversions(days)

    const responseData = {
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
          arr: calculateARR(mrr),
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
        // Time-series data for charts
        timeSeries,
      },
    }

    // Cache the response for 30 seconds
    adminCache.set(cacheKey, responseData, CACHE_TTL.ANALYTICS)

    return NextResponse.json(responseData)
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
