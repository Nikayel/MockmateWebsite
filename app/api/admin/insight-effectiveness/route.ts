/**
 * Admin API - Insight Effectiveness
 *
 * Returns metrics on how effective our AI insights and recommendations are
 */

import { NextResponse } from "next/server"
import { withPermission } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { adminDb } from "@/lib/firebase-admin"
import {
  getGlobalInsightStats,
  getUserInsightStats,
  type InsightType,
} from "@/lib/rag/insight-effectiveness"

export const dynamic = "force-dynamic"

interface InsightEffectivenessResponse {
  global: {
    byInsightType: Record<InsightType, { shown: number; clicked: number; completed: number }>
    mostEffective: InsightType | null
    leastEffective: InsightType | null
    totalInteractions: number
    overallClickThroughRate: number
    overallCompletionRate: number
  }
  topUsers: Array<{
    userId: string
    email?: string
    totalInteractions: number
    mostUsedInsightType: InsightType | null
    completionRate: number
  }>
  recentTrends: {
    last7Days: { date: string; interactions: number }[]
    interactionsByType: Record<InsightType, number>
  }
}

/**
 * Effectiveness of AI insights: VIEW_ANALYTICS.
 *
 * The top-users table carries real emails, which is user PII rather than
 * analytics, so the email column is only filled in for a caller who also holds
 * VIEW_USER_DETAILS. An analyst still gets the whole ranking, keyed by user id.
 */
export const GET = withPermission(PERMISSIONS.VIEW_ANALYTICS, async (_request, context) => {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 })
    }

    const maySeeEmails = context.permissions.includes(PERMISSIONS.VIEW_USER_DETAILS)

    // Get global stats
    const globalStats = await getGlobalInsightStats()

    // Calculate totals
    let totalShown = 0
    let totalClicked = 0
    let totalCompleted = 0

    for (const stats of Object.values(globalStats.byInsightType)) {
      totalShown += stats.shown
      totalClicked += stats.clicked
      totalCompleted += stats.completed
    }

    // Get top users by interaction count
    const topUsersSnapshot = await adminDb.collection("insight_effectiveness_stats").limit(20).get()

    const topUsers: InsightEffectivenessResponse["topUsers"] = []

    for (const doc of topUsersSnapshot.docs) {
      const userId = doc.id
      const userStats = await getUserInsightStats(userId)

      if (userStats) {
        // Try to get user email
        let email: string | undefined
        if (maySeeEmails) {
          try {
            const userDoc = await adminDb.collection("profiles").doc(userId).get()
            email = userDoc.data()?.email
          } catch {
            // Ignore
          }
        }

        // Calculate completion rate
        let userShown = 0
        let userCompleted = 0
        for (const stat of userStats.statsPerType) {
          userShown += stat.totalShown
          userCompleted += stat.totalCompleted
        }

        topUsers.push({
          userId,
          email,
          totalInteractions: userStats.totalInteractions,
          mostUsedInsightType: userStats.mostEffectiveInsightType,
          completionRate: userShown > 0 ? userCompleted / userShown : 0,
        })
      }
    }

    // Sort by total interactions
    topUsers.sort((a, b) => b.totalInteractions - a.totalInteractions)

    // Get recent trends (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentInteractionsSnapshot = await adminDb
      .collection("insight_interactions")
      .where("timestamp", ">=", sevenDaysAgo)
      .orderBy("timestamp", "desc")
      .limit(1000)
      .get()

    // Group by date
    const byDate: Record<string, number> = {}
    const byType: Record<string, number> = {}

    for (const doc of recentInteractionsSnapshot.docs) {
      const data = doc.data()
      const date = data.timestamp?.toDate?.() || new Date(data.timestamp)
      const dateStr = date.toISOString().split("T")[0]

      byDate[dateStr] = (byDate[dateStr] || 0) + 1
      byType[data.insightType] = (byType[data.insightType] || 0) + 1
    }

    // Fill in missing dates
    const last7Days: { date: string; interactions: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]
      last7Days.push({
        date: dateStr,
        interactions: byDate[dateStr] || 0,
      })
    }

    const response: InsightEffectivenessResponse = {
      global: {
        byInsightType: globalStats.byInsightType,
        mostEffective: globalStats.mostEffective,
        leastEffective: globalStats.leastEffective,
        totalInteractions: totalShown + totalClicked + totalCompleted,
        overallClickThroughRate: totalShown > 0 ? totalClicked / totalShown : 0,
        overallCompletionRate: totalClicked > 0 ? totalCompleted / totalClicked : 0,
      },
      topUsers: topUsers.slice(0, 10),
      recentTrends: {
        last7Days,
        interactionsByType: byType as Record<InsightType, number>,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[Admin InsightEffectiveness] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
