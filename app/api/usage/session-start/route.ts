/**
 * POST /api/usage/session-start
 *
 * Server-authoritative session-start quota write (QUOTA-1). The verified token
 * is the ONLY identity input (never a body userId); profile_quota is
 * client-read-only, so this route is the single path that spends a session or
 * a free open.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { apiRateLimit } from "@/lib/rate-limit"
import { recordSessionStartAdmin } from "@/lib/quota/session-start-admin"
import { trackEventServer } from "@/lib/analytics-server"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  const rateLimitResult = await apiRateLimit(request)
  if (rateLimitResult) return rateLimitResult

  const authResult = await verifyAuth(request)
  if (!authResult.authenticated || !authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await recordSessionStartAdmin(authResult.userId)

    if (!result.success) {
      return NextResponse.json({ error: "Session limit exceeded", ...result }, { status: 403 })
    }

    // Funnel: every paid-session spend, server-observed, so it counts
    // regardless of client consent state. sessions_used resets each period,
    // so "first ever" is NOT derivable from nth_in_period alone; the userId
    // makes distinct-firsts computable downstream instead of baking a flag
    // that would re-fire every month. trackEventServer never throws.
    if (result.usedPaidSession) {
      await trackEventServer("funnel_session_start", {
        userId: authResult.userId,
        nth_in_period: result.sessionsUsed,
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.error("[SessionStart] Failed to record session start", {
      userId: authResult.userId,
      error,
    })
    return NextResponse.json({ error: "Failed to record session start" }, { status: 500 })
  }
}
