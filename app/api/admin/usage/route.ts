/**
 * Admin Usage API
 *
 * Endpoints for viewing and managing user AI usage.
 * Requires admin authentication via Firebase ID token with RBAC.
 *
 * This handler parses, authorises, validates and dispatches. The querying and
 * aggregation live in lib/admin/usage-views.ts and lib/admin/usage-health.ts,
 * which read through the shared primitives in lib/usage/ so budget caps, scan
 * limits and cost accumulation are each defined once.
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
import {
  buildSessionsView,
  buildScenariosView,
  buildUserSessionsView,
} from "@/lib/admin/usage-views"
import { getUsageHealth } from "@/lib/admin/usage-health"
import { resolveTier, resolveBudgetCap, hasBudgetOverride } from "@/lib/usage/budget"
import { anyTruncated } from "@/lib/usage/scan-limits"

/** Views this endpoint can render. */
const VIEWS = ["overview", "users", "user", "sessions", "scenarios"] as const
type UsageView = (typeof VIEWS)[number]

/** Rows a single request may ask for. Bounds the work an admin can trigger. */
const MAX_LIMIT = 200
const DEFAULT_LIMIT = 50

function parseLimit(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? "", 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT
  return Math.min(parsed, MAX_LIMIT)
}

/**
 * GET /api/admin/usage
 *
 * Query params:
 * - view: 'overview' | 'users' | 'user' | 'sessions' | 'scenarios' (default: 'overview')
 * - userId: string (required if view=user)
 * - limit: number (rows, default 50, max 200)
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, PERMISSIONS.VIEW_AI_USAGE)
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error!, authResult.status || 403)
  }

  const { searchParams } = new URL(request.url)
  const requestedView = searchParams.get("view") || "overview"
  const userId = searchParams.get("userId")
  const limit = parseLimit(searchParams.get("limit"))

  if (!VIEWS.includes(requestedView as UsageView)) {
    return errorResponse(`Unknown view: ${requestedView}`, 400)
  }
  const view = requestedView as UsageView

  try {
    switch (view) {
      case "overview":
        return NextResponse.json({ success: true, data: await buildOverview() })

      case "users": {
        const stats = await getAdminUsageStats()
        return NextResponse.json({
          success: true,
          data: {
            users: stats.userStats,
            total: stats.userStats.length,
            coverage: stats.coverage,
          },
        })
      }

      case "user": {
        if (!userId) {
          return errorResponse("userId is required for user view", 400)
        }
        const data = await buildUserDetail(userId)
        if (!data) {
          return errorResponse("User not found or no usage data", 404)
        }
        return NextResponse.json({ success: true, data })
      }

      case "sessions":
        return NextResponse.json({ success: true, data: await buildSessionsView(limit) })

      case "scenarios":
        return NextResponse.json({ success: true, data: await buildScenariosView() })
    }
  } catch (error) {
    console.error("[Admin Usage API] Error fetching usage data:", error)
    return errorResponse(error instanceof Error ? error.message : "Failed to fetch usage data", 500)
  }
}

/**
 * The overview panel.
 *
 * `averageCostPerUser` divides by the accounts that actually spent something
 * rather than by every account ever registered, which is what the old figure
 * did and why it read far lower than reality.
 */
async function buildOverview() {
  const [stats, cacheStats, serviceBreakdown, granularBreakdown, dailyTrends, scenarioView] =
    await Promise.all([
      getAdminUsageStats(),
      getCacheStats(),
      getServiceBreakdown(),
      getGranularUsageBreakdown(),
      getDailyUsageTrends(30),
      buildScenariosView(),
    ])

  const sessionsCounted = scenarioView.scenarios.reduce((sum, s) => sum + s.sessionCount, 0)

  const health = await getUsageHealth({
    totalCost: stats.totalCost,
    activeUsers: stats.activeUsers,
    sessionsCounted,
  })

  return {
    overview: {
      totalUsers: stats.totalUsers,
      activeUsers: stats.activeUsers,
      totalCost: stats.totalCost,
      totalRequests: stats.totalRequests,
      totalTokens: dailyTrends.totals.tokens,
      averageCostPerUser: health.unitEconomics.costPerActiveUser ?? 0,
      averageTokensPerRequest:
        dailyTrends.totals.requests > 0
          ? Math.round(dailyTrends.totals.tokens / dailyTrends.totals.requests)
          : 0,
    },
    health,
    cache: cacheStats,
    topUsers: stats.userStats.slice(0, 20),
    budgetCaps: BUDGET_CAPS,
    services: serviceBreakdown.byService,
    providers: serviceBreakdown.byProvider,
    granular: {
      byPattern: granularBreakdown.byPattern,
      byDifficulty: granularBreakdown.byDifficulty,
      topCostlyScenarios: granularBreakdown.topCostlyScenarios.slice(0, 10),
      topTokenScenarios: granularBreakdown.topTokenScenarios.slice(0, 10),
    },
    trends: {
      daily: dailyTrends.daily,
      totals: dailyTrends.totals,
    },
    costs: {
      llm: PROVIDER_COSTS,
      voice: DEEPGRAM_COSTS,
      embeddings: EMBEDDING_COSTS,
    },
    // Every total above is built from a bounded scan. When any of them hit its
    // cap the figures are lower bounds, and the dashboard says so rather than
    // presenting a partial month as complete.
    coverage: {
      events: serviceBreakdown.coverage,
      granular: granularBreakdown.coverage,
      trends: dailyTrends.coverage,
      userSummaries: stats.coverage,
      sessions: scenarioView.coverage,
      anyTruncated: anyTruncated(
        serviceBreakdown.coverage,
        granularBreakdown.coverage,
        dailyTrends.coverage,
        stats.coverage,
        scenarioView.coverage
      ),
    },
  }
}

/** One user's spend, budget standing and recent sessions. */
async function buildUserDetail(userId: string) {
  const summary = await getUserUsageSummary(userId)
  if (!summary) return null

  // Profiles live in `profiles`; `users/{id}` holds only subcollections.
  const [profileDoc, serviceBreakdown, sessions] = await Promise.all([
    adminDb.collection("profiles").doc(userId).get(),
    getUserServiceBreakdown(userId),
    buildUserSessionsView(userId),
  ])
  const profile = profileDoc.data()

  return {
    user: {
      id: userId,
      email: profile?.email ?? null,
      tier: resolveTier(profile),
      budgetCap: resolveBudgetCap(profile),
      hasBudgetOverride: hasBudgetOverride(profile),
      createdAt: profile?.created_at ?? null,
    },
    usage: summary,
    services: serviceBreakdown,
    sessions,
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
