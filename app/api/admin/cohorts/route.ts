import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/admin/middleware"
import { format, startOfMonth, startOfWeek, differenceInWeeks, differenceInMonths, subMonths } from "date-fns"

interface CohortData {
  cohort: string
  size: number
  retention: number[]
}

/**
 * Cohort Analytics API
 * Returns user retention cohort data for the admin dashboard
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

    const { searchParams } = new URL(request.url)
    const cohortType = searchParams.get("type") || "monthly" // weekly or monthly
    const numCohorts = parseInt(searchParams.get("cohorts") || "6", 10)

    // Get all users with their signup dates
    const profilesSnapshot = await adminDb.collection("profiles").get()
    const sessionsSnapshot = await adminDb.collection("interview_sessions").get()

    // Build user activity map: userId -> Set of activity dates
    const userActivity: Map<string, Set<string>> = new Map()

    sessionsSnapshot.docs.forEach((doc) => {
      const session = doc.data()
      const userId = session.user_id
      const startedAt = session.started_at

      if (userId && startedAt) {
        try {
          const date = typeof startedAt === "string"
            ? new Date(startedAt)
            : startedAt.toDate?.() || new Date(startedAt)

          const periodKey = cohortType === "weekly"
            ? format(startOfWeek(date), "yyyy-MM-dd")
            : format(startOfMonth(date), "yyyy-MM")

          if (!userActivity.has(userId)) {
            userActivity.set(userId, new Set())
          }
          userActivity.get(userId)!.add(periodKey)
        } catch {
          // Skip invalid dates
        }
      }
    })

    // Build cohorts
    const now = new Date()
    const cohorts: CohortData[] = []

    for (let i = numCohorts - 1; i >= 0; i--) {
      const cohortStart = cohortType === "weekly"
        ? startOfWeek(new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000))
        : startOfMonth(subMonths(now, i))

      const cohortEnd = cohortType === "weekly"
        ? new Date(cohortStart.getTime() + 7 * 24 * 60 * 60 * 1000)
        : startOfMonth(subMonths(now, i - 1))

      const cohortLabel = cohortType === "weekly"
        ? format(cohortStart, "MMM d")
        : format(cohortStart, "MMM yyyy")

      const cohortKey = cohortType === "weekly"
        ? format(cohortStart, "yyyy-MM-dd")
        : format(cohortStart, "yyyy-MM")

      // Find users who signed up in this cohort
      const cohortUsers: string[] = []

      profilesSnapshot.docs.forEach((doc) => {
        const profile = doc.data()
        const createdAt = profile.created_at || profile.createdAt

        if (createdAt) {
          try {
            const date = typeof createdAt === "string"
              ? new Date(createdAt)
              : createdAt.toDate?.() || new Date(createdAt)

            if (date >= cohortStart && date < cohortEnd) {
              cohortUsers.push(doc.id)
            }
          } catch {
            // Skip invalid dates
          }
        }
      })

      if (cohortUsers.length === 0) {
        cohorts.push({
          cohort: cohortLabel,
          size: 0,
          retention: [],
        })
        continue
      }

      // Calculate retention for each subsequent period
      const maxPeriods = cohortType === "weekly" ? 8 : 6 // 8 weeks or 6 months
      const periodsToCalculate = Math.min(maxPeriods, numCohorts - cohorts.length)
      const retention: number[] = []

      for (let p = 0; p < periodsToCalculate; p++) {
        const periodStart = cohortType === "weekly"
          ? startOfWeek(new Date(cohortStart.getTime() + p * 7 * 24 * 60 * 60 * 1000))
          : startOfMonth(subMonths(now, i - p))

        const periodKey = cohortType === "weekly"
          ? format(periodStart, "yyyy-MM-dd")
          : format(periodStart, "yyyy-MM")

        // Count users active in this period
        let activeUsers = 0
        cohortUsers.forEach((userId) => {
          const activity = userActivity.get(userId)
          if (activity?.has(periodKey)) {
            activeUsers++
          }
        })

        const retentionRate = (activeUsers / cohortUsers.length) * 100
        retention.push(Math.round(retentionRate * 10) / 10)
      }

      cohorts.push({
        cohort: cohortLabel,
        size: cohortUsers.length,
        retention,
      })
    }

    // Calculate average retention per period
    const avgRetention: number[] = []
    const maxRetentionPeriods = Math.max(...cohorts.map((c) => c.retention.length))

    for (let p = 0; p < maxRetentionPeriods; p++) {
      const values = cohorts
        .filter((c) => c.retention[p] !== undefined)
        .map((c) => c.retention[p])

      if (values.length > 0) {
        avgRetention.push(
          Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
        )
      }
    }

    return NextResponse.json({
      success: true,
      cohortType,
      data: cohorts,
      summary: {
        totalCohorts: cohorts.length,
        totalUsers: cohorts.reduce((sum, c) => sum + c.size, 0),
        avgRetention,
        periodLabels: cohortType === "weekly"
          ? ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"]
          : ["M1", "M2", "M3", "M4", "M5", "M6"],
      },
    })
  } catch (error) {
    console.error("Cohort analytics API error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch cohort data" },
      { status: 500 }
    )
  }
}
