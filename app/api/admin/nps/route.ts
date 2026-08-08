/**
 * Admin NPS API
 *
 * Endpoints for viewing NPS (Net Promoter Score) data.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { getNPSStats } from "@/lib/nps"
import { requirePermission, errorResponse, unauthorizedResponse } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { parseBoundedInt } from "@/lib/admin/query-params"
import { logger } from "@/lib/logger"

async function getRecentNPSResponses(limit: number = 50) {
  const snapshot = await adminDb
    .collection("nps_responses")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get()

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  }))
}

/**
 * GET /api/admin/nps
 *
 * Get NPS statistics and recent responses
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, PERMISSIONS.VIEW_ANALYTICS)
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error!, authResult.status || 403)
  }

  const { searchParams } = new URL(request.url)
  const view = searchParams.get("view") || "overview"

  try {
    switch (view) {
      case "overview": {
        const [stats, recentResponses] = await Promise.all([
          getNPSStats(),
          getRecentNPSResponses(20),
        ])

        return NextResponse.json({
          success: true,
          data: {
            stats,
            recentResponses,
          },
        })
      }

      case "responses": {
        // Reaches a Firestore .limit(); parseInt("abc") is NaN, which is no bound.
        const limitParam = parseBoundedInt(searchParams.get("limit"), {
          min: 1,
          max: 200,
          fallback: 50,
        })
        if (!limitParam.ok) {
          return errorResponse(`Invalid limit: ${limitParam.error}`, 400)
        }
        const responses = await getRecentNPSResponses(limitParam.value)

        return NextResponse.json({
          success: true,
          data: { responses },
        })
      }

      default:
        return errorResponse(`Unknown view: ${view}`, 400)
    }
  } catch (error) {
    logger.error("[Admin NPS API] Error", { error })
    return errorResponse("Failed to fetch NPS data", 500)
  }
}
