/**
 * Constitutional Agent - Reviews feedback for fairness and accuracy
 *
 * Single Responsibility: Critique and correct scores/feedback using Constitutional AI principles.
 * Wraps existing constitutional-ai.ts logic in agent architecture.
 *
 * Model: Cheap (uses fast model for critique)
 */

import type {
  Agent,
  AgentConfig,
  ConstitutionalInput,
  ConstitutionalOutput,
  FeedbackCorrection,
} from "./types"
import type {
  ScoreResult,
  ScoreCritiqueAdjustment,
  FeedbackCritiqueAdjustment,
} from "@/lib/feedback/types"
import type { ExtractedEvidence } from "@/lib/feedback/structured-extraction"
import { generateAIResponse } from "@/lib/ai-providers"
import { logger } from "@/lib/logger"

// Import existing critique functions (DRY)
import { critiqueScores, critiqueFeedbackText } from "@/lib/feedback/constitutional-ai"

// =============================================================================
// TYPES
// =============================================================================

export interface ConstitutionalAgentInput {
  // Scores to review
  scores: ScoreResult

  // Feedback text to review
  feedbackText: string
  tldr: string
  whatWorked: string[]
  fixNext: string[]

  // Evidence for verification
  evidence: ExtractedEvidence

  // Context
  scenarioType: "dsa" | "system-design" | "bugfix"
  testsPassed: number
  testsTotal: number
  optimalComplexity?: string
}

export interface ConstitutionalAgentOutput {
  // Score adjustments
  scoreAdjustments: {
    madeChanges: boolean
    adjustedScores?: ScoreResult
    reasoning: string
  }

  // Feedback corrections
  feedbackCorrections: FeedbackCorrection[]

  // Overall validity
  isValid: boolean
  issues: string[]
}

// =============================================================================
// CONSTITUTIONAL AGENT
// =============================================================================

export class ConstitutionalAgent implements Agent<
  ConstitutionalAgentInput,
  ConstitutionalAgentOutput
