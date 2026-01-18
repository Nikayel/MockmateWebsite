import { NextRequest, NextResponse } from "next/server"
import { feedbackRateLimit } from "@/lib/rate-limit"
import { enforceQuota } from "@/lib/quota-enforcement"
import { trackFeedbackGenerationServer } from "@/lib/analytics-server"
import { embedAndStoreSolution } from "@/lib/rag"
import { completeSessionWithMastery } from "@/lib/learning-state"
import { analyzeAndTrackMisconceptions } from "@/lib/rag/misconception-detection"
import { logger } from "@/lib/logger"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import { calculateMasteryScore } from "@/lib/spaced-repetition/mastery-score"
import type { Difficulty } from "@/lib/spaced-repetition"

// Import feedback system modules (for pre-processing)
import {
  analyzeAICodeOverlap,
  analyzeCodeCompleteness,
  isBlankDesignTemplate,
  injectScoresIntoFeedback,
} from "@/lib/feedback"

// Use communication analyzer for reliable communication scoring
import { validateCommunication } from "@/lib/agents/communication-analyzer-agent"

// Import the multi-agent orchestrator
import {
  orchestrateFeedbackGeneration,
  type FeedbackRequest,
} from "@/lib/agents/feedback-orchestrator"

// Import code efficiency analysis
import { analyzeCodeEfficiency } from "@/lib/interview/code-analysis"

