/**
 * Investor Metrics API
 *
 * Provides comprehensive SaaS metrics for investors, research, and board reporting
 * Includes LTV, CAC, NRR, Quick Ratio, cohort analysis, and more
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyToken, getAdminRole } from "@/lib/admin/rbac"
import { Timestamp } from "firebase-admin/firestore"

export const dynamic = "force-dynamic"

// Cache for expensive metrics calculations
const metricsCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface CohortData {
  cohort: string
  users: number
  retention: number[]
  ltv: number
  churnRate: number
}

interface RevenueMetrics {
  mrr: number
  arr: number
  mrrGrowth: number
  newMrr: number
  expansionMrr: number
  contractionMrr: number
  churnedMrr: number
  netNewMrr: number
}

export async function GET(request: NextRequest) {
  try {
    // Verify auth
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const auth = await verifyToken(token)
    if (!auth.valid || !auth.userId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    // Check admin role
    const role = await getAdminRole(auth.userId)
    if (!role) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get("timeRange") || "90d"

    // Check cache
    const cacheKey = `investor-metrics-${timeRange}`
    const cached = metricsCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, ...cached.data, cached: true })
    }

    // Calculate date ranges
    const now = new Date()
    const daysMap: Record<string, number> = {
      "30d": 30,
      "90d": 90,
      "180d": 180,
      "365d": 365,
      all: 3650,
    }
    const days = daysMap[timeRange] || 90
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const previousPeriodStart = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000)

    // Fetch all required data in parallel
    const [usersSnapshot, paymentsSnapshot, previousPaymentsSnapshot, sessionsSnapshot] =
      await Promise.all([
        adminDb.collection("profiles").get(),
        adminDb
          .collection("payment_history")
          .where("created_at", ">=", Timestamp.fromDate(startDate))
          .get(),
        adminDb
          .collection("payment_history")
          .where("created_at", ">=", Timestamp.fromDate(previousPeriodStart))
          .where("created_at", "<", Timestamp.fromDate(startDate))
          .get(),
        adminDb
          .collection("interview_sessions")
          .where("started_at", ">=", Timestamp.fromDate(startDate))
          .get(),
      ])

    // Process user data
    interface UserData {
      id: string
      subscription_status?: string
      subscription_tier?: string
      createdAt: Date
      [key: string]: any
    }

    const users: UserData[] = usersSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        subscription_status: data.subscription_status,
        subscription_tier: data.subscription_tier,
        createdAt: data.created_at?.toDate?.() || new Date(),
      }
    })

    // Calculate user metrics
    const totalUsers = users.length
    const activeUsers = users.filter(
      (u) => u.subscription_status === "active" || u.subscription_tier !== "free"
    ).length
    const freeUsers = users.filter(
      (u) => u.subscription_tier === "free" || !u.subscription_tier
    ).length
    const proUsers = users.filter((u) => u.subscription_tier === "pro").length
    const enterpriseUsers = users.filter((u) => u.subscription_tier === "enterprise").length
    const paidUsers = proUsers + enterpriseUsers

    // Calculate revenue metrics
    const payments = paymentsSnapshot.docs.map((doc) => ({
      ...doc.data(),
      amount: doc.data().amount || 0,
      createdAt: doc.data().created_at?.toDate?.() || new Date(),
    }))

    const previousPayments = previousPaymentsSnapshot.docs.map((doc) => ({
      ...doc.data(),
      amount: doc.data().amount || 0,
    }))

    const currentRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0) / 100
    const previousRevenue = previousPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / 100

    // MRR Calculation (based on active subscriptions)
    const monthlyPrices = {
      free: 0,
      pro: 29,
      enterprise: 99,
    }

    const mrr = users.reduce((sum, u) => {
      if (u.subscription_status === "active") {
        const price = monthlyPrices[u.subscription_tier as keyof typeof monthlyPrices] || 0
        return sum + price
      }
      return sum
    }, 0)

    const arr = mrr * 12

    // Calculate growth rate
    const mrrGrowth =
      previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0

    // Churn calculation
    const previousPaidUsers = users.filter((u) => {
      const createdAt = u.createdAt
      return (
        createdAt < startDate &&
        (u.subscription_tier === "pro" || u.subscription_tier === "enterprise")
      )
    }).length

    const churnedUsers =
      previousPaidUsers > 0
        ? users.filter(
            (u) => u.subscription_status === "canceled" || u.subscription_status === "churned"
          ).length
        : 0

    const churnRate = previousPaidUsers > 0 ? (churnedUsers / previousPaidUsers) * 100 : 0

    // LTV Calculation
    const avgRevenuePerUser = paidUsers > 0 ? mrr / paidUsers : 0
    const monthlyChurnRate = churnRate / 100
    const ltv = monthlyChurnRate > 0 ? avgRevenuePerUser / monthlyChurnRate : avgRevenuePerUser * 24

    // CAC Calculation
    // Note: CAC requires actual marketing spend data from your accounting/marketing systems
    // For now, we show 0 (unknown) - integrate with your marketing spend tracking to populate this
    const newUsersInPeriod = users.filter((u) => u.createdAt >= startDate).length
    const cac = 0 // Set to 0 until marketing spend data is integrated

    // LTV:CAC Ratio
    const ltvCacRatio = cac > 0 ? ltv / cac : ltv > 0 ? Infinity : 0

    // Quick Ratio = (New MRR + Expansion MRR) / (Churned MRR + Contraction MRR)
    // Simplified calculation
    const newMrr = newUsersInPeriod * avgRevenuePerUser
    const churnedMrr = churnedUsers * avgRevenuePerUser
    const quickRatio = churnedMrr > 0 ? newMrr / churnedMrr : newMrr > 0 ? Infinity : 0

    // Net Revenue Retention (NRR)
    const expansionMrr = 0 // Would need historical tier changes
    const contractionMrr = 0 // Would need historical tier changes
    const nrr =
      previousRevenue > 0
        ? ((currentRevenue + expansionMrr - contractionMrr - churnedMrr) / previousRevenue) * 100
        : 100

    // Session metrics for engagement
    const totalSessions = sessionsSnapshot.size
    const completedSessions = sessionsSnapshot.docs.filter(
      (doc) => doc.data().status === "completed" || doc.data().completed_at
    ).length
    const avgSessionsPerUser = totalUsers > 0 ? totalSessions / totalUsers : 0

    // Cohort analysis by month
    const cohorts: CohortData[] = []
    const months = 6
    for (let i = 0; i < months; i++) {
      const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const cohortEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const cohortName = cohortStart.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })

      const cohortUsers = users.filter((u) => {
        const created = u.createdAt
        return created >= cohortStart && created <= cohortEnd
      })

      const cohortRetention: number[] = []
      for (let week = 0; week <= 4; week++) {
        const weekStart = new Date(cohortStart.getTime() + week * 7 * 24 * 60 * 60 * 1000)
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

        if (weekEnd > now) break

        const activeInWeek = cohortUsers.filter((u) => {
          // Check if user had any activity in this week
          // Simplified: assume users with subscription are retained
          return (
            u.subscription_status === "active" ||
            weekEnd < new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          )
        }).length

        cohortRetention.push(cohortUsers.length > 0 ? (activeInWeek / cohortUsers.length) * 100 : 0)
      }

      const cohortPaidUsers = cohortUsers.filter(
        (u) => u.subscription_tier === "pro" || u.subscription_tier === "enterprise"
      ).length

      cohorts.push({
        cohort: cohortName,
        users: cohortUsers.length,
        retention: cohortRetention,
        ltv: cohortPaidUsers * avgRevenuePerUser * 12, // Simplified LTV
        churnRate:
          cohortUsers.length > 0
            ? (cohortUsers.filter((u) => u.subscription_status === "canceled").length /
                cohortUsers.length) *
              100
            : 0,
      })
    }

    // Growth timeline
    const growthTimeline: Array<{ date: string; users: number; mrr: number; sessions: number }> = []
    const dataPoints = Math.min(days, 90)
    for (let i = dataPoints - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split("T")[0]

      const usersToDate = users.filter((u) => u.createdAt <= date).length
      const paidUsersToDate = users.filter(
        (u) =>
          u.createdAt <= date &&
          (u.subscription_tier === "pro" || u.subscription_tier === "enterprise")
      ).length

      // Calculate actual sessions for this date by checking session timestamps
      // This is based on real data from the sessions collection
      const sessionsToDate = sessionsSnapshot.docs.filter((doc) => {
        const sessionDate = doc.data().started_at?.toDate?.()
        return sessionDate && sessionDate <= date
      }).length

      growthTimeline.push({
        date: dateStr,
        users: usersToDate,
        mrr: paidUsersToDate * avgRevenuePerUser,
        sessions: sessionsToDate,
      })
    }

    // Key metrics summary for investors
    const metrics = {
      // Core Revenue Metrics
      revenue: {
        mrr,
        arr,
        mrrGrowth: Math.round(mrrGrowth * 100) / 100,
        newMrr: Math.round(newMrr * 100) / 100,
        expansionMrr: 0,
        contractionMrr: 0,
        churnedMrr: Math.round(churnedMrr * 100) / 100,
        netNewMrr: Math.round((newMrr - churnedMrr) * 100) / 100,
      },

      // User Metrics
      users: {
        total: totalUsers,
        active: activeUsers,
        free: freeUsers,
        pro: proUsers,
        enterprise: enterpriseUsers,
        paid: paidUsers,
        conversionRate: totalUsers > 0 ? Math.round((paidUsers / totalUsers) * 10000) / 100 : 0,
        newInPeriod: newUsersInPeriod,
      },

      // Unit Economics
      unitEconomics: {
        arpu: Math.round(avgRevenuePerUser * 100) / 100,
        ltv: Math.round(ltv * 100) / 100,
        cac: Math.round(cac * 100) / 100,
        ltvCacRatio: ltvCacRatio === Infinity ? "∞" : Math.round(ltvCacRatio * 100) / 100,
        paybackPeriodMonths:
          cac > 0 && avgRevenuePerUser > 0 ? Math.round((cac / avgRevenuePerUser) * 100) / 100 : 0,
      },

      // Retention & Churn
      retention: {
        churnRate: Math.round(churnRate * 100) / 100,
        nrr: Math.round(nrr * 100) / 100,
        quickRatio: quickRatio === Infinity ? "∞" : Math.round(quickRatio * 100) / 100,
        avgSessionsPerUser: Math.round(avgSessionsPerUser * 100) / 100,
      },

      // Engagement
      engagement: {
        totalSessions,
        completedSessions,
        completionRate:
          totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 10000) / 100 : 0,
      },

      // Cohorts
      cohorts: cohorts.reverse(),

      // Timeline
      growthTimeline,

      // Industry benchmarks for SaaS comparison (source: OpenView, SaaS Capital research)
      benchmarks: {
        churnRate: {
          good: 3, // Top quartile SaaS
          avg: 5, // Median SaaS
          yours: Math.round(churnRate * 100) / 100,
        },
        nrr: {
          good: 120, // Best-in-class expansion revenue
          avg: 100, // Baseline retention
          yours: Math.round(nrr * 100) / 100,
        },
        ltvCacRatio: {
          good: 3, // Healthy unit economics
          avg: 2, // Acceptable
          yours: typeof ltvCacRatio === "number" ? Math.round(ltvCacRatio * 100) / 100 : 0,
        },
        quickRatio: {
          good: 4, // Strong growth efficiency
          avg: 2, // Sustainable growth
          yours: typeof quickRatio === "number" ? Math.round(quickRatio * 100) / 100 : 0,
        },
      },
    }

    // Cache the result
    metricsCache.set(cacheKey, { data: { metrics }, timestamp: Date.now() })

    return NextResponse.json({
      success: true,
      metrics,
      generatedAt: new Date().toISOString(),
      timeRange,
    })
  } catch (error) {
    console.error("[Investor Metrics API] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to calculate investor metrics" },
      { status: 500 }
    )
  }
}
