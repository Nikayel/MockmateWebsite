import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { withPermission } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { parseBoundedInt } from "@/lib/admin/query-params"
import {
  cohortPeriodKey,
  collectLearnActivityPeriods,
  type CohortPeriodType,
  type LearnProgressActivityInput,
} from "@/lib/admin/cohort-activity"
import { format, startOfMonth, startOfWeek, differenceInWeeks, differenceInMonths, subMonths } from "date-fns"

interface CohortData {
  cohort: string
  size: number
  retention: number[]
  /** Retained-active counting interview OR Learn-lesson activity that period. */
  retentionInclLearn: number[]
}

/**
 * Cohort Analytics API
 * Returns user retention cohort data for the admin dashboard.
 *
 * Retention is analytics, so VIEW_ANALYTICS. Any admin role reached it before.
 */
export const GET = withPermission(PERMISSIONS.VIEW_ANALYTICS, async (request) => {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: "Database not available" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    // Normalize to the two supported bucketings (garbage input always bucketed monthly before).
    const cohortType: CohortPeriodType =
      searchParams.get("type") === "weekly" ? "weekly" : "monthly"
    // Each cohort is another retention pass over every profile, and a
    // non-numeric value made the loop bound NaN. 24 covers two years of months.
    const cohortsParam = parseBoundedInt(searchParams.get("cohorts"), {
      min: 1,
      max: 24,
      fallback: 6,
    })
    if (!cohortsParam.ok) {
      return NextResponse.json(
        { success: false, error: `Invalid cohorts: ${cohortsParam.error}` },
        { status: 400 }
      )
    }
    const numCohorts = cohortsParam.value

    // Get all users with their signup dates
    const profilesSnapshot = await adminDb.collection("profiles").get()
    const sessionsSnapshot = await adminDb.collection("interview_sessions").get()

    // Learn-lesson progress feeds the "incl. Learn" retention split: a cohort
    // user counts as retained-active when they did interview OR Learn activity
    // that period. Fetched best-effort so a failure never breaks the existing
    // interview-only retention numbers.
    let learnProgressDocs: LearnProgressActivityInput[] = []
    try {
      const progressSnapshot = await adminDb.collection("user_tutorial_progress").get()
      learnProgressDocs = progressSnapshot.docs.map(
        (doc) => doc.data() as LearnProgressActivityInput
      )
    } catch (error) {
      console.error("Error fetching tutorial progress for cohorts:", error)
    }

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

          // Same bucketing as before, now shared with the Learn activity map.
          const periodKey = cohortPeriodKey(date, cohortType)

          if (!userActivity.has(userId)) {
            userActivity.set(userId, new Set())
          }
          userActivity.get(userId)!.add(periodKey)
        } catch {
          // Skip invalid dates
        }
      }
    })

    // userId -> Set of periods with Learn activity, bucketed identically.
    const learnActivity = collectLearnActivityPeriods(learnProgressDocs, cohortType)

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
          retentionInclLearn: [],
        })
        continue
      }

      // Calculate retention for each subsequent period
      const maxPeriods = cohortType === "weekly" ? 8 : 6 // 8 weeks or 6 months
      const periodsToCalculate = Math.min(maxPeriods, numCohorts - cohorts.length)
      const retention: number[] = []
      const retentionInclLearn: number[] = []

      for (let p = 0; p < periodsToCalculate; p++) {
        const periodStart = cohortType === "weekly"
          ? startOfWeek(new Date(cohortStart.getTime() + p * 7 * 24 * 60 * 60 * 1000))
          : startOfMonth(subMonths(now, i - p))

        const periodKey = cohortType === "weekly"
          ? format(periodStart, "yyyy-MM-dd")
          : format(periodStart, "yyyy-MM")

        // Count users active in this period (interview-only, and incl. Learn)
        let activeUsers = 0
        let activeUsersInclLearn = 0
        cohortUsers.forEach((userId) => {
          const sessionActive = userActivity.get(userId)?.has(periodKey) ?? false
          const learnActive = learnActivity.get(userId)?.has(periodKey) ?? false
          if (sessionActive) {
            activeUsers++
          }
          if (sessionActive || learnActive) {
            activeUsersInclLearn++
          }
        })

        const retentionRate = (activeUsers / cohortUsers.length) * 100
        retention.push(Math.round(retentionRate * 10) / 10)
        const retentionRateInclLearn = (activeUsersInclLearn / cohortUsers.length) * 100
        retentionInclLearn.push(Math.round(retentionRateInclLearn * 10) / 10)
      }

      cohorts.push({
        cohort: cohortLabel,
        size: cohortUsers.length,
        retention,
        retentionInclLearn,
      })
    }

    // Calculate average retention per period
    const avgRetention: number[] = []
    const avgRetentionInclLearn: number[] = []
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

      const valuesInclLearn = cohorts
        .filter((c) => c.retentionInclLearn[p] !== undefined)
        .map((c) => c.retentionInclLearn[p])

      if (valuesInclLearn.length > 0) {
        avgRetentionInclLearn.push(
          Math.round(
            (valuesInclLearn.reduce((a, b) => a + b, 0) / valuesInclLearn.length) * 10
          ) / 10
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
        // Additive: same averages when Learn-lesson activity also counts.
        avgRetentionInclLearn,
        // Zero-based, because period 0 IS the signup period: the loop above starts
        // at `cohortStart + 0 weeks`, so the first column measures activity in the
        // week a cohort signed up and is near 100% by construction. Labelling that
        // column "W1" pushed every subsequent one a week early, so the column a
        // founder would read as week-4 retention was really week 3, which reads
        // higher than the truth. This is the number an investor asks for first, so
        // the off-by-one mattered more than its size suggests.
        periodLabels: cohortType === "weekly"
          ? ["W0", "W1", "W2", "W3", "W4", "W5", "W6", "W7"]
          : ["M0", "M1", "M2", "M3", "M4", "M5"],
      },
    })
  } catch (error) {
    console.error("Cohort analytics API error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch cohort data" },
      { status: 500 }
    )
  }
})
