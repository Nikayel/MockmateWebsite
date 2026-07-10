import { NextRequest, NextResponse } from "next/server"
import { feedbackRateLimit } from "@/lib/rate-limit"
import { enforceQuota } from "@/lib/quota-enforcement"
import {
  checkRateLimit,
  startRequestTracking,
  endRequestTracking,
  buildRateLimitResponse,
  type RateLimitTier,
} from "@/lib/rate-limiter"
import { logger } from "@/lib/logger"
import { getCaseLabRun, upsertCaseLabRun } from "@/lib/labs/case-lab-runs"
import { generateCaseLabFeedback } from "@/lib/labs/case-lab-feedback"
import { getCaseLabById } from "@/lib/labs/case-labs"
import { recordCaseLabMastery } from "@/lib/labs/case-lab-mastery"

export const dynamic = "force-dynamic"

/**
 * POST /api/labs/feedback — generate structured feedback for a run, persist it
 * onto the Review answer, and mark the run completed. Body: { runId }.
 *
 * Metered exactly like the interview `/api/generate-feedback`: IP rate limit ->
 * quota + auth (paid LLM path) -> per-user tier rate limit -> concurrent
 * request tracking. Without this, lab feedback was an unmetered LLM hole. Cost
 * is attributed to the VERIFIED uid from the token, never the body.
 */
export async function POST(request: NextRequest) {
  // Layer 1: IP-based rate limiting.
  const rateLimitResponse = await feedbackRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Layer 2: quota + auth. requireAuth rejects signed-out callers with 401.
  const quotaResult = await enforceQuota(request, { requireAuth: true })
  if (!quotaResult.allowed && quotaResult.response) {
    return quotaResult.response
  }

  const tier = (quotaResult.tier || "free") as RateLimitTier
  const userId = quotaResult.userId || "anonymous"
  let trackingStarted = false

  // Layer 3: per-user tier rate limit + concurrent-request tracking.
  if (userId !== "anonymous") {
    const tierRateCheck = await checkRateLimit(userId, tier, 2000) // feedback ~2000 tokens
    if (!tierRateCheck.allowed) {
      return buildRateLimitResponse(tierRateCheck)
    }
    await startRequestTracking(userId, 2000)
    trackingStarted = true
  }

  try {
    const body = (await request.json()) as { runId?: string }
    if (!body.runId) {
      return NextResponse.json({ error: "runId is required" }, { status: 400 })
    }

    const run = await getCaseLabRun(userId, body.runId)
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 })
    }

    const feedback = await generateCaseLabFeedback(run, { userId })

    const saved = await upsertCaseLabRun(userId, {
      id: run.id,
      caseLabId: run.caseLabId,
      mode: run.mode,
      status: "completed",
      currentMilestone: "review",
      answers: {
        ...run.answers,
        review: { ...run.answers.review, aiFeedback: feedback },
      },
      milestoneStatus: { ...run.milestoneStatus, review: "done" },
    })

    // §7.5: map the completed Build scenario into the spaced-repetition mastery
    // system, reusing the same entry point as interview sessions. Best-effort —
    // recordCaseLabMastery swallows its own errors so it can't fail completion.
    const lab = getCaseLabById(saved.caseLabId)
    if (lab) {
      await recordCaseLabMastery(userId, lab, saved)
    }

    return NextResponse.json({ run: saved, feedback })
  } catch (error) {
    logger.error("Error generating case lab feedback:", { error })
    return NextResponse.json({ error: "Failed to generate feedback" }, { status: 500 })
  } finally {
    if (trackingStarted) {
      await endRequestTracking(userId).catch(() => {})
    }
  }
}
