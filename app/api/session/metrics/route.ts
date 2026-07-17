/**
 * Session Metrics API
 *
 * Tracks session events in real-time:
 * - Session start
 * - Chat messages
 * - Hint reveals
 * - Code executions
 * - Session completion
 */

import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"
import {
  initSessionMetrics,
  trackChatMessage,
  trackHintReveal,
  trackCodeExecution,
  trackFileView,
  trackOptimizationAttempt,
  trackAISuggestionApplied,
  completeSessionMetrics,
  getSessionMetrics,
  verifySessionOwnership,
} from "@/lib/session-metrics"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    const body = await request.json()
    const { event, sessionId, data } = body

    if (!event || !sessionId) {
      return NextResponse.json({ error: "Missing event or sessionId" }, { status: 400 })
    }

    // session_start establishes ownership (it writes userId onto the new session). Every
    // other event targets an existing session, so confirm the caller owns it — otherwise a
    // signed-in user could pass someone else's sessionId and corrupt or read their metrics.
    if (event !== "session_start") {
      const ownership = await verifySessionOwnership(sessionId, userId)
      if (ownership === "forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    switch (event) {
      case "session_start": {
        const state = await initSessionMetrics({
          sessionId,
          userId,
          scenarioId: data.scenarioId,
          scenarioTitle: data.scenarioTitle,
          pattern: data.pattern,
          difficulty: data.difficulty,
          scenarioType: data.scenarioType || "dsa",
          hintsTotal: data.hintsTotal || 3,
        })
        return NextResponse.json({ success: true, state: { sessionId: state.sessionId } })
      }

      case "chat_message": {
        await trackChatMessage({
          sessionId,
          type: data.type,
          message: data.message,
          chatType: data.chatType || "partner",
        })
        return NextResponse.json({ success: true })
      }

      case "hint_reveal": {
        await trackHintReveal({
          sessionId,
          hintIndex: data.hintIndex,
        })
        return NextResponse.json({ success: true })
      }

      case "code_execution": {
        await trackCodeExecution({
          sessionId,
          passed: data.passed,
          total: data.total,
          hasErrors: data.hasErrors || false,
          executionTimeMs: data.executionTimeMs || 0,
        })
        return NextResponse.json({ success: true })
      }

      case "file_view": {
        trackFileView(sessionId, data.fileName)
        return NextResponse.json({ success: true })
      }

      case "optimization_attempt": {
        trackOptimizationAttempt(sessionId)
        return NextResponse.json({ success: true })
      }

      case "ai_suggestion_applied": {
        trackAISuggestionApplied(sessionId, data.wasUnderstood)
        return NextResponse.json({ success: true })
      }

      case "session_complete": {
        const summary = await completeSessionMetrics({
          sessionId,
          finalCode: data.finalCode,
          language: data.language,
          testsPassed: data.testsPassed,
          testsTotal: data.testsTotal,
          efficiencyScore: data.efficiencyScore,
          communicationScore: data.communicationScore,
          thoughtProcessShared: data.thoughtProcessShared,
        })

        if (!summary) {
          return NextResponse.json({ error: "Session not found" }, { status: 404 })
        }

        return NextResponse.json({
          success: true,
          summary: {
            performanceScore: summary.performanceScore,
            scoreBreakdown: summary.scoreBreakdown,
            feedback: summary.feedback,
            durationMinutes: summary.durationMinutes,
          },
        })
      }

      case "get_metrics": {
        const metrics = getSessionMetrics(sessionId)
        if (!metrics) {
          return NextResponse.json({ error: "Session not found" }, { status: 404 })
        }
        return NextResponse.json({ success: true, metrics })
      }

      default:
        return NextResponse.json({ error: `Unknown event: ${event}` }, { status: 400 })
    }
  } catch (error) {
    logger.error("[Session Metrics API] Error", { error })
    return NextResponse.json({ error: "Failed to track session event" }, { status: 500 })
  }
}
