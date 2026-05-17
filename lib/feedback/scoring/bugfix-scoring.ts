import { SCORING, clampScore } from "@/lib/constants"
import type { ConversationValidation, PreScreenResult, ScoreResult } from "../types"

/**
 * Bug fix scoring emphasizes debugging process and root-cause analysis.
 */
export function calculateBugFixScores(
  passRate: number,
  _preScreen: PreScreenResult,
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

  const bfw = SCORING.BUG_FIX_WEIGHTS
  const overall = Math.round(
    understanding * bfw.UNDERSTANDING +
      problemSolving * bfw.PROBLEM_SOLVING +
      codeQuality * bfw.CODE_QUALITY +
      communication * bfw.COMMUNICATION
  )

  return {
    understanding: clampScore(understanding),
    problemSolving: clampScore(problemSolving),
    codeQuality: clampScore(codeQuality),
    communication: clampScore(communication),
    overall: clampScore(overall),
  }
}
