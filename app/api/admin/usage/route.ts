/**
 * Admin Usage API
 *
 * Endpoints for viewing and managing user usage data.
 * Requires admin authentication via Firebase ID token with RBAC.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import {
  getAdminUsageStats,
  getUserUsageSummary,
  getServiceBreakdown,
  getUserServiceBreakdown,
  getGranularUsageBreakdown,
  getDailyUsageTrends,
  BUDGET_CAPS,
  DEEPGRAM_COSTS,
  EMBEDDING_COSTS,
  PROVIDER_COSTS,
} from "@/lib/usage-tracking"
import { getCacheStats } from "@/lib/ai-cache"
import {
  verifyAdminAccess,
  requirePermission,
  successResponse,
  errorResponse,
  unauthorizedResponse,
  type AdminContext,
} from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { logAdminAction } from "@/lib/admin/audit"

/**
 * GET /api/admin/usage
 *
 * Get usage statistics
 *
 * Query params:
 * - view: 'overview' | 'users' | 'user' | 'sessions' | 'scenarios' (default: 'overview')
 * - userId: string (required if view=user)
 * - limit: number (for pagination, default: 50)
 * - offset: number (for pagination, default: 0)
 */
export async function GET(request: NextRequest) {
  // Verify admin access with VIEW_AI_USAGE permission
  const authResult = await requirePermission(request, PERMISSIONS.VIEW_AI_USAGE)
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error!, authResult.status || 403)
  }

  const adminContext = authResult.context!

  const { searchParams } = new URL(request.url)
  const view = searchParams.get("view") || "overview"
  const userId = searchParams.get("userId")
  const limit = parseInt(searchParams.get("limit") || "50", 10)
  const offset = parseInt(searchParams.get("offset") || "0", 10)

  try {
    switch (view) {
      case "overview": {
        // Get all usage data in parallel for performance
        const [stats, cacheStats, serviceBreakdown, granularBreakdown, dailyTrends] =
          await Promise.all([
            getAdminUsageStats(),
            getCacheStats(),
            getServiceBreakdown(),
            getGranularUsageBreakdown(),
            getDailyUsageTrends(30),
          ])

        return NextResponse.json({
          success: true,
          data: {
            overview: {
              totalUsers: stats.totalUsers,
              totalCost: stats.totalCost,
              totalRequests: stats.totalRequests,
              totalTokens: dailyTrends.totals.tokens,
              averageCostPerUser: stats.totalUsers > 0 ? stats.totalCost / stats.totalUsers : 0,
              averageTokensPerRequest:
                dailyTrends.totals.requests > 0
                  ? Math.round(dailyTrends.totals.tokens / dailyTrends.totals.requests)
                  : 0,
            },
            cache: cacheStats,
            topUsers: stats.userStats.slice(0, 20),
            budgetCaps: BUDGET_CAPS,
            // Service breakdown by type
            services: serviceBreakdown.byService,
            providers: serviceBreakdown.byProvider,
            // Granular breakdown by pattern, difficulty, scenario
            granular: {
              byPattern: granularBreakdown.byPattern,
              byDifficulty: granularBreakdown.byDifficulty,
              topCostlyScenarios: granularBreakdown.topCostlyScenarios.slice(0, 10),
              topTokenScenarios: granularBreakdown.topTokenScenarios.slice(0, 10),
            },
            // Daily trends for charting
            trends: {
              daily: dailyTrends.daily,
              totals: dailyTrends.totals,
            },
            // Cost reference
            costs: {
              llm: PROVIDER_COSTS,
              voice: DEEPGRAM_COSTS,
              embeddings: EMBEDDING_COSTS,
            },
          },
        })
      }

      case "users": {
        // Get all users with usage
        const stats = await getAdminUsageStats()

        return NextResponse.json({
          success: true,
          data: {
            users: stats.userStats,
            total: stats.userStats.length,
          },
        })
      }

      case "user": {
        if (!userId) {
          return NextResponse.json({ error: "userId is required for user view" }, { status: 400 })
        }

        const summary = await getUserUsageSummary(userId)
        if (!summary) {
          return NextResponse.json({ error: "User not found or no usage data" }, { status: 404 })
        }

        // Get user profile and service breakdown
        const userDoc = await adminDb.collection("users").doc(userId).get()
        const profile = userDoc.data()
        const serviceBreakdown = await getUserServiceBreakdown(userId)

        // Get user's sessions with costs
        let userSessions: any[] = []
        try {
          const sessionsSnapshot = await adminDb
            .collection("interview_sessions")
            .where("user_id", "==", userId)
            .orderBy("created_at", "desc")
            .limit(20)
            .get()

          userSessions = await Promise.all(
            sessionsSnapshot.docs.map(async (doc) => {
              const session = doc.data()

              // Get cost for this session from usage_events
              let sessionCost = 0
              let sessionTokens = 0

              try {
                const eventsSnapshot = await adminDb
                  .collection("usage_events")
                  .where("sessionId", "==", doc.id)
                  .get()

                for (const event of eventsSnapshot.docs) {
                  sessionCost += event.data().cost || 0
                  sessionTokens += event.data().totalTokens || 0
                }
              } catch {
                // usage_events query failed
              }

              return {
                sessionId: doc.id,
                scenarioTitle: session.scenario_title || "Unknown",
                scenarioType: session.scenario_type || "dsa",
                difficulty: session.difficulty || "medium",
                pattern: session.pattern || "unknown",
                status: session.status || "in_progress",
                cost: sessionCost,
                tokens: sessionTokens,
                createdAt:
                  session.created_at?.toDate?.()?.toISOString() || session.created_at || null,
              }
            })
          )
        } catch (err) {
          console.error("[Admin Usage API] Error fetching user sessions:", err)
        }

        return NextResponse.json({
          success: true,
          data: {
            user: {
              id: userId,
              email: profile?.email,
              tier: profile?.subscription_tier || "free",
              createdAt: profile?.created_at,
            },
            usage: summary,
            services: serviceBreakdown,
            sessions: userSessions,
          },
        })
      }

      case "sessions": {
        // Get recent sessions with their costs
        // Note: Firestore doesn't support offset, so we use simple limit for now
        const sessionsSnapshot = await adminDb
          .collection("interview_sessions")
          .orderBy("created_at", "desc")
          .limit(limit)
          .get()

        const sessions = await Promise.all(
          sessionsSnapshot.docs.map(async (doc) => {
            const session = doc.data()

            // Get cost for this session from usage_events
            let cost = 0
            let tokens = 0
            let requestCount = 0

            try {
              const eventsSnapshot = await adminDb
                .collection("usage_events")
                .where("sessionId", "==", doc.id)
                .get()

              for (const event of eventsSnapshot.docs) {
                cost += event.data().cost || 0
                tokens += event.data().totalTokens || 0
                requestCount++
              }
            } catch {
              // usage_events query failed, use 0
            }

            // Get user email
            let userEmail = "Unknown"
            if (session.user_id) {
              try {
                const userDoc = await adminDb.collection("users").doc(session.user_id).get()
                userEmail = userDoc.data()?.email || "Unknown"
              } catch {
                // User lookup failed
              }
            }

            return {
              sessionId: doc.id,
              userId: session.user_id,
              userEmail,
              scenarioTitle: session.scenario_title || "Unknown",
              scenarioId: session.scenario_id,
              scenarioType: session.scenario_type || "dsa",
              difficulty: session.difficulty || "medium",
              pattern: session.pattern || "unknown",
              status: session.status || "in_progress",
              cost,
              tokens,
              requestCount,
              performanceScore: session.performance_score,
              createdAt:
                session.created_at?.toDate?.()?.toISOString() || session.created_at || null,
              completedAt:
                session.completed_at?.toDate?.()?.toISOString() || session.completed_at || null,
            }
          })
        )

        return NextResponse.json({
          success: true,
          data: {
            sessions,
            total: sessions.length,
          },
        })
      }

      case "scenarios": {
        // Get scenario stats from interview_sessions directly
        // Group by scenario_id and aggregate
        const sessionsSnapshot = await adminDb
          .collection("interview_sessions")
          .orderBy("created_at", "desc")
          .limit(500)
          .get()

        // Aggregate by scenario
        const scenarioMap = new Map<
          string,
          {
            scenarioId: string
            scenarioTitle: string
            pattern: string
            difficulty: string
            sessionCount: number
            totalCost: number
            totalTokens: number
          }
        >()

        // First pass: aggregate sessions
        for (const doc of sessionsSnapshot.docs) {
          const session = doc.data()
          const scenarioId = session.scenario_id || "unknown"

          if (!scenarioMap.has(scenarioId)) {
            scenarioMap.set(scenarioId, {
              scenarioId,
              scenarioTitle: session.scenario_title || "Unknown",
              pattern: session.pattern || "unknown",
              difficulty: session.difficulty || "medium",
              sessionCount: 0,
              totalCost: 0,
              totalTokens: 0,
            })
          }

          const entry = scenarioMap.get(scenarioId)!
          entry.sessionCount++
        }

        // Second pass: get costs from usage_events for each scenario
        const scenarioStats = await Promise.all(
          Array.from(scenarioMap.values()).map(async (scenario) => {
            let cost = 0
            let tokens = 0
            let requests = 0

            try {
              const eventsSnapshot = await adminDb
                .collection("usage_events")
                .where("scenarioId", "==", scenario.scenarioId)
                .limit(1000)
                .get()

              for (const event of eventsSnapshot.docs) {
                cost += event.data().cost || 0
                tokens += event.data().totalTokens || 0
                requests++
              }
            } catch {
              // usage_events query failed
            }

            return {
              ...scenario,
              cost,
              tokens,
              requests,
              avgTokensPerRequest: requests > 0 ? Math.round(tokens / requests) : 0,
              avgCostPerSession: scenario.sessionCount > 0 ? cost / scenario.sessionCount : 0,
            }
          })
        )

        // Sort by cost descending
        scenarioStats.sort((a, b) => b.cost - a.cost)

        return NextResponse.json({
          success: true,
          data: {
            scenarios: scenarioStats.slice(0, 50),
          },
        })
      }

      default:
        return errorResponse(`Unknown view: ${view}`, 400)
    }
  } catch (error) {
    console.error("[Admin Usage API] Error fetching usage data:", error)
    return errorResponse(error instanceof Error ? error.message : "Failed to fetch usage data", 500)
  }
}

