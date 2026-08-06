/**
 * Voice Usage Tracking API
 *
 * Tracks Deepgram speech-to-text usage per user.
 * Called from the client after voice transcription sessions.
 *
 * Because duration is client-reported and drives billing cost, the request is
 * rate-limited and the payload is validated + bounded before it is trusted.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAuth } from "firebase-admin/auth"
import "@/lib/firebase-admin" // Initialize Firebase Admin
import { apiRateLimit } from "@/lib/rate-limit"
import { trackVoiceUsage, DEEPGRAM_COSTS } from "@/lib/usage-tracking"
import { logger } from "@/lib/logger"

// A single voice turn cannot bill more than one hour, and the transcript length
// is bounded so a forged value cannot inflate stored usage metadata.
const voiceUsageSchema = z.object({
  sessionId: z.string().max(256).optional(),
  durationSeconds: z.number().positive().max(3600),
  model: z.string().max(64).optional().default("nova-3"),
  transcriptLength: z.number().int().nonnegative().max(1_000_000).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await apiRateLimit(req)
    if (rateLimitResult) return rateLimitResult

    // Verify authentication
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse + validate request body (rejects out-of-range duration and bounds
    // the transcript length before the values reach usage/cost tracking).
    const parsed = voiceUsageSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid durationSeconds" }, { status: 400 })
    }

    const { sessionId, durationSeconds, model, transcriptLength } = parsed.data

    // Keep the model whitelist against the known Deepgram cost table
    if (!Object.keys(DEEPGRAM_COSTS).includes(model)) {
      return NextResponse.json({ error: "Invalid model" }, { status: 400 })
    }

    // Track the usage
    await trackVoiceUsage({
      userId,
      sessionId,
      durationSeconds,
      model: model as keyof typeof DEEPGRAM_COSTS,
      transcriptLength,
    })

    logger.info("[Voice Usage] Tracked usage", { userId, durationSeconds })

    return NextResponse.json({
      success: true,
      tracked: {
        durationSeconds,
        model,
      },
    })
  } catch (error) {
    logger.error("[Voice Usage API] Error", { error })
    return NextResponse.json({ error: "Failed to track voice usage" }, { status: 500 })
  }
}
