import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

export async function handleRecordFeedback(params: {
  hintId: string
  feedbackType: "helpful" | "unhelpful"
  userId?: string
  sessionId?: string
  problemId?: string
  hintText?: string
  source?: string
}) {
  const { hintId, feedbackType, userId, sessionId, problemId, source } = params

  if (!hintId || !feedbackType) {
    return NextResponse.json({ error: "hintId and feedbackType are required" }, { status: 400 })
  }

  logger.info("[RAG Feedback]", {
    hintId,
    feedbackType,
    userId: userId || "anonymous",
    sessionId,
    problemId,
    source: source || "unknown",
    timestamp: new Date().toISOString(),
  })

  return NextResponse.json({
    success: true,
    message: `Feedback recorded: ${feedbackType}`,
  })
}
