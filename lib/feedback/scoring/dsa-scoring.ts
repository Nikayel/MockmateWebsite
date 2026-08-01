import { SCORING, clampScore } from "@/lib/constants"
import { logger } from "@/lib/logger"
import { analyzeCodeCompleteness } from "../completeness-analysis"
import type { ExtractedEvidence } from "../structured-extraction"
import type { ConversationValidation, PreScreenResult, ScoreResult } from "../types"
import { calculateBugFixScores } from "./bugfix-scoring"
import { calculateSystemDesignScores } from "./system-design-scoring"
import {
  assessCommunicationEvidence,
  capSubscoresForCommunicationEvidence,
  capOverallForCommunicationEvidence,
} from "./communication-gate"

/**
 * Calculate final scores using algorithmic signals, validated conversation signals,
 * and structured evidence extracted from the transcript.
 */
export function calculateValidatedScores(
  passRate: number,
  efficiencyMetrics: { efficiencyScore?: number; difficulty?: string } | undefined,
  preScreen: PreScreenResult,
  aiValidation: ConversationValidation,
  scenarioType?: string,
  code?: string,
  extractedEvidence?: ExtractedEvidence
): ScoreResult {
  if (scenarioType === "system-design") {
    return calculateSystemDesignScores(preScreen, aiValidation, code)
  }

  if (scenarioType === "bugfix") {
    return calculateBugFixScores(passRate, preScreen, aiValidation)
  }

  const codeCompleteness = code
    ? analyzeCodeCompleteness(code, "python")
    : {
        isIncomplete: false,
        reason: "",
        hasBaseCase: false,
        hasActualLogic: true,
        stubPatterns: [],
      }

  const isIncompleteSolution = codeCompleteness.isIncomplete
  const hasOnlyBaseCasePassing =
    passRate > 0 &&
    passRate < 30 &&
    codeCompleteness.hasBaseCase &&
    !codeCompleteness.hasActualLogic
  const maxScoreForIncomplete = 25

  let understanding = 0
  if (passRate >= 80) {
    understanding = Math.min(85, passRate)
  } else if (passRate >= 50) {
    understanding = passRate + 5
  } else {
    understanding = Math.max(20, passRate)
  }

  if (aiValidation.approachExplained && aiValidation.isCoherent) {
    const approachBonus =
      {
        excellent: 12,
        good: 8,
        basic: 4,
        poor: 2,
        none: 0,
      }[aiValidation.approachQuality] || 0
    understanding = Math.min(98, understanding + approachBonus)
  }

  if (aiValidation.complexityDiscussed && aiValidation.complexityAccurate && passRate >= 50) {
    understanding = Math.min(98, understanding + 5)
  } else if (aiValidation.complexityDiscussed && !aiValidation.complexityAccurate) {
    understanding = Math.max(20, understanding - 5)
  }

  if (isIncompleteSolution || hasOnlyBaseCasePassing) {
    understanding = Math.min(maxScoreForIncomplete, understanding)
  }

  const effScore = efficiencyMetrics?.efficiencyScore || 50
  let problemSolving = Math.round(passRate * 0.6 + effScore * 0.4)

  if (aiValidation.alternativesDiscussed && aiValidation.isCoherent && !isIncompleteSolution) {
    problemSolving = Math.min(95, problemSolving + 5)
  }

  if (extractedEvidence && !isIncompleteSolution) {
    const proactiveEdgeCases = extractedEvidence.edgeCases.mentionedByCandidate.length
    if (proactiveEdgeCases >= 3) {
      problemSolving = Math.min(95, problemSolving + 7)
    } else if (proactiveEdgeCases >= 1) {
      problemSolving = Math.min(95, problemSolving + 4)
    }

    if (
      extractedEvidence.progression.startedWithBruteForce &&
      extractedEvidence.progression.improvedAfterPrompt
    ) {
      problemSolving = Math.min(95, problemSolving + 6)
    }

    if (extractedEvidence.progression.selfCorrectedBugs) {
      problemSolving = Math.min(95, problemSolving + 4)
    }

    if (extractedEvidence.hints.copiedBlindly) {
      problemSolving = Math.max(20, problemSolving - 15)
    } else if (extractedEvidence.hints.totalGiven >= 4) {
      problemSolving = Math.max(30, problemSolving - 8)
    } else if (
      extractedEvidence.hints.totalGiven >= 2 &&
      !extractedEvidence.hints.usedEffectively
    ) {
      problemSolving = Math.max(35, problemSolving - 5)
    }
  } else if (!isIncompleteSolution) {
    if (aiValidation.edgeCasesConsidered && aiValidation.isCoherent) {
      problemSolving = Math.min(95, problemSolving + 5)
    }
  }

  if (isIncompleteSolution || hasOnlyBaseCasePassing) {
    problemSolving = Math.min(maxScoreForIncomplete, problemSolving)
  }

  let codeQuality = Math.min(100, Math.round(passRate * 0.5 + effScore * 0.3 + 50 * 0.2))

  if (isIncompleteSolution || hasOnlyBaseCasePassing) {
    codeQuality = Math.min(maxScoreForIncomplete, codeQuality)
  }

  // A 0 from AI validation is a real "no communication" verdict and must not
  // be rewritten by || fallbacks; only non-finite values get a default.
  const validatedCommunicationScore = Number.isFinite(aiValidation.communicationScore)
    ? aiValidation.communicationScore
    : 10
  let communication = validatedCommunicationScore

  if (!aiValidation.isCoherent) {
    communication = Math.min(25, validatedCommunicationScore)
  } else if (!aiValidation.responsesRelevant) {
    communication = Math.min(45, validatedCommunicationScore)
  } else if (preScreen.suspiciousPatterns.keywordStuffing) {
    communication = Math.min(35, validatedCommunicationScore)
  } else {
    communication = validatedCommunicationScore

    if (aiValidation.questionsAsked > 0) {
      const answerRate = aiValidation.questionsAnswered / aiValidation.questionsAsked
      if (answerRate >= 0.8) {
        communication = Math.min(90, communication + 5)
      }
    }
  }

  const isOptimalSolution = passRate >= 100 && (effScore || 0) >= 80
  const isCorrectSolution = passRate >= 100
  const hasApproachIndicators =
    aiValidation.approachExplained ||
    (aiValidation.complexityDiscussed && aiValidation.alternativesDiscussed)

  if (hasApproachIndicators && aiValidation.isCoherent && aiValidation.approachQuality !== "none") {
    const qualityBonus =
      {
        excellent: 20,
        good: 12,
        basic: 5,
        poor: 0,
        none: 0,
      }[aiValidation.approachQuality] || 0

    if (isOptimalSolution) {
      communication = Math.min(95, communication + qualityBonus)
    } else if (isCorrectSolution) {
      communication = Math.min(85, communication + qualityBonus)
    } else {
      communication = Math.min(70, communication + Math.floor(qualityBonus / 2))
    }
  } else if (aiValidation.complexityDiscussed || aiValidation.alternativesDiscussed) {
    if (isCorrectSolution) {
      communication = Math.min(60, communication)
    } else {
      communication = Math.min(50, communication)
    }
  } else {
    if (isCorrectSolution) {
      communication =
        validatedCommunicationScore <= 15 ? validatedCommunicationScore : 15
    } else {
      const aiScore = Number.isFinite(aiValidation.communicationScore)
        ? aiValidation.communicationScore
        : 5
      communication = aiScore <= 10 ? aiScore : 10
    }
  }

  if (
    preScreen.hasContent &&
    preScreen.candidateMessageCount >= 3 &&
    preScreen.avgMessageLength >= 50 &&
    aiValidation.isCoherent &&
    hasApproachIndicators &&
    aiValidation.approachQuality !== "none" &&
    aiValidation.approachQuality !== "poor"
  ) {
    const qualityFloor =
      {
        excellent: 65,
        good: 55,
        basic: 45,
        poor: 35,
        none: 25,
      }[aiValidation.approachQuality] || 35
    communication = Math.max(qualityFloor, communication)
  }

  if (extractedEvidence) {
    let evidenceBonus = 0

    if (extractedEvidence.communication.explainedWhileCoding) {
      evidenceBonus += 4
    }
    if (extractedEvidence.communication.askedClarifyingQuestions) {
      evidenceBonus += 3
    }
    if (extractedEvidence.communication.respondedToFeedback) {
      evidenceBonus += 3
    }

    if (
      extractedEvidence.timeComplexity.mentioned &&
      extractedEvidence.timeComplexity.isCorrect === true
    ) {
      evidenceBonus += 3
    } else if (
      extractedEvidence.timeComplexity.mentioned &&
      extractedEvidence.timeComplexity.isCorrect === false
    ) {
      evidenceBonus -= 3
    }

    evidenceBonus = Math.min(10, Math.max(-5, evidenceBonus))
    communication = Math.min(95, Math.max(25, communication + evidenceBonus))

    const hasCommunicationEvidence =
      extractedEvidence.communication.quotes.length > 0 ||
      (extractedEvidence.approach.explained && extractedEvidence.approach.quote) ||
      (extractedEvidence.timeComplexity.mentioned && extractedEvidence.timeComplexity.quote)

    if (hasCommunicationEvidence && communication < 50) {
      logger.info("[Scoring] Evidence shows communication - enforcing floor", {
        currentScore: communication,
        enforcedFloor: 50,
        evidenceQuotes: extractedEvidence.communication.quotes.length,
        hasApproachQuote: !!(
          extractedEvidence.approach.explained && extractedEvidence.approach.quote
        ),
        hasComplexityQuote: !!(
          extractedEvidence.timeComplexity.mentioned && extractedEvidence.timeComplexity.quote
        ),
      })
      communication = 50
    }
  }

  // Communication-evidence gate: a silent (or nearly silent) session cannot earn
  // Understanding/Problem-Solving from pass rate alone — the interviewer never saw
  // the thinking. codeQuality stays earned; the code is real evidence.
  const commEvidenceLevel = assessCommunicationEvidence({
    candidateMessageCount: preScreen.candidateMessageCount,
    approachExplained: aiValidation.approachExplained,
    complexityDiscussed: aiValidation.complexityDiscussed,
  })
  const gated = capSubscoresForCommunicationEvidence(
    { understanding, problemSolving },
    commEvidenceLevel
  )
  understanding = gated.understanding
  problemSolving = gated.problemSolving

  const w = SCORING.PERFORMANCE_WEIGHTS
  let overall = Math.round(
    understanding * w.UNDERSTANDING +
      problemSolving * w.PROBLEM_SOLVING +
      codeQuality * w.CODE_QUALITY +
      communication * w.COMMUNICATION
  )

  if (isIncompleteSolution || hasOnlyBaseCasePassing) {
    overall = Math.min(28, overall)
  }

  overall = capOverallForCommunicationEvidence(overall, commEvidenceLevel)

  return {
    understanding: clampScore(understanding),
    problemSolving: clampScore(problemSolving),
    codeQuality: clampScore(codeQuality),
    communication: clampScore(communication),
    overall: clampScore(overall),
  }
}
