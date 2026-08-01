import { SCORING, clampScore } from "@/lib/constants"
import type { ConversationValidation, PreScreenResult, ScoreResult } from "../types"
import {
  assessCommunicationEvidence,
  capSubscoresForCommunicationEvidence,
  capOverallForCommunicationEvidence,
} from "./communication-gate"

/**
 * Bug fix scoring emphasizes debugging process and root-cause analysis.
 */
export function calculateBugFixScores(
  passRate: number,
  preScreen: PreScreenResult,
  aiValidation: ConversationValidation
): ScoreResult {
  let understanding = 20
  if (passRate >= 80) {
    understanding = Math.min(85, passRate)
  } else if (passRate >= 50) {
    understanding = passRate + 10
  } else {
    understanding = Math.max(20, passRate + 15)
  }

  if (aiValidation.approachExplained && aiValidation.isCoherent) {
    const approachBonus =
      {
        excellent: 15,
        good: 10,
        basic: 5,
        poor: 2,
        none: 0,
      }[aiValidation.approachQuality] || 0
    understanding = Math.min(98, understanding + approachBonus)
  }

  let problemSolving = Math.round(passRate * 0.7 + 15)
  if (aiValidation.edgeCasesConsidered && aiValidation.isCoherent) {
    problemSolving = Math.min(95, problemSolving + 10)
  }
  if (aiValidation.alternativesDiscussed && aiValidation.isCoherent) {
    problemSolving = Math.min(95, problemSolving + 5)
  }

  const codeQuality = Math.min(100, Math.round(passRate * 0.8 + 20))

  let communication = 30
  if (!aiValidation.isCoherent) {
    communication = Math.min(25, aiValidation.communicationScore)
  } else {
    communication = aiValidation.communicationScore
    if (aiValidation.questionsAsked > 0) {
      const answerRate = aiValidation.questionsAnswered / aiValidation.questionsAsked
      if (answerRate >= 0.7) communication = Math.min(95, communication + 5)
    }
  }

  // Relevance and keyword-stuffing caps. This scorer previously capped on
  // incoherence alone, so an irrelevant or stuffed session kept the raw
  // aiValidation.communicationScore (measured: 90, overall 95, identical to a
  // clean session). Applied after the answer-rate bonus, and as min-of-all
  // rather than first-match, so a session tripping several rules takes the
  // harshest.
  if (!aiValidation.responsesRelevant) {
    communication = Math.min(45, communication)
  }
  if (preScreen.suspiciousPatterns.keywordStuffing) {
    communication = Math.min(35, communication)
  }

  // Communication-evidence gate: a bugfix round scored without the evidence
  // pipeline leans on pass rate; if the candidate also never talked through
  // their debugging, Understanding/Problem-Solving cannot be earned from it.
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

  const bfw = SCORING.BUG_FIX_WEIGHTS
  const overall = capOverallForCommunicationEvidence(
    Math.round(
      understanding * bfw.UNDERSTANDING +
        problemSolving * bfw.PROBLEM_SOLVING +
        codeQuality * bfw.CODE_QUALITY +
        communication * bfw.COMMUNICATION
    ),
    commEvidenceLevel
  )

  return {
    understanding: clampScore(understanding),
    problemSolving: clampScore(problemSolving),
    codeQuality: clampScore(codeQuality),
    communication: clampScore(communication),
    overall: clampScore(overall),
  }
}
