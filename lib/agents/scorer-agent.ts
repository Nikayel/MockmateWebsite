/**
 * Scorer Agent - Calculates validated scores from evidence
 *
 * Single Responsibility: Calculate interview scores based on extracted evidence.
 * Wraps existing scoring-algorithms.ts logic in agent architecture.
 *
 * Model: Deterministic (no AI) - Uses algorithmic scoring
 */

import type { Agent, AgentConfig, ScorerInput, ScorerOutput, InteractionMetrics } from "./types"
import type { ScoreResult, ConversationValidation, PreScreenResult } from "@/lib/feedback/types"
import type { ExtractedEvidence } from "@/lib/feedback/structured-extraction"
import { logger } from "@/lib/logger"

// Import existing scoring functions (DRY - reuse existing logic)
import {
  calculateSystemDesignScores,
  calculateBugFixScores,
} from "@/lib/feedback/scoring-algorithms"
import { preScreenConversation } from "@/lib/feedback/pre-screening"

// =============================================================================
// TYPES
// =============================================================================

export interface ScorerAgentInput {
  // Scenario info
  scenarioType: "dsa" | "system-design" | "bugfix"
  scenarioTitle: string

  // Conversation transcript
  transcript: Array<{ role: "user" | "interviewer"; content: string }>

  // Code and test results
  code: string
  testsPassed: number
  testsTotal: number

  // Pre-extracted evidence (from EvidenceExtractorAgent)
  evidence?: ExtractedEvidence
  aiValidation?: ConversationValidation

  // Additional context
  designNotes?: string // For system design
  optimalTimeComplexity?: string
  optimalSpaceComplexity?: string

  // Metrics
  timeSpentSeconds?: number
  hintsUsed?: number
}

export interface ScorerAgentOutput {
  scores: ScoreResult
  breakdown: {
    understanding: number
    problemSolving: number
    codeQuality: number
    communication: number
  }
  masteryScore: number // For spaced repetition (code-focused)
  preScreen: PreScreenResult
  adjustments: string[] // Explanations of score adjustments made
}

// =============================================================================
// SCORER AGENT
// =============================================================================

export class ScorerAgent implements Agent<ScorerAgentInput, ScorerAgentOutput> {
  readonly config: AgentConfig = {
    type: "scorer",
    modelTier: "deterministic", // No AI - pure algorithmic
    description: "Calculates validated scores from extracted evidence",
    maxRetries: 0, // Deterministic, no retries needed
  }

