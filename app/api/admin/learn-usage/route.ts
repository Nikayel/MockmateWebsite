import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  errorResponse,
  parseAdminQueryParams,
  successResponse,
  unauthorizedResponse,
  withPermission,
  type AdminContext,
} from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { adminCache, CACHE_TTL, getCacheKey } from "@/lib/admin/cache"
import {
  getLearnerDirectory,
  getPlatformLearnUsageView,
  getUserLearnUsageView,
  LEARNER_DIRECTORY_SORT_KEYS,
  type LearnerDirectorySortKey,
  type LearnerDirectoryView,
  type PlatformLearnUsageView,
} from "@/lib/admin/learn-usage-views"
import { parseBoundedInt } from "@/lib/admin/query-params"
import { utcDayKey } from "@/lib/usage-tracking"

// Reads auth headers + query params — must run per-request.
export const dynamic = "force-dynamic"

/** "all" selects everything; the scan itself is still capped and coverage-reported. */
const ALL_TIME_DAY_FLOOR = "0000-00-00"

/**
 * Learn usage for the admin dashboard.
 *
 *  - GET ?timeRange=7d|30d|90d|all              → platform view (cached ~30s)
 *  - GET ?view=learners&page=…&search=…&sort=…  → learner directory (all accounts, paginated)
 *  - GET ?userId=…&timeRange=…                  → one user's lessons + day-by-day
 *
 * Base gate is view_analytics (matches the nav entry). The directory and per-user branches
 * additionally require view_user_details, same as the user-profile drawer they feed — an
 * analyst who can see platform totals cannot page through individual learners.
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

    if (request.nextUrl.searchParams.get("view") === "learners") {
      if (!context.permissions.includes(PERMISSIONS.VIEW_USER_DETAILS)) {
        return unauthorizedResponse(
          `Access denied - missing permission: ${PERMISSIONS.VIEW_USER_DETAILS}`
        )
      }
      const pageParam = parseBoundedInt(request.nextUrl.searchParams.get("page"), {
        min: 1,
        max: 10_000,
        fallback: 1,
      })
      const limitParam = parseBoundedInt(request.nextUrl.searchParams.get("limit"), {
        min: 1,
        max: 100,
        fallback: 25,
      })
      if (!pageParam.ok || !limitParam.ok) {
        return errorResponse("page and limit must be integers", 400)
      }
      const search = request.nextUrl.searchParams.get("search")?.trim().slice(0, 200) ?? ""
      const sortParam = request.nextUrl.searchParams.get("sort") ?? ""
      const sort = (LEARNER_DIRECTORY_SORT_KEYS as readonly string[]).includes(sortParam)
        ? (sortParam as LearnerDirectorySortKey)
        : undefined
      const dir = request.nextUrl.searchParams.get("dir") === "asc" ? "asc" : "desc"

      const cacheKey = getCacheKey("learn-usage-directory", {
        timeRange,
        page: String(pageParam.value),
        limit: String(limitParam.value),
        search,
        sort: sort ?? "activeMs",
        dir,
      })
      const cachedDirectory = adminCache.get<LearnerDirectoryView>(cacheKey)
      if (cachedDirectory) {
        return successResponse({ learners: cachedDirectory, cached: true })
      }
      const learners = await getLearnerDirectory(sinceDayKey, {
        page: pageParam.value,
        limit: limitParam.value,
        search: search || undefined,
        sort,
        dir,
      })
      adminCache.set(cacheKey, learners, CACHE_TTL.USAGE)
      return successResponse({ learners })
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
