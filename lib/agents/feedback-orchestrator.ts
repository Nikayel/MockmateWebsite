/**
 * Feedback Orchestrator - Coordinates scoring and feedback agents
 *
 * Single Responsibility: Orchestrate the feedback generation pipeline.
 * Coordinates: EvidenceExtractor → Scorer → FeedbackWriter → Constitutional
 *
 * This is the main entry point for feedback generation in v2.
 */

import type { OrchestrationResult, AgentType } from "./types"
import type { ScoreResult } from "@/lib/feedback/types"
import type { ExtractedEvidence } from "@/lib/feedback/structured-extraction"
import { logger } from "@/lib/logger"

// Import agents
import { ScorerAgent, type ScorerAgentInput, type ScorerAgentOutput } from "./scorer-agent"
import {
  FeedbackWriterAgent,
  type FeedbackWriterAgentInput,
  type FeedbackWriterAgentOutput,
} from "./feedback-writer-agent"
import {
  ConstitutionalAgent,
  type ConstitutionalAgentInput,
  type ConstitutionalAgentOutput,
} from "./constitutional-agent"

// Import evidence extraction (DRY - reuse existing)
import { extractConversationEvidence } from "@/lib/feedback/structured-extraction"

// =============================================================================
// TYPES
// =============================================================================

export interface FeedbackRequest {
  // Scenario info
  scenarioType: "dsa" | "system-design" | "bugfix"
  scenarioTitle: string
  scenarioPattern?: string
  scenarioId?: string

  // Conversation transcript
  transcript: Array<{ role: "user" | "interviewer"; content: string }>

  // Code and test results
  code: string
  testsPassed: number
  testsTotal: number

  // Additional context
  designNotes?: string
  optimalTimeComplexity?: string
  optimalSpaceComplexity?: string

  // Pre-computed data (from route for efficiency)
  aiValidation?: {
    communicationScore: number
    approachExplained: boolean
    approachQuality: "none" | "poor" | "basic" | "good" | "excellent"
    complexityDiscussed: boolean
    edgeCasesConsidered: boolean
  }
  efficiencyMetrics?: {
    estimatedTimeComplexity: string
    estimatedSpaceComplexity: string
    efficiencyScore: number
    detectedApproach?: string
  }

  // User context
  userId?: string
  userName?: string
  skillLevel?: string
  sessionId?: string

  // Metrics
  timeSpentSeconds?: number
  hintsUsed?: number

  // Time budget options
  maxDurationMs?: number // Max time for orchestration (default 90000)
  startTime?: number // When the request started (for time budget calculations)

  // Options
  skipConstitutional?: boolean // For testing
  skipEvidence?: boolean // Skip evidence extraction if already done
}

export interface FeedbackResponse {
  // Scores
  scores: ScoreResult
  masteryScore: number

  // Structured feedback
  tldr: string
  whatWorked: string[]
  fixNext: string[]
  actionPlan: string[]

  // Detailed feedback
  detailedFeedback:
    | {
        understanding: string
        problemSolving: string
        codeQuality: string
        communication: string
      }
    | string // String for partial results

  // Metadata
  evidence: ExtractedEvidence
  constitutionalReview: {
    scoreAdjusted: boolean
    feedbackCorrected: boolean
    issues: string[]
  }

  // Flag indicating partial results (scores computed but feedback generation failed)
  partialResult?: boolean
}

// =============================================================================
// FEEDBACK ORCHESTRATOR
// =============================================================================

export class FeedbackOrchestrator {
  private scorerAgent: ScorerAgent
  private feedbackWriterAgent: FeedbackWriterAgent
  private constitutionalAgent: ConstitutionalAgent

  constructor() {
    this.scorerAgent = new ScorerAgent()
    this.feedbackWriterAgent = new FeedbackWriterAgent()
    this.constitutionalAgent = new ConstitutionalAgent()
  }