> {
  readonly config: AgentConfig = {
    type: "constitutional",
    modelTier: "cheap", // Fast critique
    description: "Reviews feedback for fairness, accuracy, tone, and actionability",
    maxRetries: 1,
  }

  async execute(input: ConstitutionalAgentInput): Promise<ConstitutionalAgentOutput> {
    const startTime = Date.now()

    logger.info("[ConstitutionalAgent] Reviewing feedback", {
      scenarioType: input.scenarioType,
      originalScore: input.scores.overall,
    })

    const passRate = input.testsTotal > 0 ? (input.testsPassed / input.testsTotal) * 100 : 0

    // Step 1: Critique scores
    const scoreCritique = await this.critiqueScoresWrapper(input, passRate)

    // Step 2: Critique feedback text
    const feedbackCritique = await this.critiqueFeedbackWrapper(input)

    // Step 3: Apply Constitutional AI rules
    const corrections = this.extractCorrections(feedbackCritique)
    const issues = this.collectIssues(scoreCritique, feedbackCritique)

    const latency = Date.now() - startTime
    logger.info("[ConstitutionalAgent] Review complete", {
      latencyMs: latency,
      scoreMadeChanges: scoreCritique.madeChanges,
      feedbackCorrections: corrections.length,
      issuesFound: issues.length,
    })

    return {
      scoreAdjustments: {
        madeChanges: scoreCritique.madeChanges,
        adjustedScores: scoreCritique.adjustedScores
          ? {
              understanding: scoreCritique.adjustedScores.understanding,
              problemSolving: scoreCritique.adjustedScores.problemSolving,
              codeQuality: scoreCritique.adjustedScores.codeQuality,
              communication: scoreCritique.adjustedScores.communication,
              overall: this.calculateOverall(scoreCritique.adjustedScores),
            }
          : undefined,
        reasoning: scoreCritique.reasoning,
      },
      feedbackCorrections: corrections,
      isValid: issues.length === 0,
      issues,
    }
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private async critiqueScoresWrapper(
    input: ConstitutionalAgentInput,
    passRate: number
  ): Promise<ScoreCritiqueAdjustment> {
    try {
      return await critiqueScores(input.scores, {
        passRate,
        scenarioType: input.scenarioType,
        aiValidation: {
          isCoherent: true,
          responsesRelevant: true,
          approachExplained: input.evidence.approach.explained,
          approachQuality: input.evidence.approach.type === "optimized" ? "good" : "basic",
          complexityDiscussed: input.evidence.timeComplexity.mentioned,
          complexityAccurate: input.evidence.timeComplexity.isCorrect || false,
          statedComplexity: input.evidence.timeComplexity.value,
          questionsAsked: input.evidence.interviewerQuestions.length,
          questionsAnswered: input.evidence.interviewerQuestions.filter((q) => q.answered).length,
          edgeCasesConsidered: input.evidence.edgeCases.mentionedByCandidate.length > 0,
          alternativesDiscussed: input.evidence.progression.improvedAfterPrompt,
          communicationScore: input.scores.communication,
        },
        extractedEvidence: input.evidence,
        problemContext: input.optimalComplexity
          ? {
              title: "",
              optimalTimeComplexity: input.optimalComplexity,
              optimalSpaceComplexity: "",
            }
          : undefined,
      })
    } catch (error) {
      logger.warn("[ConstitutionalAgent] Score critique failed, using passthrough", { error })
      return {
        critiques: [],
        reasoning: "Critique failed, scores unchanged",
        madeChanges: false,
      }
    }
  }

  private async critiqueFeedbackWrapper(
    input: ConstitutionalAgentInput
  ): Promise<FeedbackCritiqueAdjustment> {
    try {
      const passRate = input.testsTotal > 0 ? (input.testsPassed / input.testsTotal) * 100 : 0

      return await critiqueFeedbackText(input.feedbackText, input.scores, {
        passRate,
        scenarioType: input.scenarioType,
        isIncomplete: false, // Code completeness checked at route level
      })
    } catch (error) {
      logger.warn("[ConstitutionalAgent] Feedback critique failed, using passthrough", { error })
      return {
        critiques: [],
        reasoning: "Critique failed, feedback unchanged",
        madeChanges: false,
      }
    }
  }

  private extractCorrections(critique: FeedbackCritiqueAdjustment): FeedbackCorrection[] {
    if (!critique.madeChanges || !critique.critiques) {
      return []
    }

    return critique.critiques
      .filter((c) => !c.passed && c.suggestion)
      .map((c) => ({
        field: c.aspect,
        original: c.issue || "",
        corrected: c.suggestion || "",
        reason: `Constitutional AI: ${c.aspect} principle violated`,
      }))
  }

  private collectIssues(
    scoreCritique: ScoreCritiqueAdjustment,
    feedbackCritique: FeedbackCritiqueAdjustment
  ): string[] {
    const issues: string[] = []

    // Score issues
    for (const critique of scoreCritique.critiques || []) {
      if (!critique.passed && critique.issue) {
        issues.push(`Score ${critique.aspect}: ${critique.issue}`)
      }
    }

    // Feedback issues
    for (const critique of feedbackCritique.critiques || []) {
      if (!critique.passed && critique.issue) {
        issues.push(`Feedback ${critique.aspect}: ${critique.issue}`)
      }
    }

    return issues
  }

  private calculateOverall(scores: Partial<ScoreResult>): number {
    // DSA weights
    return Math.round(
      (scores.understanding || 0) * 0.3 +
        (scores.problemSolving || 0) * 0.25 +
        (scores.codeQuality || 0) * 0.25 +
        (scores.communication || 0) * 0.2
    )
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createConstitutionalAgent(): ConstitutionalAgent {
  return new ConstitutionalAgent()
}
