/**
 * GET /api/voice/token
 *
 * Returns the Deepgram API key for authenticated users.
 * This keeps the key server-side instead of exposing it via NEXT_PUBLIC_.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { apiRateLimit } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  const rateLimitResult = await apiRateLimit(request)
  if (rateLimitResult) return rateLimitResult

  const authResult = await verifyAuth(request)
  if (!authResult.authenticated || !authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.DEEPGRAM_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Voice transcription not configured" }, { status: 503 })
  }

  return NextResponse.json({ apiKey })
}
