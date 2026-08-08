import { NextResponse } from "next/server"
import { withPermission, parseAdminQueryParams } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { parseBoundedInt } from "@/lib/admin/query-params"
import { adminCache, getCacheKey, CACHE_TTL } from "@/lib/admin/cache"
import {
  getConstitutionalAIStats,
  getRecentInterventions,
  getAnalyticsTimeSeries,
  getConflicts,
} from "@/lib/scoring/analytics-persistence"
import type {
  ScoringAnalyticsRequest,
  ScoringAnalyticsResponse,
} from "@/lib/scoring/analytics-types"
import { logger } from "@/lib/logger"

/**
 * Admin Scoring Analytics API
 *
 * Returns Constitutional AI and scoring analytics:
 * - Score critique statistics (how often AI corrects scores)
 * - Feedback critique statistics
 * - Category-level adjustments
 * - Score accuracy metrics
 * - Conflict analysis (when AI and initial scoring disagree)
 * - Time series data for charts
 *
 * Platform-wide scoring behaviour, so VIEW_ANALYTICS. It previously accepted any
 * admin role, including support.
 */
export const GET = withPermission(PERMISSIONS.VIEW_ANALYTICS, async (request) => {
  try {
    // Parse query params
    const { timeRange } = parseAdminQueryParams(request)
    const searchParams = request.nextUrl.searchParams
    const scenarioType = searchParams.get("scenarioType") as
      | "dsa"
      | "system_design"
      | "bug_fix"
      | "all"
      | null
    const includeTimeSeries = searchParams.get("includeTimeSeries") !== "false"
    const includeConflicts = searchParams.get("includeConflicts") !== "false"
    // conflictLimit reaches a Firestore .limit(); unbounded it is a full scan.
    const conflictLimitParam = parseBoundedInt(searchParams.get("conflictLimit"), {
      min: 1,
      max: 200,
      fallback: 20,
    })
    if (!conflictLimitParam.ok) {
      return NextResponse.json(
        { success: false, error: `Invalid conflictLimit: ${conflictLimitParam.error}` },
        { status: 400 }
      )
    }
    const conflictLimit = conflictLimitParam.value

    // Build request object
    const analyticsRequest: ScoringAnalyticsRequest = {
      timeRange: timeRange as "7d" | "30d" | "90d" | "all",
      scenarioType: scenarioType || "all",
      includeTimeSeries,
      includeConflicts,
      conflictLimit,
    }

    // Check cache
    const cacheKey = getCacheKey("scoring-analytics", {
      timeRange,
      scenarioType: scenarioType || "all",
    })
    const cached = adminCache.get<ScoringAnalyticsResponse>(cacheKey)
    if (cached) {
      return NextResponse.json({ ...cached, cached: true })
    }

    // Fetch data in parallel
    const [stats, recentInterventions, timeSeries, conflicts] = await Promise.all([
      getConstitutionalAIStats(analyticsRequest),
      getRecentInterventions(50, scenarioType || undefined),
      includeTimeSeries ? getAnalyticsTimeSeries(analyticsRequest.timeRange) : Promise.resolve([]),
      includeConflicts ? getConflicts(conflictLimit) : Promise.resolve([]),
    ])

    // Add conflicts to stats
    if (includeConflicts) {
      stats.conflicts = conflicts
    }

    const response: ScoringAnalyticsResponse = {
      success: true,
      data: {
        stats,
        timeSeries: includeTimeSeries ? timeSeries : undefined,
        recentInterventions,
      },
    }

    // Cache for 60 seconds
    adminCache.set(cacheKey, response, CACHE_TTL.ANALYTICS)

    return NextResponse.json(response)
  } catch (error) {
    // Detail stays in the server log. Returning error.message here handed the
    // caller Firestore index URLs and collection names.
    logger.error("[Admin Scoring API] Error fetching analytics", { error })

    return NextResponse.json(
      { success: false, error: "Failed to fetch scoring analytics" },
      { status: 500 }
    )
  }
})
