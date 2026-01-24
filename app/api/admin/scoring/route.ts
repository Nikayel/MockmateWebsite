import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess, parseAdminQueryParams } from "@/lib/admin/middleware"
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
    const conflictLimit = parseInt(searchParams.get("conflictLimit") || "20", 10)

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
    logger.error("[Admin Scoring API] Error fetching analytics", { error })

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch scoring analytics",
      },
      { status: 500 }
    )
  }
}
