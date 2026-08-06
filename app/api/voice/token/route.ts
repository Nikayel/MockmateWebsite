/**
 * GET /api/voice/token
 *
 * Returns a short-lived Deepgram access token for authenticated users. Granting
 * a token per request keeps the long-lived account key server-side so the
 * browser never receives reusable, full-scope credentials.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { apiRateLimit } from "@/lib/rate-limit"
import { grantDeepgramAccessToken } from "@/lib/voice/deepgram-auth"
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

  const granted = await grantDeepgramAccessToken(accountKey)
  if (granted) {
    return NextResponse.json({
      accessToken: granted.accessToken,
      expiresIn: granted.expiresIn,
    })
  }

  // The grant failed. Refuse rather than hand the long-lived account key to the
  // browser: voice degrades to a visible client error while the credential
  // stays server-side.
  logger.error(
    "[Voice Token] Deepgram access-token grant failed; refusing to serve voice. " +
      "DEEPGRAM_API_KEY must be a valid key with at least Member permission."
  )
  return NextResponse.json(
    { error: "Voice transcription temporarily unavailable" },
    { status: 503 }
  )
}
