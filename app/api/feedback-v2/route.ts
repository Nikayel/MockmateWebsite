/**
 * Feedback API v2 - Multi-Agent Architecture
 *
 * This is the new feedback generation endpoint using the multi-agent orchestrator.
 * It provides the same interface as /api/generate-feedback for frontend compatibility.
 *
 * Architecture:
 * - ScorerAgent: Calculates validated scores (deterministic)
 * - FeedbackWriterAgent: Generates structured feedback (smart model)
 * - ConstitutionalAgent: Reviews for fairness/accuracy (cheap model)
 * - FeedbackOrchestrator: Coordinates agents
 *
 * Benefits:
 * - Cleaner code (single responsibility per agent)
 * - Better testability (each agent can be tested independently)
 * - Easier debugging (metrics per agent)
 * - Constitutional AI review built-in
 */

import { NextRequest, NextResponse } from "next/server"
import { feedbackRateLimit } from "@/lib/rate-limit"
import { enforceQuota } from "@/lib/quota-enforcement"
import { logger } from "@/lib/logger"
import { orchestrateFeedbackGeneration, type FeedbackRequest } from "@/lib/agents"

// =============================================================================
// REQUEST/RESPONSE TYPES (same as v1 for compatibility)
// =============================================================================

interface FeedbackApiRequest {
  // Session info
  sessionId: string
  scenarioId?: string
  scenarioTitle: string
  scenarioType: "dsa" | "system-design" | "bugfix"
  scenarioPattern?: string

  // Conversation
  conversationHistory: Array<{ type: string; message: string }>

  // Code
  code: string
  language?: string

  // Test results
  testResults?: Array<{
    name?: string
    description?: string
    passed: boolean
    input?: string
    expected?: string
    actual?: string
  }>

  // Additional context
  designNotes?: string
  optimalTimeComplexity?: string
  optimalSpaceComplexity?: string

  // User
  userId?: string
  userName?: string
  skillLevel?: string

  // Metrics
  timeSpentSeconds?: number
  hintsUsed?: number
}

// =============================================================================
// INPUT VALIDATION
// =============================================================================

const MAX_CODE_LENGTH = 100000
const MAX_TRANSCRIPT_LENGTH = 200000

function validateRequest(body: FeedbackApiRequest): { valid: boolean; error?: string } {
  if (!body.scenarioTitle) {
    return { valid: false, error: "Scenario title is required" }
  }

  if (!body.code && body.scenarioType !== "system-design") {
    return { valid: false, error: "Code is required for DSA/bugfix scenarios" }
  }

  if (body.code && body.code.length > MAX_CODE_LENGTH) {
    return { valid: false, error: `Code exceeds ${MAX_CODE_LENGTH} characters` }
  }

  const transcriptLength =
    body.conversationHistory?.reduce((sum, msg) => sum + (msg.message?.length || 0), 0) || 0

  if (transcriptLength > MAX_TRANSCRIPT_LENGTH) {
    return { valid: false, error: `Transcript exceeds ${MAX_TRANSCRIPT_LENGTH} characters` }
  }

  return { valid: true }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

// Set maximum duration for feedback generation (90 seconds to allow for AI processing)
// This prevents Vercel serverless timeout on complex feedback generation
export const maxDuration = 90

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // Rate limiting
  const rateLimitResponse = await feedbackRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Quota enforcement
  const quotaResult = await enforceQuota(request)
  if (!quotaResult.allowed && quotaResult.response) {
    return quotaResult.response
  }

  try {
    const body: FeedbackApiRequest = await request.json()

    // Validate input
    const validation = validateRequest(body)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Convert to orchestrator format
    const feedbackRequest: FeedbackRequest = {
      scenarioType: body.scenarioType,
      scenarioTitle: body.scenarioTitle,
      scenarioPattern: body.scenarioPattern,
      transcript: (body.conversationHistory || []).map((msg) => ({
        role: msg.type === "user" ? ("user" as const) : ("interviewer" as const),
        content: msg.message,
      })),
      code: body.code || "",
      testsPassed: body.testResults?.filter((t) => t.passed).length || 0,
      testsTotal: body.testResults?.length || 0,
      designNotes: body.designNotes,
      optimalTimeComplexity: body.optimalTimeComplexity,
      optimalSpaceComplexity: body.optimalSpaceComplexity,
      userId: body.userId,
      userName: body.userName,
      skillLevel: body.skillLevel,
      timeSpentSeconds: body.timeSpentSeconds,
      hintsUsed: body.hintsUsed,
    }

    // Log request
    logger.info("[Feedback-v2] Processing request", {
      sessionId: body.sessionId,
      scenarioType: body.scenarioType,
      scenarioTitle: body.scenarioTitle,
      transcriptLength: feedbackRequest.transcript.length,
      testsPassed: feedbackRequest.testsPassed,
      testsTotal: feedbackRequest.testsTotal,
    })

    // Orchestrate feedback generation
    const result = await orchestrateFeedbackGeneration(feedbackRequest)

    // Handle orchestration failure
    if (!result.success || !result.data) {
      logger.error("[Feedback-v2] Orchestration failed", {
        error: result.error,
        metrics: result.metrics,
      })

      return NextResponse.json(
        { error: result.error || "Failed to generate feedback" },
        { status: 500 }
      )
    }

    // Log success
    const totalLatency = Date.now() - startTime
    logger.info("[Feedback-v2] Feedback generated", {
      sessionId: body.sessionId,
      totalLatencyMs: totalLatency,
      orchestratorLatencyMs: result.metrics?.totalLatencyMs,
      overall: result.data.scores.overall,
      masteryScore: result.data.masteryScore,
      constitutionalAdjusted: result.data.constitutionalReview.scoreAdjusted,
    })

    // Return response (same format as v1 for compatibility)
    return NextResponse.json({
      // Main scores
      performanceScore: result.data.scores.overall,
      technicalScore: result.data.masteryScore,

      // Breakdown
      scoreBreakdown: {
        understandingScore: result.data.scores.understanding,
        problemSolvingScore: result.data.scores.problemSolving,
        codeQualityScore: result.data.scores.codeQuality,
        communicationScore: result.data.scores.communication,
      },

      // Structured feedback
      structuredFeedback: {
        tldr: result.data.tldr,
        whatWorked: result.data.whatWorked,
        fixNext: result.data.fixNext,
        actionPlan: result.data.actionPlan,
        aiWatchlist: "", // Not used in v2
      },

      // Detailed sections
      detailedFeedback: result.data.detailedFeedback,

      // Constitutional AI review
      constitutionalAICritique: {
        scoreAdjusted: result.data.constitutionalReview.scoreAdjusted,
        feedbackCorrected: result.data.constitutionalReview.feedbackCorrected,
        issues: result.data.constitutionalReview.issues,
      },

      // Metadata
      provider: "feedback-orchestrator-v2",
      latencyMs: result.metrics?.totalLatencyMs || totalLatency,
      metrics: result.metrics,
    })
  } catch (error) {
    const latency = Date.now() - startTime
    logger.error("[Feedback-v2] Unexpected error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      latencyMs: latency,
    })

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "v2",
    description: "Multi-agent feedback orchestrator",
    agents: ["scorer", "feedback_writer", "constitutional"],
  })
}
