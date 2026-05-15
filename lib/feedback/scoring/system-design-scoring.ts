import { SCORING, clampScore } from "@/lib/constants"
import { isBlankDesignTemplate } from "../completeness-analysis"
import type { ConversationValidation, PreScreenResult, ScoreResult } from "../types"

/**
 * System design scoring is focused on architecture and discussion quality.
 * There is no test pass rate because system design is discussion-based.
 */
export function calculateSystemDesignScores(
  preScreen: PreScreenResult,
  aiValidation: ConversationValidation,
  designNotes?: string
): ScoreResult {
  const hasBlankDesignNotes = designNotes ? isBlankDesignTemplate(designNotes) : true

  const hasNoConversation = !preScreen.hasContent || preScreen.candidateMessageCount === 0
  const hasMinimalConversation =
    preScreen.candidateMessageCount > 0 && preScreen.candidateMessageCount < 3
  const hasMinimalContent = preScreen.avgMessageLength < 30
  const hasNoContent = hasNoConversation && hasBlankDesignNotes

  if (hasNoContent) {
    return {
      understanding: 5,
      problemSolving: 5,
      codeQuality: 5,
      communication: 5,
      overall: 5,
    }
  }

  if (hasBlankDesignNotes) {
    const maxScore = 20

    if (hasMinimalConversation || hasMinimalContent) {
      return {
        understanding: 10,
        problemSolving: 10,
        codeQuality: 10,
        communication: Math.min(15, aiValidation.communicationScore),
        overall: 11,
      }
    }

    const commScore = Math.min(maxScore, aiValidation.communicationScore)
    return {
      understanding: Math.min(maxScore, aiValidation.approachExplained ? 18 : 12),
      problemSolving: Math.min(maxScore, aiValidation.alternativesDiscussed ? 18 : 12),
      codeQuality: 10,
      communication: commScore,
      overall: Math.round((18 + 18 + 10 + commScore) / 5),
    }
  }

  if (hasNoConversation || (hasMinimalConversation && hasMinimalContent)) {
    return {
      understanding: 25,
      problemSolving: 25,
      codeQuality: 30,
      communication: 10,
      overall: 22,
    }
  }

  let understanding = 25
  if (aiValidation.approachExplained && aiValidation.isCoherent) {
    const approachBonus =
      {
        excellent: 55,
        good: 40,
        basic: 25,
        poor: 10,
        none: 0,
      }[aiValidation.approachQuality] || 0
    understanding = Math.min(95, understanding + approachBonus)
  }
  if (!aiValidation.isCoherent || !aiValidation.responsesRelevant) {
    understanding = Math.max(15, understanding - 25)
  }

  let problemSolving = 25
  if (aiValidation.alternativesDiscussed && aiValidation.isCoherent) {
    problemSolving = Math.min(85, problemSolving + 35)
  }
  if (aiValidation.edgeCasesConsidered && aiValidation.isCoherent) {
    problemSolving = Math.min(95, problemSolving + 25)
  }
  if (!aiValidation.isCoherent || !aiValidation.responsesRelevant) {
    problemSolving = Math.max(15, problemSolving - 25)
  }

  let codeQuality = 25
  if (aiValidation.isCoherent && preScreen.hasContent) {
    const messageCount = preScreen.candidateMessageCount || 0
    if (messageCount >= 10) codeQuality = Math.min(90, codeQuality + 45)
    else if (messageCount >= 5) codeQuality = Math.min(80, codeQuality + 35)
    else if (messageCount >= 3) codeQuality = Math.min(70, codeQuality + 25)
    else codeQuality = Math.min(55, codeQuality + 15)
  } else {
    codeQuality = Math.max(15, codeQuality - 15)
  }

  let communication = aiValidation.communicationScore

  if (!aiValidation.isCoherent) {
    communication = Math.min(25, communication)
  } else if (!aiValidation.responsesRelevant) {
    communication = Math.min(35, communication)
  }

  if (aiValidation.isCoherent && aiValidation.questionsAsked > 0) {
    const answerRate = aiValidation.questionsAnswered / aiValidation.questionsAsked
    if (answerRate >= 0.8) communication = Math.min(95, communication + 10)
    else if (answerRate >= 0.5) communication = Math.min(90, communication + 5)
  }

  if (preScreen.candidateMessageCount < 3) {
    communication = Math.min(40, communication)
  }

  const sdw = SCORING.SYSTEM_DESIGN_WEIGHTS
  const overall = Math.round(
    understanding * sdw.UNDERSTANDING +
      problemSolving * sdw.PROBLEM_SOLVING +
      codeQuality * sdw.CODE_QUALITY +
      communication * sdw.COMMUNICATION
  )

  return {
    understanding: clampScore(understanding),
    problemSolving: clampScore(problemSolving),
    codeQuality: clampScore(codeQuality),
    communication: clampScore(communication),
    overall: clampScore(overall),
  }
}
