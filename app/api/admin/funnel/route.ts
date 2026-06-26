import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess, parseAdminQueryParams } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"

interface FunnelStage {
  name: string
  value: number
  color?: string
}

interface FunnelMetrics {
  stages: FunnelStage[]
  conversionRates: {
    visitToSignup: number
    signupToSession: number
    sessionToComplete: number
    completeToSubscribe: number
    overallConversion: number
  }
}

/**
 * Funnel Analytics API
 * Returns conversion funnel metrics for the admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const authResult = await verifyAdminAccess(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 403 }
      )
    }

    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: "Database not available" },
        { status: 500 }
      )
    }

    const { timeRange, startDate } = parseAdminQueryParams(request)

    // Get total page views from Firebase Analytics or estimate from profiles
    // For now, we'll estimate based on profiles (in production, use GA4 Data API)
    const profilesSnapshot = await adminDb.collection("profiles").get()
    const totalProfiles = profilesSnapshot.size

    // Get signups (users with created_at in time range)
    let signups = 0
    profilesSnapshot.docs.forEach((doc) => {
      const profile = doc.data()
      const createdAt = profile.created_at || profile.createdAt

      if (createdAt) {
        const date = typeof createdAt === "string"
          ? new Date(createdAt)
          : createdAt.toDate?.() || new Date(createdAt)

        if (!startDate || date >= startDate) {
          signups++
        }
      }
    })

    // Get session starts
    let sessionsQuery = adminDb.collection("interview_sessions")
    if (startDate) {
      sessionsQuery = sessionsQuery.where("started_at", ">=", startDate.toISOString()) as any
    }
    const sessionsSnapshot = await sessionsQuery.get()
    const totalSessions = sessionsSnapshot.size

    // Get completed sessions
    let completedSessions = 0
    sessionsSnapshot.docs.forEach((doc) => {
      if (doc.data().completed_at) {
        completedSessions++
      }
    })

    // Get subscriptions (pro + enterprise users)
    let subscribers = 0
    profilesSnapshot.docs.forEach((doc) => {
      const tier = doc.data().subscription_tier
      if (tier === "pro" || tier === "enterprise") {
        subscribers++
      }
    })

    // Try to get real page view data from Firebase Analytics if available
    // Otherwise, use an estimate based on signup conversion rates
    let pageViews: number
    let pageViewsEstimated = false

    try {
      // Import and call Firebase Analytics if configured
      const { getFirebaseAnalyticsOverview } = await import("@/lib/firebase-analytics-admin")
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365
      const analyticsData = await getFirebaseAnalyticsOverview(days)

      if (analyticsData?.pageViews && analyticsData.pageViews > 0) {
        pageViews = analyticsData.pageViews
      } else {
        // Fallback to estimate: B2B SaaS typically sees 15-25% signup rate from visitors
        // Using 20% as baseline, so page views = signups / 0.20 = signups * 5
        pageViews = Math.max(signups * 5, totalProfiles * 3)
        pageViewsEstimated = true
      }
    } catch {
      // Firebase Analytics not configured or errored
      pageViews = Math.max(signups * 5, totalProfiles * 3)
      pageViewsEstimated = true
    }

    // Build funnel stages
    const stages: FunnelStage[] = [
      {
        name: pageViewsEstimated ? "Page Views (est.)" : "Page Views",
        value: pageViews,
        color: "#c4703f",
      },
      { name: "Sign Ups", value: signups || totalProfiles, color: "#3fb883" },
      { name: "Started Session", value: totalSessions, color: "#FBBF24" },
      { name: "Completed Session", value: completedSessions, color: "#F97316" },
      { name: "Subscribed", value: subscribers, color: "#A855F7" },
    ]

    // Calculate conversion rates
    const safeDiv = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0)

    const conversionRates = {
      visitToSignup: safeDiv(stages[1].value, stages[0].value),
      signupToSession: safeDiv(stages[2].value, stages[1].value),
      sessionToComplete: safeDiv(stages[3].value, stages[2].value),
      completeToSubscribe: safeDiv(stages[4].value, stages[3].value),
      overallConversion: safeDiv(stages[4].value, stages[0].value),
    }

    // Also return daily funnel data for trends
    const funnelTrend = await generateFunnelTrend(profilesSnapshot, sessionsSnapshot, startDate, timeRange)

    return NextResponse.json({
      success: true,
      timeRange,
      funnel: {
        stages,
        conversionRates,
        trend: funnelTrend,
        pageViewsEstimated, // Flag indicating if page views are estimated
      },
    })
  } catch (error) {
    console.error("Funnel analytics API error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch funnel data" },
      { status: 500 }
    )
  }
}

/**
 * Generate daily funnel trend data
 */
async function generateFunnelTrend(
  profilesSnapshot: FirebaseFirestore.QuerySnapshot,
  sessionsSnapshot: FirebaseFirestore.QuerySnapshot,
  startDate: Date | null,
  timeRange: string
): Promise<Array<{ date: string; signups: number; sessions: number; completed: number }>> {
  const now = new Date()
  const start = startDate || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Group by date
  const dataByDate: Record<string, { signups: number; sessions: number; completed: number }> = {}

  // Initialize dates
  const days = Math.ceil((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
  for (let i = 0; i <= days; i++) {
    const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
    const key = date.toISOString().split("T")[0]
    dataByDate[key] = { signups: 0, sessions: 0, completed: 0 }
  }

  // Process profiles for signups
  profilesSnapshot.docs.forEach((doc) => {
    const profile = doc.data()
    const createdAt = profile.created_at || profile.createdAt

    if (createdAt) {
      try {
        const date = typeof createdAt === "string"
          ? new Date(createdAt)
          : createdAt.toDate?.() || new Date(createdAt)

        const key = date.toISOString().split("T")[0]
        if (dataByDate[key]) {
          dataByDate[key].signups++
        }
      } catch {
        // Skip invalid dates
      }
    }
  })

  // Process sessions
  sessionsSnapshot.docs.forEach((doc) => {
    const session = doc.data()
    const startedAt = session.started_at

    if (startedAt) {
      try {
        const date = typeof startedAt === "string"
          ? new Date(startedAt)
          : startedAt.toDate?.() || new Date(startedAt)

        const key = date.toISOString().split("T")[0]
        if (dataByDate[key]) {
          dataByDate[key].sessions++
          if (session.completed_at) {
            dataByDate[key].completed++
          }
        }
      } catch {
        // Skip invalid dates
      }
    }
  })

  // Convert to array
  return Object.entries(dataByDate)
    .map(([date, data]) => ({
      date,
      ...data,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