  async generateFeedback(request: FeedbackRequest): Promise<OrchestrationResult<FeedbackResponse>> {
    const startTime = request.startTime || Date.now()
    const maxDuration = request.maxDurationMs || 90000 // Default 90s
    const agentCalls: { agent: AgentType; latencyMs: number; tokens?: number }[] = []

    // Helper to check time budget
    const getElapsed = () => Date.now() - startTime
    const hasTimeBudget = (thresholdMs: number) => getElapsed() < thresholdMs

    logger.info("[FeedbackOrchestrator] Starting feedback generation", {
      scenarioType: request.scenarioType,
      transcriptLength: request.transcript.length,
      testsPassed: request.testsPassed,
      testsTotal: request.testsTotal,
      maxDurationMs: maxDuration,
    })

    // Track partial results for error recovery
    let partialScores: ScoreResult | null = null
    let partialMasteryScore: number | null = null
    let partialEvidence: ExtractedEvidence | null = null

    try {
      // =======================================================================
      // STEP 1: Extract Evidence (skip if pre-computed or time budget exceeded)
      // =======================================================================
      let evidence: ExtractedEvidence

      if (request.skipEvidence || !hasTimeBudget(maxDuration * 0.3)) {
        // Use default evidence if skipped
        logger.info("[FeedbackOrchestrator] Skipping evidence extraction", {
          reason: request.skipEvidence ? "pre-computed" : "time budget",
          elapsedMs: getElapsed(),
        })
        evidence = this.createDefaultEvidence()
      } else {
        const extractStart = Date.now()
        evidence = await this.extractEvidence(request)
        agentCalls.push({
          agent: "scorer", // Using scorer type for evidence extraction
          latencyMs: Date.now() - extractStart,
        })

        logger.info("[FeedbackOrchestrator] Evidence extracted", {
          approachExplained: evidence.approach.explained,
          complexityMentioned: evidence.timeComplexity.mentioned,
          edgeCasesCount: evidence.edgeCases.mentionedByCandidate.length,
        })
      }

      // =======================================================================
      // STEP 2: Calculate Scores
      // =======================================================================
      const scorerStart = Date.now()

      // Build AI validation from pre-computed data if available
      const aiValidation = request.aiValidation
        ? {
            isCoherent: true,
            responsesRelevant: true,
            approachExplained: request.aiValidation.approachExplained,
            approachQuality: request.aiValidation.approachQuality,
            complexityDiscussed: request.aiValidation.complexityDiscussed,
            complexityAccurate: false,
            statedComplexity: null,
            questionsAsked: 0,
            questionsAnswered: 0,
            edgeCasesConsidered: request.aiValidation.edgeCasesConsidered,
            alternativesDiscussed: false,
            communicationScore: request.aiValidation.communicationScore,
          }
        : undefined

      const scorerInput: ScorerAgentInput = {
        scenarioType: request.scenarioType,
        scenarioTitle: request.scenarioTitle,
        transcript: request.transcript,
        code: request.code,
        testsPassed: request.testsPassed,
        testsTotal: request.testsTotal,
        evidence,
        aiValidation, // Pass pre-computed validation if available
        designNotes: request.designNotes,
        optimalTimeComplexity: request.optimalTimeComplexity,
        optimalSpaceComplexity: request.optimalSpaceComplexity,
        timeSpentSeconds: request.timeSpentSeconds,
        hintsUsed: request.hintsUsed,
      }

      const scorerOutput = await this.scorerAgent.execute(scorerInput)
      agentCalls.push({
        agent: "scorer",
        latencyMs: Date.now() - scorerStart,
      })

      // Save partial results for error recovery
      partialScores = scorerOutput.scores
      partialMasteryScore = scorerOutput.masteryScore
      partialEvidence = evidence

      logger.info("[FeedbackOrchestrator] Scores calculated", {
        overall: scorerOutput.scores.overall,
        masteryScore: scorerOutput.masteryScore,
      })

      // =======================================================================
      // STEP 3: Generate Feedback
      // =======================================================================
      const writerStart = Date.now()
      const writerInput: FeedbackWriterAgentInput = {
        scenarioType: request.scenarioType,
        scenarioTitle: request.scenarioTitle,
        scores: scorerOutput.scores,
        evidence,
        testsPassed: request.testsPassed,
        testsTotal: request.testsTotal,
        code: request.code,
        optimalComplexity: request.optimalTimeComplexity,
        userName: request.userName,
        skillLevel: request.skillLevel,
      }

      const feedbackOutput = await this.feedbackWriterAgent.execute(writerInput)
      agentCalls.push({
        agent: "feedback_writer",
        latencyMs: Date.now() - writerStart,
      })

      logger.info("[FeedbackOrchestrator] Feedback generated", {
        whatWorkedCount: feedbackOutput.whatWorked.length,
        fixNextCount: feedbackOutput.fixNext.length,
      })

      // =======================================================================
      // STEP 4: Constitutional Review (optional, skip if time budget exceeded)
      // =======================================================================
      let finalScores = scorerOutput.scores
      const constitutionalReview = {
        scoreAdjusted: false,
        feedbackCorrected: false,
        issues: [] as string[],
      }

      // Skip constitutional review if time budget exceeded (80% of max duration)
      const shouldSkipConstitutional =
        request.skipConstitutional || !hasTimeBudget(maxDuration * 0.8)

      if (shouldSkipConstitutional) {
        logger.info("[FeedbackOrchestrator] Skipping constitutional review", {
          reason: request.skipConstitutional ? "explicitly skipped" : "time budget",
          elapsedMs: getElapsed(),
        })
      } else {
        const constStart = Date.now()
        const constInput: ConstitutionalAgentInput = {
          scores: scorerOutput.scores,
          feedbackText: feedbackOutput.rawFeedback,
          tldr: feedbackOutput.tldr,
          whatWorked: feedbackOutput.whatWorked,
          fixNext: feedbackOutput.fixNext,
          evidence,
          scenarioType: request.scenarioType,
          testsPassed: request.testsPassed,
          testsTotal: request.testsTotal,
          optimalComplexity: request.optimalTimeComplexity,
        }

        const constOutput = await this.constitutionalAgent.execute(constInput)
        agentCalls.push({
          agent: "constitutional",
          latencyMs: Date.now() - constStart,
        })

        // Apply score adjustments if needed
        if (
          constOutput.scoreAdjustments.madeChanges &&
          constOutput.scoreAdjustments.adjustedScores
        ) {
          finalScores = constOutput.scoreAdjustments.adjustedScores
          constitutionalReview.scoreAdjusted = true
        }

        constitutionalReview.feedbackCorrected = constOutput.feedbackCorrections.length > 0
        constitutionalReview.issues = constOutput.issues

        logger.info("[FeedbackOrchestrator] Constitutional review complete", {
          scoreAdjusted: constitutionalReview.scoreAdjusted,
          feedbackCorrected: constitutionalReview.feedbackCorrected,
          issuesCount: constitutionalReview.issues.length,
        })
      }

      // =======================================================================
      // RETURN RESULT
      // =======================================================================
      const totalLatency = Date.now() - startTime

      logger.info("[FeedbackOrchestrator] Feedback generation complete", {
        totalLatencyMs: totalLatency,
        finalScore: finalScores.overall,
        agentCallsCount: agentCalls.length,
      })

      return {
        success: true,
        data: {
          scores: finalScores,
          masteryScore: scorerOutput.masteryScore,
          tldr: feedbackOutput.tldr,
          whatWorked: feedbackOutput.whatWorked,
          fixNext: feedbackOutput.fixNext,
          actionPlan: feedbackOutput.actionPlan,
          detailedFeedback: feedbackOutput.detailedFeedback,
          evidence,
          constitutionalReview,
        },
        metrics: {
          totalLatencyMs: totalLatency,
          agentCalls,
          retries: 0,
        },
      }
    } catch (error) {
      const totalLatency = Date.now() - startTime

      logger.error("[FeedbackOrchestrator] Feedback generation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        totalLatencyMs: totalLatency,
        hasPartialScores: partialScores !== null,
      })

      // If we have partial scores from before the failure, return them
      // This allows the frontend to use real scores in fallback feedback
      if (partialScores && partialMasteryScore !== null) {
        logger.info("[FeedbackOrchestrator] Returning partial results with scores", {
          overall: partialScores.overall,
        })

        return {
          success: true, // Mark as success since we have usable data
          data: {
            scores: partialScores,
            masteryScore: partialMasteryScore,
            // Fallback feedback - frontend can generate better text if needed
            tldr: "Session evaluated. Review your scores below.",
            whatWorked: [],
            fixNext: [],
            actionPlan: [],
            detailedFeedback: "",
            evidence: partialEvidence || this.createDefaultEvidence(),
            constitutionalReview: {
              scoreAdjusted: false,
              feedbackCorrected: false,
              issues: [],
            },
            partialResult: true, // Flag to indicate this is partial
          },
          metrics: {
            totalLatencyMs: totalLatency,
            agentCalls,
            retries: 0,
          },
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Feedback generation failed",
        metrics: {
          totalLatencyMs: totalLatency,
          agentCalls,
          retries: 0,
        },
      }
    }
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private async extractEvidence(request: FeedbackRequest): Promise<ExtractedEvidence> {
    try {
      // Convert transcript to expected format
      const messages = request.transcript.map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("interviewer" as const),
        content: m.content,
      }))