// Set maximum duration for feedback generation (120 seconds to allow for AI processing)
export const maxDuration = 120

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await feedbackRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Enforce quota limits (session & budget)
  const quotaResult = await enforceQuota(request)
  if (!quotaResult.allowed && quotaResult.response) {
    return quotaResult.response
  }

  const startTime = Date.now()

  try {
    const {
      code,
      scenarioTitle,
      scenarioType = "dsa",
      scenarioId,
      scenarioDifficulty,
      scenarioPattern,
      testResults,
      language,
      timeSpent,
      efficiencyMetrics: providedEfficiencyMetrics,
      conversationTranscript,
      partnerMessages,
      sessionId,
      userId,
      optimalComplexity,
      designNotes,
    } = await request.json()

    // ==========================================================================
    // INPUT VALIDATION
    // ==========================================================================
    if (!code || !scenarioTitle) {
      return NextResponse.json({ error: "Code and scenario title are required" }, { status: 400 })
    }

    const MAX_CODE_LENGTH = 100000
    if (code.length > MAX_CODE_LENGTH) {
      logger.warn("[Feedback API] Code too large", { codeLength: code.length })
      return NextResponse.json(
        { error: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters` },
        { status: 400 }
      )
    }

    const MAX_TRANSCRIPT_LENGTH = 200000
    if (
      conversationTranscript &&
      typeof conversationTranscript === "string" &&
      conversationTranscript.length > MAX_TRANSCRIPT_LENGTH
    ) {
      logger.warn("[Feedback API] Transcript too large")
      return NextResponse.json(
        { error: `Conversation transcript exceeds maximum length` },
        { status: 400 }
      )
    }

    // Parse test results
    const parsedTestResults = Array.isArray(testResults) ? testResults : []
    const testsPassed = parsedTestResults.filter((t: any) => t?.passed).length
    const testsTotal = parsedTestResults.length
    const passRate = testsTotal > 0 ? (testsPassed / testsTotal) * 100 : 0

    logger.info("[Feedback API] Starting feedback generation", {
      sessionId,
      scenarioType,
      testsPassed,
      testsTotal,
    })

    // ==========================================================================
    // PRE-PROCESSING (route-specific)
    // ==========================================================================

    // 1. Parse conversation transcript
    let transcript: Array<{ role: "user" | "interviewer"; content: string }> = []
    if (conversationTranscript) {
      try {
        const parsed =
          typeof conversationTranscript === "string"
            ? JSON.parse(conversationTranscript)
            : conversationTranscript

        transcript = Array.isArray(parsed)
          ? parsed.map((m: any) => ({
              role: m.type === "user" || m.role === "candidate" ? "user" : "interviewer",
              content: m.message || m.content || "",
            }))
          : []
      } catch {
        logger.warn("[Feedback API] Failed to parse conversation transcript")
      }
    }

    // 2. Communication validation (AI-powered) - with timeout to preserve orchestrator budget
    let aiValidation: FeedbackRequest["aiValidation"] | undefined
    const elapsedAfterParsing = Date.now() - startTime
    const COMM_VALIDATION_TIMEOUT_MS = 25000 // 25s max for communication validation
    if (elapsedAfterParsing < 30000 && transcript.length > 0) {
      try {
        // Race against timeout to ensure orchestrator has enough budget
        const commResultPromise = validateCommunication(transcript)
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), COMM_VALIDATION_TIMEOUT_MS)
        )

        const commResult = await Promise.race([commResultPromise, timeoutPromise])

        if (commResult) {
          aiValidation = {
            communicationScore: commResult.communicationScore,
            approachExplained: commResult.approachExplained,
            approachQuality: commResult.approachQuality,
            complexityDiscussed: commResult.complexityDiscussed,
            edgeCasesConsidered: commResult.edgeCasesConsidered,
          }
        } else {
          logger.warn("[Feedback API] Communication validation timed out after 25s")
        }
      } catch (err) {
        logger.warn("[Feedback API] Communication validation failed", { error: err })
      }
    }

    // 3. AI code overlap detection
    const aiCodeOverlap = analyzeAICodeOverlap(code, partnerMessages || [])
    const hasBlindCopying = aiCodeOverlap.hasHighOverlap && !aiCodeOverlap.modificationsMade

    // 4. Efficiency metrics
    const efficiencyMetrics =
      providedEfficiencyMetrics ||
      analyzeCodeEfficiency(code, {
        optimalComplexity: optimalComplexity || undefined,
        problemId: scenarioId,
        pattern: scenarioPattern as DSAPattern,
      })

    // 5. Code completeness check
    const codeCompleteness = analyzeCodeCompleteness(code, language || "python")

    // ==========================================================================
    // CALL MULTI-AGENT ORCHESTRATOR
    // ==========================================================================

    // Calculate remaining time budget for orchestrator
    // The route has 120s max, we need 10s buffer for response/cleanup
    const elapsedBeforeOrchestrator = Date.now() - startTime
    const remainingBudgetMs = Math.max(30000, 110000 - elapsedBeforeOrchestrator) // At least 30s
    const orchestratorStartTime = Date.now() // Fresh start time for orchestrator

    logger.info("[Feedback API] Starting orchestrator", {
      elapsedBeforeOrchestratorMs: elapsedBeforeOrchestrator,
      remainingBudgetMs,
      sessionId,
    })

    const feedbackRequest: FeedbackRequest = {
      scenarioType: scenarioType as "dsa" | "system-design" | "bugfix",
      scenarioTitle,
      scenarioPattern,
      scenarioId,
      transcript,
      code,
      testsPassed,
      testsTotal,
      designNotes,
      optimalTimeComplexity: optimalComplexity?.time || efficiencyMetrics?.optimalTimeComplexity,
      optimalSpaceComplexity: optimalComplexity?.space || efficiencyMetrics?.optimalSpaceComplexity,
      aiValidation,
      efficiencyMetrics: efficiencyMetrics
        ? {
            estimatedTimeComplexity: efficiencyMetrics.estimatedTimeComplexity,
            estimatedSpaceComplexity: efficiencyMetrics.estimatedSpaceComplexity,
            efficiencyScore: efficiencyMetrics.efficiencyScore,
            detectedApproach: efficiencyMetrics.detectedApproach,
          }
        : undefined,
      userId,
      sessionId,
      timeSpentSeconds: timeSpent ? Math.round(timeSpent) : undefined,
      maxDurationMs: remainingBudgetMs, // Use REMAINING time, not fixed 100s
      startTime: orchestratorStartTime, // Fresh start time for accurate budget tracking
    }

    const orchestratorResult = await orchestrateFeedbackGeneration(feedbackRequest)

    if (!orchestratorResult.success || !orchestratorResult.data) {
      logger.error("[Feedback API] Orchestrator failed", {
        error: orchestratorResult.error,
        sessionId,
      })
      return NextResponse.json(
        { error: orchestratorResult.error || "Feedback generation failed" },
        { status: 500 }
      )
    }

    const { data: feedbackData, metrics } = orchestratorResult
    const isPartialResult = feedbackData.partialResult === true

    // ==========================================================================
    // POST-PROCESSING
    // ==========================================================================

    // For partial results (scores computed but feedback text generation failed),
    // generate minimal feedback using the real scores
    let feedbackText: string
    if (isPartialResult) {
      logger.info("[Feedback API] Using partial result with real scores", {
        sessionId,
        scores: feedbackData.scores,
      })
      // Build minimal feedback with real scores
      feedbackText = `**TL;DR** – Session evaluated. Your scores reflect your performance.

**Score Snapshot**
- Understanding: ${feedbackData.scores.understanding}/100
- Problem-Solving: ${feedbackData.scores.problemSolving}/100
- Code Quality: ${feedbackData.scores.codeQuality}/100
- Communication: ${feedbackData.scores.communication}/100
- Overall: ${feedbackData.scores.overall}/100

*Note: Full AI feedback was unavailable. Scores computed from code analysis and conversation.*`
    } else {
      feedbackText = buildFeedbackText({
        tldr: feedbackData.tldr,
        whatWorked: feedbackData.whatWorked,
        fixNext: feedbackData.fixNext,
        actionPlan: feedbackData.actionPlan,
        scores: feedbackData.scores,
        detailedFeedback:
          typeof feedbackData.detailedFeedback === "object"
            ? (feedbackData.detailedFeedback as {
                understanding?: string
                problemSolving?: string
                codeQuality?: string
                communication?: string
              })
            : undefined,
      })
    }
    const finalFeedback = injectScoresIntoFeedback(feedbackText, feedbackData.scores)

    // Calculate mastery score for spaced repetition
    const masteryScore = calculateMasteryScore({
      testCasesPassed: testsPassed,
      testCasesTotal: testsTotal,
      timeSpentMinutes: timeSpent ? Math.round(timeSpent / 60) : 10,
      hintsUsed: 0,
      hintsTotal: 3,
      problemDifficulty: (scenarioDifficulty as "easy" | "medium" | "hard") || "medium",
      codeEfficiencyScore: efficiencyMetrics?.efficiencyScore,
      approachExplained: aiValidation?.approachExplained,
      complexityDiscussed: aiValidation?.complexityDiscussed,
    })

    // Track analytics (fire-and-forget)
    trackFeedbackGenerationServer({
      sessionId: sessionId || "unknown",
      userId,
      scenarioType,
      performanceScore: feedbackData.scores.overall,
      durationMinutes: Math.round((Date.now() - startTime) / 60000),
    }).catch(() => {})

    // Embed solution for RAG (fire-and-forget)
    if (userId && scenarioId && passRate >= 80) {
      embedAndStoreSolution(userId, scenarioId, code, {
        problemTitle: scenarioTitle,
        language: language || "python",
        passed: passRate === 100,
        score: feedbackData.scores.overall,
        problemType: scenarioType,
      }).catch(() => {})
    }

    // Complete session with mastery (fire-and-forget)
    if (userId && scenarioId) {
      completeSessionWithMastery(userId, {
        scenarioId,
        title: scenarioTitle,
        pattern: scenarioPattern as DSAPattern,
        difficulty: (scenarioDifficulty as Difficulty) || "medium",
        performanceScore: feedbackData.scores.overall,
        masteryScore: masteryScore.masteryScore,
        timeSpentMinutes: timeSpent ? Math.round(timeSpent / 60) : undefined,
      }).catch(() => {})
    }

    // Track misconceptions (fire-and-forget)
    if (userId && scenarioPattern && passRate < 100) {
      analyzeAndTrackMisconceptions(userId, code, scenarioPattern as DSAPattern, {
        passed: testsPassed,
        total: testsTotal,
      }).catch(() => {})
    }

    const totalElapsedMs = Date.now() - startTime
    logger.info("[Feedback API] Generation completed", {
      sessionId,
      totalElapsedMs,
      overallScore: feedbackData.scores.overall,
      agentCallsCount: metrics?.agentCalls?.length || 0,
    })

    // ==========================================================================
    // RESPONSE
    // ==========================================================================
    return NextResponse.json({
      feedback: finalFeedback,
      performanceScore: feedbackData.scores.overall,
      technicalScore: masteryScore.masteryScore,
      scores: feedbackData.scores,
      structured: {
        tldr: feedbackData.tldr,
        whatWorked: feedbackData.whatWorked,
        fixNext: feedbackData.fixNext,
        actionPlan: feedbackData.actionPlan,
        detailed: feedbackData.detailedFeedback,
      },
      // Flags for frontend warnings
      silentSolution: !aiValidation?.approachExplained && passRate === 100,
      incompleteSolution: codeCompleteness.isIncomplete,
      aiCopyingDetected: hasBlindCopying,
      aiOverlapPercentage: aiCodeOverlap.overlapPercentage,
      // Constitutional AI review metadata
      ...(feedbackData.constitutionalReview.scoreAdjusted ||
      feedbackData.constitutionalReview.feedbackCorrected
        ? {
            constitutionalAICritique: {
              scoreAdjusted: feedbackData.constitutionalReview.scoreAdjusted,
              feedbackCorrected: feedbackData.constitutionalReview.feedbackCorrected,
              issues: feedbackData.constitutionalReview.issues,
            },
          }
        : {}),
      // Partial result indicator (scores computed but full feedback unavailable)
      partialResult: isPartialResult,
      latencyMs: totalElapsedMs,
    })
  } catch (error) {
    logger.error("Feedback generation error", { error, endpoint: "/api/generate-feedback" })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate feedback" },
      { status: 500 }
    )
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build narrative feedback text from structured data
 */
function buildFeedbackText(data: {
  tldr: string
  whatWorked: string[]
  fixNext: string[]
  actionPlan: string[]
  scores: {
    understanding: number
    problemSolving: number
    codeQuality: number
    communication: number
    overall: number
  }
  detailedFeedback?: {
    understanding?: string
    problemSolving?: string
    codeQuality?: string
    communication?: string
  }
}): string {
  const sections: string[] = []

  // TL;DR
  if (data.tldr) {
    sections.push(`**TL;DR** – ${data.tldr}`)
  }

  // Score Snapshot
  sections.push(`**Score Snapshot**
- Understanding: ${data.scores.understanding}/100
- Problem-Solving: ${data.scores.problemSolving}/100
- Code Quality: ${data.scores.codeQuality}/100
- Communication: ${data.scores.communication}/100
- Overall: ${data.scores.overall}/100`)

  // What Worked
  if (data.whatWorked.length > 0) {
    sections.push(`**What Worked**\n${data.whatWorked.map((w) => `- ${w}`).join("\n")}`)
  }

  // Fix Next
  if (data.fixNext.length > 0) {
    sections.push(`**Fix Next**\n${data.fixNext.map((f) => `- ${f}`).join("\n")}`)
  }

  // Action Plan
  if (data.actionPlan.length > 0) {
    sections.push(`**Action Plan**\n${data.actionPlan.map((a, i) => `${i + 1}. ${a}`).join("\n")}`)
  }

  // Detailed sections (if available)
  if (data.detailedFeedback) {
    const detailed: string[] = []
    if (data.detailedFeedback.understanding) {
      detailed.push(`**Understanding**\n${data.detailedFeedback.understanding}`)
    }
    if (data.detailedFeedback.problemSolving) {
      detailed.push(`**Problem-Solving**\n${data.detailedFeedback.problemSolving}`)
    }
    if (data.detailedFeedback.codeQuality) {
      detailed.push(`**Code Quality**\n${data.detailedFeedback.codeQuality}`)
    }
    if (data.detailedFeedback.communication) {
      detailed.push(`**Communication**\n${data.detailedFeedback.communication}`)
    }
    if (detailed.length > 0) {
      sections.push(detailed.join("\n\n"))
    }
  }

  return sections.join("\n\n")
}
