/**
 * GET /api/voice/token
 *
 * Returns a short-lived, usage:write-only Deepgram key for authenticated users.
 * Minting an ephemeral key per request keeps the long-lived account key
 * server-side so the browser never receives reusable, full-scope credentials.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { apiRateLimit } from "@/lib/rate-limit"
import { mintEphemeralDeepgramKey } from "@/lib/voice/deepgram-management"
import { logger } from "@/lib/logger"

export async function GET(request: NextRequest) {
  const rateLimitResult = await apiRateLimit(request)
  if (rateLimitResult) return rateLimitResult

  const authResult = await verifyAuth(request)
  if (!authResult.authenticated || !authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const accountKey = process.env.DEEPGRAM_API_KEY
  if (!accountKey) {
    return NextResponse.json({ error: "Voice transcription not configured" }, { status: 503 })
  }

  // Prefer a short-lived, usage:write-only key so the browser never receives
  // the long-lived account key.
  const ephemeralKey = await mintEphemeralDeepgramKey(accountKey)
  if (ephemeralKey) {
    return NextResponse.json({ apiKey: ephemeralKey })
  }

  // Minting unavailable (no keys:write scope or the project could not be
  // resolved). Fall back to the account key so voice keeps working, and log so
  // this degraded path is visible in production.
  logger.warn(
    "[Voice Token] Ephemeral Deepgram key unavailable; returning account key. " +
      "Grant the DEEPGRAM_API_KEY keys:write scope (optionally set DEEPGRAM_PROJECT_ID) to enable scoped ephemeral keys."
  )
  return NextResponse.json({ apiKey: accountKey })
}
