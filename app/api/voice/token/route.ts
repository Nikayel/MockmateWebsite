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
import { getFlagAsync } from "@/lib/feature-flags"
import { logger } from "@/lib/logger"

export async function GET(request: NextRequest) {
  const rateLimitResult = await apiRateLimit(request)
  if (rateLimitResult) return rateLimitResult

  const authResult = await verifyAuth(request)
  if (!authResult.authenticated || !authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Kill switch, flippable from /admin/feature-flags without a deploy. Checked
  // after auth so an anonymous caller still gets 401 rather than learning the
  // platform's operational state. The awaited form is deliberate: a kill switch
  // read from a possibly-cold cache is the one case where the extra round trip
  // on a cold instance is worth paying for.
  if (await getFlagAsync("DISABLE_VOICE_MODE", authResult.userId)) {
    logger.info("[Voice Token] Refused: DISABLE_VOICE_MODE is on")
    return NextResponse.json(
      { error: "Voice transcription is currently disabled" },
      { status: 503 }
    )
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
