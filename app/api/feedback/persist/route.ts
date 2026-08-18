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
 * NOTE: Silent notes are passed from the client (generated in the Edge
 * streaming endpoint) rather than regenerated here, so this route does no AI
 * work and stays fast.
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
import {
  validatePersistRequestBody,
  validateFeedbackFailureReport,
} from "@/lib/feedback/persist-request-schema"
import { resolvePersistAction } from "@/lib/feedback/persist-guard"

// This route does Firestore writes only, no AI calls, so it does not need a
// large budget. The previous `export const maxDuration = 10` cited a Vercel
// Hobby 10s serverless limit that no longer applies (vercel.json already
// grants 30s to every app/api function, and a per-route export OVERRIDES
// that). Dropping the export inherits the vercel.json value rather than
// keeping a tighter ceiling nobody currently intends.

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

    const rawBody: unknown = await request.json()

    // Failure reports: the stream route's error path marks the session failed
    // so it lands in a terminal state (with the retry UI) even when the client
    // has already disconnected. Guarded: a completed session is never
    // downgraded, so a late failure report cannot clobber real feedback.
    if (
      typeof rawBody === "object" &&
      rawBody !== null &&
      (rawBody as { outcome?: unknown }).outcome === "failed"
    ) {
      const failure = validateFeedbackFailureReport(rawBody)
      if (!failure.success) {
        return NextResponse.json({ error: failure.error }, { status: 400 })
      }
      if (failure.data.userId !== authenticatedUserId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const sessionRef = adminDb.collection("interview_sessions").doc(failure.data.sessionId)
      const snapshot = await sessionRef.get()
      if (!snapshot.exists) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 })
      }
      if (snapshot.get("user_id") !== authenticatedUserId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      if (snapshot.get("feedback_status") === "complete") {
        return NextResponse.json({ success: true, skipped: "already complete" })
      }
      await sessionRef.update({
        feedback_status: "failed",
        feedback_error: failure.data.errorMessage ?? null,
        updated_at: FieldValue.serverTimestamp(),
      })
      logger.warn("[Feedback Persist] Session marked failed by generation error", {
        sessionId: failure.data.sessionId,
        errorMessage: failure.data.errorMessage,
      })
      return NextResponse.json({ success: true, markedFailed: true })
    }

    // Scores land in readiness metrics and spaced repetition, so the body is
    // validated and clamped (0-100, finite) before anything is persisted.
    const validation = validatePersistRequestBody(rawBody)
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

    // Two writers race for every session now (client-after-stream and the
    // stream route's server-side persist). First real persist wins; real
    // feedback may upgrade fallback scores; nothing overwrites real feedback.
    const incomingSource = validation.data.source ?? "stream"
    const persistAction = resolvePersistAction(
      {
        status: sessionSnapshot.get("feedback_status") as string | undefined,
        source: sessionSnapshot.get("feedback_source") as string | undefined,
      },
      incomingSource
    )
    if (persistAction === "skip") {
      logger.info("[Feedback Persist] Skipped: session already has terminal feedback", {
        sessionId,
        incomingSource,
      })
      return NextResponse.json({ success: true, alreadyPersisted: true })
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
      // Chat time is not coding time: without these counts analyzeTime charged
      // the full wall clock - including every interviewer exchange - against a
      // pure-coding budget (estimatedCommunicationMinutes was always 0 here).
      interviewerMessagesCount: conversationTranscript?.filter((m) => m.role === "interviewer")
        .length,
      aiMessagesCount: conversationTranscript?.filter((m) => m.role === "ai_partner").length,
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
      // Which writer landed this persist (see persist-guard); a later real
      // persist may upgrade "fallback", nothing else is ever overwritten.
      feedback_source: incomingSource,
      // A successful persist clears any failure marker from an earlier attempt.
      feedback_error: FieldValue.delete(),

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
