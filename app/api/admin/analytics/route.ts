import { NextRequest, NextResponse } from "next/server"
import { FieldPath } from "firebase-admin/firestore"
import { adminDb, adminAuth } from "@/lib/firebase-admin"
import {
  getFirebaseAnalyticsOverview,
  getFirebaseAnalyticsEvents,
  getFirebaseAnalyticsAcquisition,
  getFirebaseAnalyticsConversions,
} from "@/lib/firebase-analytics-admin"
import { verifyAdminAccess, parseAdminQueryParams } from "@/lib/admin/middleware"
import { calculateMRR, calculateARR, getMonthlyPrice } from "@/lib/pricing"
import { isScoredCompletedSession, summarizeSessionFunnelCounts } from "@/lib/firestore-helpers"
import { adminCache, getCacheKey, CACHE_TTL } from "@/lib/admin/cache"
import {
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfISOWeek,
  parseISO,
} from "date-fns"

type UserForTimeSeries = { createdAt: string; tier: string }

/**
 * Generate time-series data for charts
 */
async function generateTimeSeriesData(
  usersForSeries: UserForTimeSeries[],
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
  const usersByDate: Record<
    string,
    { total: number; free: number; pro: number; enterprise: number }
  > = {}
  const sessionsByDate: Record<string, { total: number; completed: number }> = {}

  // Initialize all intervals
  intervals.forEach((date) => {
    const key = format(date, "yyyy-MM-dd")
    usersByDate[key] = { total: 0, free: 0, pro: 0, enterprise: 0 }
    sessionsByDate[key] = { total: 0, completed: 0 }
  })

  // Process users for growth (from auth + profiles merge)
  usersForSeries.forEach((user) => {
    const createdAt = user.createdAt
    if (createdAt) {
      try {
        const date = typeof createdAt === "string" ? parseISO(createdAt) : new Date(createdAt)
        const intervalStart = getIntervalStart(date)
        const key = format(intervalStart, "yyyy-MM-dd")

        if (usersByDate[key]) {
          usersByDate[key].total++
          const tier = user.tier || "free"
          if (tier === "pro") usersByDate[key].pro++
          else if (tier === "enterprise") usersByDate[key].enterprise++
          else usersByDate[key].free++
        }
      } catch {
        // Skip invalid dates
      }
    }
  })

  // Process sessions
  if (sessionsSnapshot.docs) {
    sessionsSnapshot.docs.forEach((doc: any) => {
      const session = doc.data()
      const startedAt = session.started_at

      if (startedAt) {
        try {
          const date =
            typeof startedAt === "string"
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
  const cumulativeUsers = { total: 0, free: 0, pro: 0, enterprise: 0 }
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
          error: "Firebase Admin SDK not initialized. Check server configuration.",
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
    const cacheKey = getCacheKey("analytics", { timeRange })
    const cachedResponse = adminCache.get<any>(cacheKey)
    if (cachedResponse) {
      return NextResponse.json({
        ...cachedResponse,
        cached: true,
      })
    }

    // Fetch all users from Firebase Auth (Google, GitHub, etc.) - matches user list
    const authUsers: import("firebase-admin/auth").UserRecord[] = []
    let pageToken: string | undefined
    try {
      do {
        const result = await adminAuth.listUsers(1000, pageToken)
        authUsers.push(...result.users)
        pageToken = result.pageToken
      } while (pageToken)
    } catch (error) {
      console.error("Error fetching auth users:", error)
    }

    const totalUsers = authUsers.length

    // Build profile map for tier data
    const profileMap = new Map<string, { subscription_tier?: string; created_at?: string }>()
    const PROFILE_BATCH = 30
    for (let i = 0; i < authUsers.length; i += PROFILE_BATCH) {
      const batch = authUsers.slice(i, i + PROFILE_BATCH)
      const ids = batch.map((u) => u.uid)
      const profilesSnap = await adminDb
        .collection("profiles")
        .where(FieldPath.documentId(), "in", ids)
        .get()
      profilesSnap.docs.forEach((doc) => profileMap.set(doc.id, doc.data()))
    }

    // Count by subscription tier (auth users without profile = free)
    const tierCounts = { free: 0, pro: 0, enterprise: 0 }
    authUsers.forEach((authUser) => {
      const profile = profileMap.get(authUser.uid)
      const tier = profile?.subscription_tier || "free"
      if (tier in tierCounts) {
        tierCounts[tier as keyof typeof tierCounts]++
      }
    })

    // Build user list for time-series (createdAt from auth or profile, tier from profile)
    const usersForTimeSeries: UserForTimeSeries[] = authUsers.map((authUser) => {
      const profile = profileMap.get(authUser.uid)
      const createdAt =
        authUser.metadata?.creationTime || profile?.created_at || new Date().toISOString()
      const tier = profile?.subscription_tier || "free"
      return { createdAt, tier }
    })

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
    let totalPerformanceScore = 0
    let sessionsWithScore = 0

    // WCSR series: scored completions bucketed by the ISO week they completed in.
    const wcsrByWeek: Record<string, number> = {}

    const sessionsByType: Record<string, number> = {}
    const sessionsByDifficulty: Record<string, number> = {}

    // Guest/registered + scored-completion partition, shared with the funnel route
    // so the two dashboards can't drift. Existing totals below stay unchanged so
    // the dashboard renders identically; the split fields are additive.
    const sessionData: any[] = sessionsSnapshot.docs
      ? sessionsSnapshot.docs.map((doc: any) => doc.data())
      : []
    const sessionCounts = summarizeSessionFunnelCounts(sessionData)
    const completedSessions = sessionCounts.completed

    for (const session of sessionData) {
      if (isScoredCompletedSession(session)) {
        // Bucket by ISO week of completion for the weekly WCSR series.
        try {
          const completedRaw = session.completed_at
          const completedDate =
            typeof completedRaw === "string"
              ? parseISO(completedRaw)
              : completedRaw?.toDate?.() || new Date(completedRaw)
          const weekKey = format(startOfISOWeek(completedDate), "yyyy-MM-dd")
          wcsrByWeek[weekKey] = (wcsrByWeek[weekKey] || 0) + 1
        } catch {
          // Skip invalid completed_at values
        }
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
    }

    const avgPerformanceScore =
      sessionsWithScore > 0 ? Math.round(totalPerformanceScore / sessionsWithScore) : 0

    // Weekly completed-scored-rounds (WCSR) series + current-week headline.
    const wcsrSeries = Object.entries(wcsrByWeek)
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week))
    const currentWeekKey = format(startOfISOWeek(new Date()), "yyyy-MM-dd")
    const wcsrCurrentWeek = wcsrByWeek[currentWeekKey] || 0

    // All-time scored rounds, measured with a Firestore aggregate count so the
    // headline stays constant across time-range filters and costs one index
    // read instead of a collection scan. feedback_status "complete" is the
    // modern write-path signal behind isScoredCompletedSession; the legacy
    // pre-feedback_status branch (field missing + persisted score) cannot be
    // expressed as an aggregate filter, so this counter can only UNDERCOUNT
    // relative to the in-memory semantics — never inflate a quoted number.
    let scoredRoundsAllTime: number | null = null
    try {
      const scoredCountSnapshot = await adminDb
        .collection("interview_sessions")
        .where("feedback_status", "==", "complete")
        .count()
        .get()
      scoredRoundsAllTime = scoredCountSnapshot.data().count
    } catch (error) {
      // Additive metric: never let it break the existing dashboard payload.
      console.error("Error counting all-time scored rounds:", error)
    }

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

    const codeExecutionPassRate =
      totalCodeExecutions > 0 ? Math.round((passedCodeExecutions / totalCodeExecutions) * 100) : 0

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

      recentErrors = errorsSnapshot.docs.map((doc) => {
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
          .map((doc) => {
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
      usersForTimeSeries,
      sessionsSnapshot,
      startDate,
      timeRange
    )

    // Fetch Firebase Analytics data (if configured)
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365
    const firebaseAnalytics = await getFirebaseAnalyticsOverview(days)
    const firebaseEvents = await getFirebaseAnalyticsEvents(
      [
        "sign_up",
        "login",
        "session_start",
        "session_complete",
        "purchase",
        "code_execution",
        "ai_interaction",
      ],
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
          // Additive: scored completions + guest/registered partition (UI opts in).
          scoredCompleted: sessionCounts.scored,
          guest: sessionCounts.guest,
          registered: sessionCounts.registered,
          registeredCompleted: sessionCounts.registeredCompleted,
          registeredScoredCompleted: sessionCounts.registeredScored,
        },
        // North Star: weekly completed-scored-rounds (rounds with a persisted score).
        wcsr: {
          currentWeek: wcsrCurrentWeek,
          total: sessionCounts.scored,
          series: wcsrSeries,
        },
        // Additive: all-time scored rounds via aggregate count (null on failure).
        // Unlike wcsr.total (scoped to the selected time range), this is
        // range-independent — the number the founder quotes.
        scoredRoundsAllTime,
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
        firebaseAnalytics: firebaseAnalytics
          ? {
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
            }
          : null,
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
        details: process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 }
    )
  }
}
