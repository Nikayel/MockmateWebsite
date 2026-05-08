/**
 * Voice Usage Tracking API
 *
 * Tracks Deepgram speech-to-text usage per user.
 * Called from the client after voice transcription sessions.
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import "@/lib/firebase-admin" // Initialize Firebase Admin
import { trackVoiceUsage, DEEPGRAM_COSTS } from "@/lib/usage-tracking"
import { logger } from "@/lib/logger"

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse request body
    const body = await req.json()
    const { sessionId, durationSeconds, model = "nova-2", transcriptLength } = body

    // Validate required fields
    if (typeof durationSeconds !== "number" || durationSeconds <= 0) {
      return NextResponse.json({ error: "Invalid durationSeconds" }, { status: 400 })
    }

    // Validate model
    if (model && !Object.keys(DEEPGRAM_COSTS).includes(model)) {
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