// Budget validation constants
const MIN_BUDGET = 0
const MAX_BUDGET = 10000 // $10,000 max budget cap

/**
 * POST /api/admin/usage
 *
 * Admin actions
 *
 * Body:
 * - action: 'set_budget' | 'clear_cache'
 * - userId: string (for set_budget)
 * - budget: number (for set_budget)
 */
export async function POST(request: NextRequest) {
  // Verify admin access with MANAGE_BUDGETS permission
  const authResult = await requirePermission(request, PERMISSIONS.MANAGE_BUDGETS)
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error!, authResult.status || 403)
  }

  const adminContext = authResult.context!

  try {
    const body = await request.json()
    const { action, userId, budget } = body

    switch (action) {
      case "set_budget": {
        // Validate required fields
        if (!userId || typeof userId !== "string") {
          return errorResponse("userId is required and must be a string", 400)
        }

        if (budget === undefined || budget === null) {
          return errorResponse("budget is required", 400)
        }

        // Validate budget is a number
        const budgetNum = Number(budget)
        if (isNaN(budgetNum)) {
          return errorResponse("budget must be a valid number", 400)
        }

        // Validate budget range
        if (budgetNum < MIN_BUDGET || budgetNum > MAX_BUDGET) {
          return errorResponse(`budget must be between $${MIN_BUDGET} and $${MAX_BUDGET}`, 400)
        }

        // Verify user exists
        const userDoc = await adminDb.collection("profiles").doc(userId).get()
        if (!userDoc.exists) {
          return errorResponse("User not found", 404)
        }

        // Update user's custom budget
        await adminDb.collection("profiles").doc(userId).update({
          custom_budget_cap: budgetNum,
          updated_at: new Date().toISOString(),
        })

        // Log admin action
        await logAdminAction(adminContext.userId, "set_user_budget", {
          targetUserId: userId,
          previousBudget: userDoc.data()?.custom_budget_cap,
          newBudget: budgetNum,
        })

        return successResponse({
          message: `Budget set to $${budgetNum} for user ${userId}`,
          userId,
          budget: budgetNum,
        })
      }

      case "clear_cache": {
        // Import clearCache dynamically to avoid circular deps
        const { clearCache } = await import("@/lib/ai-cache")
        const cleared = await clearCache()

        // Log admin action
        await logAdminAction(adminContext.userId, "clear_cache", {
          timestamp: new Date().toISOString(),
        })

        return successResponse({
          message: "AI cache cleared successfully",
          cleared,
        })
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400)
    }
  } catch (error) {
    console.error("[Admin Usage API] Error performing action:", error)
    return errorResponse(error instanceof Error ? error.message : "Failed to perform action", 500)
  }
}