      return await extractConversationEvidence(messages, {
        title: request.scenarioTitle,
        optimalTimeComplexity: request.optimalTimeComplexity || "Unknown",
        optimalSpaceComplexity: request.optimalSpaceComplexity || "Unknown",
        criticalEdgeCases: [],
      })
    } catch (error) {
      logger.warn("[FeedbackOrchestrator] Evidence extraction failed, using defaults", { error })
      return this.createDefaultEvidence()
    }
  }

  private createDefaultEvidence(): ExtractedEvidence {
    return {
      approach: {
        explained: false,
        type: "unclear",
        quote: null,
        messageIndex: null,
      },
      timeComplexity: {
        mentioned: false,
        value: null,
        explanationGiven: false,
        quote: null,
        messageIndex: null,
        isCorrect: null,
      },
      spaceComplexity: {
        mentioned: false,
        value: null,
        quote: null,
        messageIndex: null,
        isCorrect: null,
      },
      edgeCases: {
        mentionedByCandidate: [],
        mentionedAfterPrompt: [],
        missedCritical: [],
      },
      progression: {
        startedWithBruteForce: false,
        improvedAfterPrompt: false,
        selfCorrectedBugs: false,
        bugQuotes: [],
      },
      interviewerQuestions: [],
      communication: {
        explainedWhileCoding: false,
        askedClarifyingQuestions: false,
        respondedToFeedback: false,
        quotes: [],
      },
      hints: {
        totalGiven: 0,
        usedEffectively: false,
        copiedBlindly: false,
      },
    }
  }
}

// =============================================================================
// CONVENIENCE FUNCTION
// =============================================================================

/**
 * Generate feedback using the multi-agent orchestrator
 * This is the main entry point for v2 feedback generation
 */
export async function orchestrateFeedbackGeneration(
  request: FeedbackRequest
): Promise<OrchestrationResult<FeedbackResponse>> {
  const orchestrator = new FeedbackOrchestrator()
  return orchestrator.generateFeedback(request)
}
