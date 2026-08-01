/**
 * Feedback Persist API - Save streaming feedback results to Firestore
 *
 * The streaming endpoint (/api/feedback/stream) runs in Edge runtime which
 * cannot access Firebase Admin SDK. This endpoint is called after streaming
 * completes to persist the results to Firestore.
 *
 * Also calculates and saves:
 * - mastery_score (for spaced repetition)
 * - technical_score (the mastery score; Technical = Mastery unification)
 *
 * NOTE: Silent notes should be passed from client (generated in Edge streaming
 * endpoint). We don't generate them here to avoid Vercel Hobby 10s timeout.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { logger } from "@/lib/logger"
import { verifyAuth } from "@/lib/auth-helpers"
import {
  calculateMasteryScore,
  type MasteryScoreInput,
} from "@/lib/spaced-repetition/mastery-score"
import { completeFeedbackSections } from "@/lib/feedback/structured-feedback-schema"
import { getScenarioById } from "@/lib/scenarios"
import { validatePersistRequestBody } from "@/lib/feedback/persist-request-schema"

// Vercel Hobby plan has 10 second timeout for serverless functions
// We skip AI calls here to stay within limits - silent notes should be
// passed from the client (generated in Edge streaming endpoint)
export const maxDuration = 10

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Require a verified Firebase ID token. This route mutates
    // interview_sessions scores/feedback, so it must never trust a body userId.
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const authenticatedUserId = authResult.userId

    // Scores land in readiness metrics and spaced repetition, so the body is
    // validated and clamped (0-100, finite) before anything is persisted.
    const validation = validatePersistRequestBody(await request.json())
    if (!validation.success) {
      logger.warn("[Feedback Persist] Rejected invalid request body", validation.logContext)
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
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
      silentNotes: providedSilentNotes,
      bugfixEvidenceSummary,
      bugfixScoreBreakdown,
      bugfixPostSessionReport,
      isGuidedLab,
      guidedLabMastery,
      conversationTranscript,
    } = validation.data

    // A caller may only persist feedback for their own account and their own
    // session. Verify both against the decoded token before any write.
    if (userId !== authenticatedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const sessionSnapshot = await adminDb.collection("interview_sessions").doc(sessionId).get()
    if (!sessionSnapshot.exists) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }
    if (sessionSnapshot.get("user_id") !== authenticatedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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
      timeSpentMinutes: timeSpentMinutes ?? 30, // Default 30 min ONLY when absent; a real 0 stays 0 (EDGE-15)
      hintsUsed: hintsUsed || 0,
      hintsTotal: 5, // Default assumption
      problemDifficulty: difficulty || "medium",
    }

    const masteryResult = calculateMasteryScore(masteryInput)
    const masteryScore = masteryResult.masteryScore

    // Technical = Mastery: the persisted technical_score is the mastery score (test pass rate,
    // time, and independence), the single technical signal shared with spaced repetition. This
    // replaces the earlier flat (u + ps + cq) / 3 average. calculateTechnicalScoreFromBreakdown
    // (60/25/15) survives only as the read-time fallback for legacy docs (see firestore-helpers).
    const technicalScore = masteryScore

    // Guided bug-fix labs are scaffolded teaching runs. The interview-style score
    // is not a valid debugging-skill measure for them, so we detect the run
    // (server-side via the scenario, or a client flag), keep that score out of the
    // readiness fields, and store a labeled mastery/practice signal instead. The
    // mastery NUMBER is the test-pass-rate mastery (same basis as Case Labs).
    const passRate = testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 100) : 0
    const scenarioForRun = scenarioId ? getScenarioById(scenarioId) : undefined
    const isGuidedLabRun =
      Boolean(isGuidedLab) ||
      (scenarioForRun?.type === "bugfix" && Boolean(scenarioForRun.guidedLab))
    const guidedLabMasterySummary = isGuidedLabRun
      ? { masteryScore, passRate, testsPassed, testsTotal, ...(guidedLabMastery ?? {}) }
      : undefined

    logger.info("[Feedback Persist] Scores calculated", {
      sessionId,
      masteryScore,
      technicalScore,
      overallScore: scores.overall,
      passRate: testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 100) : 0,
    })

    // ========================================
    // 2. Use Silent Notes from Edge Streaming (no AI call here)
    // ========================================
    // Silent notes are generated in the Edge streaming endpoint which has no timeout.
    // We just receive and save them here.
    const silentNotes = providedSilentNotes || []

    if (silentNotes.length > 0) {
      logger.info("[Feedback Persist] Received silent notes from streaming", {
        sessionId,
        silentNotesCount: silentNotes.length,
      })
    } else if (
      conversationTranscript &&
      conversationTranscript.length > 2 &&
      scenarioType !== "system-design"
    ) {
      // Log if we expected but didn't receive silent notes
      logger.info("[Feedback Persist] No silent notes received from streaming", {
        sessionId,
        transcriptLength: conversationTranscript.length,
      })
    }

    const completeFeedback = completeFeedbackSections(feedback, {
      rawFeedback: feedback.raw,
      scenarioTitle,
      testsPassed,
      testsTotal,
      overallScore: scores.overall,
    })

    // ========================================
    // 3. Update Firestore Session
    // ========================================
    const updateData = {
      // Feedback content
      feedback: feedback.raw,
      feedback_status: "complete" as const,

      // Scores — guided labs keep the (invalid) interview score out of the
      // readiness fields and surface a labeled practice/mastery number instead.
      performance_score: isGuidedLabRun ? masteryScore : scores.overall,
      mastery_score: masteryScore,
      technical_score: isGuidedLabRun ? null : technicalScore,
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
        tldr: completeFeedback.tldr,
        whatWorked: completeFeedback.whatWorked,
        fixNext: completeFeedback.fixNext,
        actionPlan: completeFeedback.actionPlan,
        rawFeedback: feedback.raw,
      },

      // Silent notes (things interviewer noticed but didn't correct)
      silent_notes: silentNotes,

      ...(scenarioType === "bugfix" && {
        bugfix_evidence_summary: bugfixEvidenceSummary || null,
        // Guided labs do not emit the interview-style 11-dimension breakdown.
        bugfix_score_breakdown: isGuidedLabRun ? null : bugfixScoreBreakdown || null,
        bugfix_post_session_report: bugfixPostSessionReport || null,
      }),

      ...(isGuidedLabRun && {
        is_guided_lab: true,
        guided_lab_mastery: guidedLabMasterySummary,
      }),

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
