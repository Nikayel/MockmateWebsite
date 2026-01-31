/**
 * Instant Feedback API - Phase 1 of Two-Phase Feedback
 *
 * Returns pre-computed algorithmic scores instantly (< 3 seconds)
 * without any AI calls. Creates a background job for rich feedback.
 *
 * Flow:
 * 1. Client submits interview → POST /api/feedback/instant
 * 2. This returns instant scores + jobId
 * 3. Client shows scores immediately
 * 4. Client polls /api/feedback/status?jobId=xxx for rich feedback
 * 5. When ready, client updates UI with narrative feedback
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import {
  getSessionMetrics,
  getInstantScores,
  setSubmittedFromPhase,
  updateCodeAnalysis,
} from "@/lib/session-metrics"
import {
  calculateInstantScores,
  calculateSystemDesignScores,
  buildSignalsFromMetrics,
  type AccumulatedScores,
} from "@/lib/feedback/score-accumulator"
import { analyzeCodeCompleteness } from "@/lib/feedback"
import { logger } from "@/lib/logger"

export const maxDuration = 10 // 10 second max - this should be fast

interface InstantFeedbackRequest {
  sessionId: string
  userId: string
  // Final submission data
  code: string
  language: string
  testsPassed: number
  testsTotal: number
  efficiencyScore?: number
  // Phase tracking
  submittedFromPhase?: string
  testsRanBeforeSubmit?: boolean
  // Scenario info
  scenarioType?: "dsa" | "system-design" | "bugfix"
  scenarioTitle?: string
  scenarioId?: string
  scenarioDifficulty?: "easy" | "medium" | "hard"
  scenarioPattern?: string
  // For background job
  conversationTranscript?: Array<{
    type?: string
    role?: string
    message?: string
    content?: string
  }>
  partnerMessages?: string[]
  phaseTracking?: Record<string, unknown>
  silentNotes?: Array<Record<string, unknown>>
  aiCollaborationMetrics?: Record<string, unknown>
  interactionMetrics?: Record<string, unknown>
  efficiencyMetrics?: Record<string, unknown>
  // Real Interview Mode
  scenarioClarifyingQuestions?: string[]
  realInterviewMode?: boolean
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body: InstantFeedbackRequest = await request.json()
    const {
      sessionId,
      userId,
      code,
      language,
      testsPassed,
      testsTotal,
      efficiencyScore,
      submittedFromPhase,
      scenarioType = "dsa",
      scenarioTitle,
      scenarioId,
      scenarioDifficulty = "medium",
    } = body

    if (!sessionId || !userId) {
      return NextResponse.json({ error: "sessionId and userId are required" }, { status: 400 })
    }

    logger.info("[Instant Feedback] Processing request", {
      sessionId,
      userId,
      scenarioType,
      hasCode: !!code,
      testsPassed,
      testsTotal,
    })

    // Update session metrics with final submission data
    if (submittedFromPhase) {
      setSubmittedFromPhase(sessionId, submittedFromPhase)
    }

    // Analyze code completeness
    const codeAnalysis = code
      ? analyzeCodeCompleteness(code, language || "javascript")
      : { isIncomplete: true, hasActualLogic: false }

    updateCodeAnalysis(sessionId, {
      codeLength: code?.length || 0,
      hasActualLogic: codeAnalysis.hasActualLogic,
      efficiencyScore: efficiencyScore ?? 50,
    })

    // Get pre-computed scores from session metrics
    let scores: AccumulatedScores | null = getInstantScores(sessionId)

    // Fallback: Calculate scores directly if session not in memory
    if (!scores) {
      logger.warn("[Instant Feedback] Session not in memory, calculating directly", {
        sessionId,
      })

      if (scenarioType === "system-design") {
        // System design scoring
        const sessionMetrics = getSessionMetrics(sessionId)
        scores = calculateSystemDesignScores({
          hasDesignNotes: !!code && code.length > 100,
          designNotesLength: code?.length || 0,
          candidateMessageCount: sessionMetrics?.totalChatMessages || 0,
          approachExplained: sessionMetrics?.approachExplained || false,
          requirementsGathered: false, // Would need AI to determine
          tradeoffsDiscussed: false,
          scalabilityMentioned: false,
          questionsAnswered: sessionMetrics?.totalInterviewerMessages || 0,
          questionsAsked: sessionMetrics?.totalInterviewerMessages || 0,
        })
      } else {
        // DSA/bugfix scoring
        const sessionMetrics = getSessionMetrics(sessionId)
        const signals = buildSignalsFromMetrics({
          testsPassed,
          testsTotal,
          efficiencyScore: efficiencyScore ?? 50,
          codeLength: code?.length || 0,
          hasActualLogic: codeAnalysis.hasActualLogic,
          approachExplained: sessionMetrics?.approachExplained || false,
          complexityDiscussed: sessionMetrics?.complexityDiscussed || false,
          edgeCasesIdentified: sessionMetrics?.edgeCasesIdentified || [],
          hintsViewed: sessionMetrics?.hintsViewed || [],
          totalInterviewerMessages: sessionMetrics?.totalInterviewerMessages || 0,
          totalChatMessages: sessionMetrics?.totalChatMessages || 0,
          aiSuggestionsCopiedBlindly: sessionMetrics?.aiSuggestionsCopiedBlindly || 0,
          testsRanBeforeSubmit: body.testsRanBeforeSubmit ?? false,
          submittedFromPhase: submittedFromPhase || "unknown",
          scenarioType,
          difficulty: scenarioDifficulty,
        })
        scores = calculateInstantScores(signals)
      }
    }

    // Create background job for rich feedback
    const jobId = `job_${sessionId}_${Date.now()}`
    const jobData = {
      jobId,
      sessionId,
      userId,
      status: "pending" as const,
      createdAt: FieldValue.serverTimestamp(),
      // Store all data needed for rich feedback generation
      input: {
        code,
        language,
        scenarioTitle,
        scenarioType,
        scenarioId,
        scenarioDifficulty,
        scenarioPattern: body.scenarioPattern,
        testsPassed,
        testsTotal,
        efficiencyScore,
        conversationTranscript: body.conversationTranscript,
        partnerMessages: body.partnerMessages,
        phaseTracking: body.phaseTracking,
        silentNotes: body.silentNotes,
        aiCollaborationMetrics: body.aiCollaborationMetrics,
        interactionMetrics: body.interactionMetrics,
        efficiencyMetrics: body.efficiencyMetrics,
        scenarioClarifyingQuestions: body.scenarioClarifyingQuestions,
        realInterviewMode: body.realInterviewMode,
      },
      // Store instant scores for reference
      instantScores: scores,
    }

    // Store job in Firestore
    await adminDb.collection("feedback_jobs").doc(jobId).set(jobData)

    // Update session status
    await adminDb
      .collection("interview_sessions")
      .doc(sessionId)
      .update({
        feedback_status: "processing",
        feedback_job_id: jobId,
        instant_scores: {
          understanding: scores.understanding,
          problemSolving: scores.problemSolving,
          codeQuality: scores.codeQuality,
          communication: scores.communication,
          overall: scores.overall,
        },
        updated_at: FieldValue.serverTimestamp(),
      })

    const latencyMs = Date.now() - startTime

    logger.info("[Instant Feedback] Completed", {
      sessionId,
      jobId,
      latencyMs,
      scores: {
        overall: scores.overall,
        confidence: scores.confidence,
      },
    })

    return NextResponse.json({
      success: true,
      // Instant scores (show immediately)
      scores: {
        understanding: scores.understanding,
        problemSolving: scores.problemSolving,
        codeQuality: scores.codeQuality,
        communication: scores.communication,
        overall: scores.overall,
      },
      // Flags for UI
      flags: {
        silentSolution: scores.silentSolution,
        incompleteSolution: scores.incompleteSolution,
        aiCopyingDetected: scores.aiCopyingDetected,
      },
      // For polling rich feedback
      jobId,
      // Metadata
      confidence: scores.confidence,
      signalsUsed: scores.signalsUsed,
      latencyMs,
    })
  } catch (error) {
    logger.error("[Instant Feedback] Error", { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate instant feedback" },
      { status: 500 }
    )
  }
}
