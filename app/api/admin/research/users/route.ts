/**
 * Admin Research Users API
 *
 * GET /api/admin/research/users
 * Returns users with their algorithm assignments and performance analytics
 *
 * Query params:
 * - algorithm: 'sm2' | 'fsrs' | 'all' - Filter by algorithm
 * - page: number - Page number (default: 1)
 * - limit: number - Results per page (default: 50)
 * - search: string - Search by email or name
 * - sortBy: 'retention' | 'score' | 'reviews' | 'created' - Sort field
 * - sortOrder: 'asc' | 'desc' - Sort direction
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/admin/middleware"

interface UserAlgorithmData {
  id: string
  email: string
  fullName: string | null
  algorithm: "sm2" | "fsrs"
  algorithmAssignedAt: string | null
  algorithmOverridden: boolean
  subscriptionTier: string
  createdAt: string
  lastActive: string | null
  // Performance metrics
  totalReviews: number
  totalProblems: number
  problemsMastered: number
  averageScore: number
  retentionRate: number
  averageDailyReviews: number
  streakDays: number
  totalPracticeMinutes: number
  // Pattern breakdown
  patternBreakdown: Record<string, { count: number; avgScore: number; mastered: number }>
}

export async function GET(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: "Firebase Admin SDK not initialized." },
        { status: 500 }
      )
    }

    const authResult = await verifyAdminAccess(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 403 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const algorithm = searchParams.get("algorithm") || "all"
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100)
    const search = searchParams.get("search")?.toLowerCase() || ""
    const sortBy = searchParams.get("sortBy") || "created"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    // Build query for profiles
    const profilesQuery = adminDb.collection("profiles").orderBy("created_at", "desc")

    // Get all profiles (we'll filter in memory for complex queries)
    const profilesSnap = await profilesQuery.get()

    // Process and enrich each user
    const allUsers: UserAlgorithmData[] = []

    for (const profileDoc of profilesSnap.docs) {
      const profileData = profileDoc.data()
      const userId = profileDoc.id
      const userAlgorithm = (profileData.spaced_repetition_algorithm || "sm2") as "sm2" | "fsrs"

      // Filter by algorithm
      if (algorithm !== "all" && userAlgorithm !== algorithm) {
        continue
      }

      // Filter by search
      const email = profileData.email?.toLowerCase() || ""
      const fullName = profileData.full_name?.toLowerCase() || ""
      if (search && !email.includes(search) && !fullName.includes(search)) {
        continue
      }

      // Get research summary for this user
      const researchSummaryDoc = await adminDb
        .collection("algorithm_research_metrics")
        .doc(userId)
        .collection("summary")
        .doc("current")
        .get()

      const researchData = researchSummaryDoc.exists ? researchSummaryDoc.data() : null

      // Get user stats as fallback
      const userStatsDoc = await adminDb.collection("user_stats").doc(userId).get()
      const userStats = userStatsDoc.exists ? userStatsDoc.data() : null

      // Get problem mastery for pattern breakdown
      const masterySnap = await adminDb
        .collection("user_problem_mastery")
        .doc(userId)
        .collection("problems")
        .get()

      // Calculate pattern breakdown
      const patternBreakdown: Record<
        string,
        { count: number; avgScore: number; mastered: number; totalScore: number }
      > = {}

      masterySnap.docs.forEach((doc) => {
        const data = doc.data()
        const pattern = data.pattern || "unknown"

        if (!patternBreakdown[pattern]) {
          patternBreakdown[pattern] = { count: 0, avgScore: 0, mastered: 0, totalScore: 0 }
        }

        patternBreakdown[pattern].count++
        patternBreakdown[pattern].totalScore += data.average_score || data.last_score || 0

        if (["mastered", "reviewing", "proficient", "expert"].includes(data.mastery_level)) {
          patternBreakdown[pattern].mastered++
        }
      })

      // Calculate averages
      const finalPatternBreakdown: Record<
        string,
        { count: number; avgScore: number; mastered: number }
      > = {}
      Object.entries(patternBreakdown).forEach(([pattern, stats]) => {
        finalPatternBreakdown[pattern] = {
          count: stats.count,
          avgScore: stats.count > 0 ? Math.round(stats.totalScore / stats.count) : 0,
          mastered: stats.mastered,
        }
      })

      const userData: UserAlgorithmData = {
        id: userId,
        email: profileData.email || "",
        fullName: profileData.full_name || null,
        algorithm: userAlgorithm,
        algorithmAssignedAt: researchData?.algorithm_assigned_at || profileData.created_at || null,
        algorithmOverridden: researchData?.algorithm_user_overridden || false,
        subscriptionTier: profileData.subscription_tier || "free",
        createdAt: profileData.created_at || "",
        lastActive: researchData?.last_review_at || userStats?.lastSessionAt || null,
        // Performance metrics
        totalReviews: researchData?.total_reviews || userStats?.totalSessions || 0,
        totalProblems: researchData?.total_problems_seen || masterySnap.docs.length || 0,
        problemsMastered:
          researchData?.problems_mastered ||
          masterySnap.docs.filter((d) => ["mastered", "reviewing"].includes(d.data().mastery_level))
            .length,
        averageScore: researchData?.lifetime_average_score || userStats?.averageScore || 0,
        retentionRate: researchData?.lifetime_retention_rate || 0,
        averageDailyReviews: researchData?.average_daily_reviews || 0,
        streakDays: profileData.streak_days || researchData?.current_streak || 0,
        totalPracticeMinutes:
          researchData?.total_time_spent_minutes || userStats?.totalPracticeMinutes || 0,
        patternBreakdown: finalPatternBreakdown,
      }

      allUsers.push(userData)
    }

    // Sort users
    allUsers.sort((a, b) => {
      let aVal: number | string
      let bVal: number | string

      switch (sortBy) {
        case "retention":
          aVal = a.retentionRate
          bVal = b.retentionRate
          break
        case "score":
          aVal = a.averageScore
          bVal = b.averageScore
          break
        case "reviews":
          aVal = a.totalReviews
          bVal = b.totalReviews
          break
        case "created":
        default:
          aVal = a.createdAt || ""
          bVal = b.createdAt || ""
          break
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })

    // Paginate
    const totalUsers = allUsers.length
    const totalPages = Math.ceil(totalUsers / limit)
    const startIndex = (page - 1) * limit
    const paginatedUsers = allUsers.slice(startIndex, startIndex + limit)

    // Calculate aggregate stats by algorithm
    const sm2Users = allUsers.filter((u) => u.algorithm === "sm2")
    const fsrsUsers = allUsers.filter((u) => u.algorithm === "fsrs")

    const aggregateStats = {
      sm2: {
        totalUsers: sm2Users.length,
        avgScore:
          sm2Users.length > 0
            ? Math.round(sm2Users.reduce((sum, u) => sum + u.averageScore, 0) / sm2Users.length)
            : 0,
        avgRetention:
          sm2Users.length > 0
            ? Math.round(sm2Users.reduce((sum, u) => sum + u.retentionRate, 0) / sm2Users.length)
            : 0,
        totalReviews: sm2Users.reduce((sum, u) => sum + u.totalReviews, 0),
        totalMastered: sm2Users.reduce((sum, u) => sum + u.problemsMastered, 0),
      },
      fsrs: {
        totalUsers: fsrsUsers.length,
        avgScore:
          fsrsUsers.length > 0
            ? Math.round(fsrsUsers.reduce((sum, u) => sum + u.averageScore, 0) / fsrsUsers.length)
            : 0,
        avgRetention:
          fsrsUsers.length > 0
            ? Math.round(fsrsUsers.reduce((sum, u) => sum + u.retentionRate, 0) / fsrsUsers.length)
            : 0,
        totalReviews: fsrsUsers.reduce((sum, u) => sum + u.totalReviews, 0),
        totalMastered: fsrsUsers.reduce((sum, u) => sum + u.problemsMastered, 0),
      },
    }

    // Calculate pattern distribution across all users
    const globalPatternStats: Record<
      string,
      {
        sm2: { users: number; totalProblems: number; mastered: number; avgScore: number }
        fsrs: { users: number; totalProblems: number; mastered: number; avgScore: number }
      }
    > = {}

    allUsers.forEach((user) => {
      Object.entries(user.patternBreakdown).forEach(([pattern, stats]) => {
        if (!globalPatternStats[pattern]) {
          globalPatternStats[pattern] = {
            sm2: { users: 0, totalProblems: 0, mastered: 0, avgScore: 0 },
            fsrs: { users: 0, totalProblems: 0, mastered: 0, avgScore: 0 },
          }
        }

        const algoStats = globalPatternStats[pattern][user.algorithm]
        algoStats.users++
        algoStats.totalProblems += stats.count
        algoStats.mastered += stats.mastered
        algoStats.avgScore =
          (algoStats.avgScore * (algoStats.users - 1) + stats.avgScore) / algoStats.users
      })
    })

    return NextResponse.json({
      success: true,
      data: {
        users: paginatedUsers,
        pagination: {
          page,
          limit,
          totalUsers,
          totalPages,
        },
        aggregateStats,
        patternStats: globalPatternStats,
      },
    })
  } catch (error) {
    console.error("Admin research users API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
