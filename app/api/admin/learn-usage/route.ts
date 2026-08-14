import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  parseAdminQueryParams,
  successResponse,
  unauthorizedResponse,
  withPermission,
  type AdminContext,
} from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { adminCache, CACHE_TTL, getCacheKey } from "@/lib/admin/cache"
import {
  getPlatformLearnUsageView,
  getUserLearnUsageView,
  type PlatformLearnUsageView,
} from "@/lib/admin/learn-usage-views"
import { utcDayKey } from "@/lib/usage-tracking"

// Reads auth headers + query params — must run per-request.
export const dynamic = "force-dynamic"

/** "all" selects everything; the scan itself is still capped and coverage-reported. */
const ALL_TIME_DAY_FLOOR = "0000-00-00"

/**
 * Learn usage for the admin dashboard.
 *
 *  - GET ?timeRange=7d|30d|90d|all              → platform view (cached ~30s)
 *  - GET ?userId=…&timeRange=…                  → one user's lessons + day-by-day
 *
 * Base gate is view_analytics (matches the nav entry). The per-user branch additionally
 * requires view_user_details, same as the user-profile drawer it feeds — an analyst who can
 * see platform totals cannot page through individual learners.
 */
export const GET = withPermission(
  PERMISSIONS.VIEW_ANALYTICS,
  async (request: NextRequest, context: AdminContext): Promise<NextResponse> => {
    const { timeRange, startDate } = parseAdminQueryParams(request)
    const sinceDayKey = startDate ? utcDayKey(startDate) : ALL_TIME_DAY_FLOOR

    const userId = request.nextUrl.searchParams.get("userId")?.trim()
    if (userId) {
      if (!context.permissions.includes(PERMISSIONS.VIEW_USER_DETAILS)) {
        return unauthorizedResponse(
          `Access denied - missing permission: ${PERMISSIONS.VIEW_USER_DETAILS}`
        )
      }
      const user = await getUserLearnUsageView(userId, sinceDayKey)
      return successResponse({ user })
    }

    const cacheKey = getCacheKey("learn-usage", { timeRange })
    const cached = adminCache.get<PlatformLearnUsageView>(cacheKey)
    if (cached) {
      return successResponse({ platform: cached, cached: true })
    }

    const platform = await getPlatformLearnUsageView(sinceDayKey)
    adminCache.set(cacheKey, platform, CACHE_TTL.USAGE)
    return successResponse({ platform })
  }
)
