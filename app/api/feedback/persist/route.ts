/**
 * Feedback Persist API - Save streaming feedback results to Firestore
 *
 * The streaming endpoint (/api/feedback/stream) runs in Edge runtime which
 * cannot access Firebase Admin SDK. This endpoint is called after streaming
 * completes to persist the results to Firestore.
 *
 * Also calculates and saves:
 * - mastery_score (for spaced repetition)
 * - technical_score (average of understanding, problemSolving, codeQuality)
 * - Generates silent notes via transcript analysis if not provided
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { logger } from "@/lib/logger"
import {
  calculateMasteryScore,
  type MasteryScoreInput,
} from "@/lib/spaced-repetition/mastery-score"
import { analyzeTranscriptForMistakes } from "@/lib/feedback/transcript-analysis"

export const maxDuration = 30 // 30 second max

interface PersistRequest {
  sessionId: string
  userId: string

  // Final scores (from streaming)
  scores: {
    understanding: number
    problemSolving: number
    codeQuality: number
    communication: number
    overall: number
  }

  // Rich feedback content
  feedback: {
    raw: string
    tldr: string
    whatWorked: string[]
    fixNext: string[]
    actionPlan: string[]
  }

  // Session context for mastery calculation
  testsPassed: number
  testsTotal: number
  timeSpentMinutes: number
  hintsUsed: number
  difficulty: "easy" | "medium" | "hard"
  scenarioType: "dsa" | "system-design" | "bugfix"
  scenarioTitle: string
  scenarioId?: string
  scenarioPattern?: string

  // For silent notes generation (optional - will generate if missing)
  conversationTranscript?: Array<{
    role: string
    content: string
  }>
  efficiencyMetrics?: {
    optimalTimeComplexity?: string
    optimalSpaceComplexity?: string
  }
  existingSilentNotes?: Array<{
    type: string
    userSaid: string
    correct?: string
    context?: string
  }>
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body: PersistRequest = await request.json()
    const {
      sessionId,
      userId,
      scores,
      feedback,
      testsPassed,
      testsTotal,
      timeSpentMinutes,
      hintsUsed,
      difficulty,
      scenarioType,
      scenarioTitle,
      scenarioId,
      scenarioPattern,
      conversationTranscript,
      efficiencyMetrics,
      existingSilentNotes,
    } = body

    if (!sessionId || !userId) {
      return NextResponse.json({ error: "sessionId and userId are required" }, { status: 400 })
    }

    if (!scores || !feedback) {
      return NextResponse.json({ error: "scores and feedback are required" }, { status: 400 })
    }

    logger.info("[Feedback Persist] Processing request", {
      sessionId,
      userId,
      overallScore: scores.overall,
      hasFeedback: !!feedback.raw,
    })

    // ========================================
    // 1. Calculate Mastery Score
    // ========================================
    const masteryInput: MasteryScoreInput = {
      testCasesPassed: testsPassed,
      testCasesTotal: testsTotal,
      timeSpentMinutes: timeSpentMinutes || 30, // Default 30 min if not provided
      hintsUsed: hintsUsed || 0,
      hintsTotal: 5, // Default assumption
      problemDifficulty: difficulty || "medium",
    }

    const masteryResult = calculateMasteryScore(masteryInput)
    const masteryScore = masteryResult.masteryScore

    // Technical score = average of understanding, problemSolving, codeQuality (excludes communication)
    const technicalScore = Math.round(
      (scores.understanding + scores.problemSolving + scores.codeQuality) / 3
    )

    logger.info("[Feedback Persist] Scores calculated", {
      sessionId,
      masteryScore,
      technicalScore,
      overallScore: scores.overall,
      passRate: testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 100) : 0,
    })

    // ========================================
    // 2. Generate Silent Notes if missing
    // ========================================
    let silentNotes = existingSilentNotes || []

    if (
      silentNotes.length === 0 &&
      conversationTranscript &&
      conversationTranscript.length > 0 &&
      scenarioType !== "system-design"
    ) {
      try {
        const transcriptMessages = conversationTranscript.map((msg) => ({
          role:
            msg.role === "user" || msg.role === "candidate"
              ? ("user" as const)
              : ("interviewer" as const),
          content: msg.content,
        }))

        const analysisResult = await analyzeTranscriptForMistakes(
          transcriptMessages,
          {
            title: scenarioTitle,
            optimalTimeComplexity: efficiencyMetrics?.optimalTimeComplexity || "O(n)",
            optimalSpaceComplexity: efficiencyMetrics?.optimalSpaceComplexity || "O(1)",
            criticalEdgeCases: ["empty input", "single element", "null/undefined values"],
            scenarioType,
          },
          undefined // No pre-extracted evidence needed
        )

        if (analysisResult.silentNotes.length > 0) {
          silentNotes = analysisResult.silentNotes
          logger.info("[Feedback Persist] Generated silent notes", {
            sessionId,
            count: silentNotes.length,
          })
        }
      } catch (error) {
        logger.warn("[Feedback Persist] Silent notes generation failed", {
          sessionId,
          error: error instanceof Error ? error.message : "Unknown error",
        })
        // Continue without silent notes - not critical
      }
    }

    // ========================================
    // 3. Update Firestore Session
    // ========================================
    const updateData = {
      // Feedback content
      feedback: feedback.raw,
      feedback_status: "complete" as const,

      // Scores
      performance_score: scores.overall,
      mastery_score: masteryScore,
      technical_score: technicalScore,
      efficiency_score: masteryResult.components.timeEfficiencyScore,

      // Score breakdown (for detailed display)
      score_breakdown: {
        understandingScore: scores.understanding,
        problemSolvingScore: scores.problemSolving,
        codeQualityScore: scores.codeQuality,
        communicationScore: scores.communication,
        overallScore: scores.overall,
      },

      // Structured feedback
      structured_feedback: {
        scores: scores,
        tldr: feedback.tldr,
        whatWorked: feedback.whatWorked,
        fixNext: feedback.fixNext,
        actionPlan: feedback.actionPlan,
        rawFeedback: feedback.raw,
      },

      // Silent notes (things interviewer noticed but didn't correct)
      silent_notes: silentNotes,

      // Mastery breakdown (for analytics/debugging)
      mastery_breakdown: {
        masteryScore: masteryScore,
        components: masteryResult.components,
        timeAnalysis: masteryResult.timeAnalysis,
      },

      // Timestamps
      feedback_persisted_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    }

    await adminDb.collection("interview_sessions").doc(sessionId).update(updateData)

    const latencyMs = Date.now() - startTime

    logger.info("[Feedback Persist] Successfully persisted", {
      sessionId,
      latencyMs,
      masteryScore,
      technicalScore,
      overallScore: scores.overall,
      silentNotesCount: silentNotes.length,
    })

    return NextResponse.json({
      success: true,
      masteryScore,
      technicalScore,
      overallScore: scores.overall,
      silentNotesCount: silentNotes.length,
      latencyMs,
    })
  } catch (error) {
    logger.error("[Feedback Persist] Error", { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to persist feedback" },
      { status: 500 }
    )
  }
}