  async execute(input: ScorerAgentInput): Promise<ScorerAgentOutput> {
    const startTime = Date.now()

    logger.info("[ScorerAgent] Calculating scores", {
      scenarioType: input.scenarioType,
      testsPassed: input.testsPassed,
      testsTotal: input.testsTotal,
    })

    // Step 1: Pre-screen conversation (fast algorithmic analysis)
    const preScreen = this.preScreenTranscript(input.transcript)

    // Step 2: Get or create AI validation (may be passed in)
    const aiValidation = input.aiValidation || this.createDefaultValidation(preScreen)

    // Step 3: Calculate scores based on scenario type
    let scores: ScoreResult
    const adjustments: string[] = []

    switch (input.scenarioType) {
      case "system-design":
        scores = calculateSystemDesignScores(preScreen, aiValidation, input.designNotes)
        break

      case "bugfix": {
        const passRate = input.testsTotal > 0 ? (input.testsPassed / input.testsTotal) * 100 : 0
        scores = calculateBugFixScores(passRate, preScreen, aiValidation)
        break
      }

      case "dsa":
      default:
        scores = this.calculateDSAScores(input, preScreen, aiValidation, adjustments)
        break
    }

    // Step 4: Apply score floors (ensure correct solutions are rewarded)
    scores = this.applyScoreFloors(scores, input, adjustments)

    // Step 5: Calculate mastery score (for spaced repetition)
    const masteryScore = this.calculateMasteryScore(input, scores)

    const latency = Date.now() - startTime
    logger.info("[ScorerAgent] Scoring complete", {
      overall: scores.overall,
      masteryScore,
      latencyMs: latency,
      adjustmentsCount: adjustments.length,
    })

    return {
      scores,
      breakdown: {
        understanding: scores.understanding,
        problemSolving: scores.problemSolving,
        codeQuality: scores.codeQuality,
        communication: scores.communication,
      },
      masteryScore,
      preScreen,
      adjustments,
    }
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private preScreenTranscript(
    transcript: Array<{ role: "user" | "interviewer"; content: string }>
  ): PreScreenResult {
    // Convert to expected format
    const messages = transcript.map((m) => ({
      role: m.role === "user" ? "candidate" : "interviewer",
      content: m.content,
    }))

    return preScreenConversation(messages)
  }

  private createDefaultValidation(preScreen: PreScreenResult): ConversationValidation {
    return {
      isCoherent: preScreen.hasContent,
      responsesRelevant: preScreen.hasContent,
      approachExplained: preScreen.hasKeywords.approach,
      approachQuality: preScreen.hasKeywords.approach ? "basic" : "none",
      complexityDiscussed: preScreen.hasKeywords.complexity,
      complexityAccurate: false,
      statedComplexity: null,
      questionsAsked: 0,
      questionsAnswered: 0,
      edgeCasesConsidered: preScreen.hasKeywords.edgeCases,
      alternativesDiscussed: preScreen.hasKeywords.alternatives,
      communicationScore: preScreen.hasContent ? 50 : 10,
    }
  }

  private calculateDSAScores(
    input: ScorerAgentInput,
    preScreen: PreScreenResult,
    aiValidation: ConversationValidation,
    adjustments: string[]
  ): ScoreResult {
    const passRate = input.testsTotal > 0 ? (input.testsPassed / input.testsTotal) * 100 : 0

    // Base scores from evidence
    const understanding = this.calculateUnderstandingScore(passRate, aiValidation, input.evidence)
    let problemSolving = this.calculateProblemSolvingScore(passRate, aiValidation, input.evidence)
    const codeQuality = this.calculateCodeQualityScore(passRate, input.code)
    let communication = aiValidation.communicationScore

    // Apply adjustments based on evidence
    if (input.evidence) {
      // Reward progression (started brute force, improved)
      if (input.evidence.progression.improvedAfterPrompt) {
        problemSolving = Math.min(100, problemSolving + 10)
        adjustments.push("+10 problem-solving: improved approach after feedback")
      }

      // Reward self-correction
      if (input.evidence.progression.selfCorrectedBugs) {
        problemSolving = Math.min(100, problemSolving + 5)
        adjustments.push("+5 problem-solving: self-corrected bugs")
      }

      // Penalize silent solution (correct but no explanation)
      // Note: For 100% pass rate, applyScoreFloors will apply a floor of 50-55,
      // so this cap is less harsh for perfect solutions
      if (passRate >= 80 && !input.evidence.approach.explained) {
        // Less harsh cap for perfect solutions - they proved understanding through code
        const silentCap = passRate >= 100 ? 55 : 45
        communication = Math.min(communication, silentCap)
        adjustments.push(`Cap communication at ${silentCap}: silent solution (no explanation)`)
      }
    }

    // Calculate overall using DSA weights
    const overall = Math.round(
      understanding * 0.3 + problemSolving * 0.25 + codeQuality * 0.25 + communication * 0.2
    )

    return {
      understanding,
      problemSolving,
      codeQuality,
      communication,
      overall,
    }
  }

  private calculateUnderstandingScore(
    passRate: number,
    aiValidation: ConversationValidation,
    evidence?: ExtractedEvidence
  ): number {
    let score = 0

    // Test pass rate contribution (50%)
    score += passRate * 0.5

    // Approach explanation (30%)
    if (aiValidation.approachExplained) {
      const qualityBonus: Record<string, number> = {
        excellent: 30,
        good: 25,
        basic: 18,
        poor: 10,
        none: 0,
      }
      score += qualityBonus[aiValidation.approachQuality] || 0
    }

    // Complexity discussion (20%)
    if (aiValidation.complexityDiscussed) {
      score += aiValidation.complexityAccurate ? 20 : 10
    }

    return Math.min(100, Math.round(score))
  }

  private calculateProblemSolvingScore(
    passRate: number,
    aiValidation: ConversationValidation,
    evidence?: ExtractedEvidence
  ): number {
    let score = 0

    // Test pass rate (40%)
    score += passRate * 0.4

    // Edge cases consideration (25%)
    if (aiValidation.edgeCasesConsidered) {
      score += 25
    } else if (evidence?.edgeCases.mentionedAfterPrompt.length) {
      score += 15 // Partial credit if mentioned after prompt
    }

    // Alternatives discussed (20%)
    if (aiValidation.alternativesDiscussed) {
      score += 20
    }

    // Progression (15%)
    if (evidence?.progression.improvedAfterPrompt) {
      score += 15
    } else if (evidence?.progression.startedWithBruteForce) {
      score += 8 // Some credit for having a starting point
    }

    return Math.min(100, Math.round(score))
  }

  private calculateCodeQualityScore(passRate: number, code: string): number {
    let score = 0

    // Test pass rate (60%)
    score += passRate * 0.6

    // Code cleanliness heuristics (40%)
    const hasComments = /\/\/|#|\/\*/.test(code)
    const hasMeaningfulNames = /[a-z][a-zA-Z]{3,}/.test(code)
    const notTooLong = code.split("\n").length < 100
    const hasNoHardcodedValues = !/return\s+\[?\d+,?\s*\d*\]?;?\s*$/.test(code)

    if (hasComments) score += 10
    if (hasMeaningfulNames) score += 10
    if (notTooLong) score += 10
    if (hasNoHardcodedValues) score += 10

    return Math.min(100, Math.round(score))
  }

  private applyScoreFloors(
    scores: ScoreResult,
    input: ScorerAgentInput,
    adjustments: string[]
  ): ScoreResult {
    const passRate = input.testsTotal > 0 ? (input.testsPassed / input.testsTotal) * 100 : 0

    // Floor 1: All tests passing should guarantee minimum 60% overall
    if (passRate === 100 && scores.overall < 60) {
      const newOverall = Math.max(scores.overall, 60)
      adjustments.push(`Score floor applied: ${scores.overall} → ${newOverall} (100% pass rate)`)
      return { ...scores, overall: newOverall }
    }

    // Floor 2: High pass rate (>80%) should guarantee minimum 50%
    if (passRate >= 80 && scores.overall < 50) {
      const newOverall = Math.max(scores.overall, 50)
      adjustments.push(
        `Score floor applied: ${scores.overall} → ${newOverall} (${passRate}% pass rate)`
      )
      return { ...scores, overall: newOverall }
    }

    return scores
  }

  private calculateMasteryScore(input: ScorerAgentInput, scores: ScoreResult): number {
    // Mastery score is CODE-FOCUSED (excludes communication)
    // Used for spaced repetition scheduling

    const passRate = input.testsTotal > 0 ? (input.testsPassed / input.testsTotal) * 100 : 0

    // Weights: Correctness 60%, Time Efficiency 25%, Hint Dependency 15%
    const correctnessScore = passRate
    const efficiencyScore = scores.codeQuality // Approximation
    const hintPenalty = input.hintsUsed ? Math.min(15, input.hintsUsed * 5) : 0

    const mastery = Math.round(
      correctnessScore * 0.6 + efficiencyScore * 0.25 + (15 - hintPenalty) * (100 / 15) * 0.15
    )

    return Math.min(100, Math.max(0, mastery))
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createScorerAgent(): ScorerAgent {
  return new ScorerAgent()
}
