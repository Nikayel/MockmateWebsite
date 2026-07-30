import { SCORING } from "@/lib/constants"
import type { ConversationValidation, ExtendedScoreResult, ScoreResult } from "../types"
import { assessCommunicationEvidence, isSilentSolution } from "./communication-gate"

/**
 * Apply score floors for correct solutions while preserving interview communication penalties.
 */
export function applyScoreFloors(
  scores: ScoreResult,
  passRate: number,
  efficiencyScore: number | undefined,
  aiValidation: ConversationValidation,
  candidateMessageCount: number
): ExtendedScoreResult {
  const isOptimal = (efficiencyScore || 0) >= 80
  const explainedApproach =
    aiValidation.approachExplained &&
    aiValidation.isCoherent &&
    aiValidation.approachQuality !== "none" &&
    aiValidation.approachQuality !== "poor"
  const hasGoodComm = aiValidation.communicationScore >= 60 && explainedApproach
  // Shared definition, so the "Silent Solution" banner means the same thing here as
  // on the Edge route. The old local rule (passRate >= 80 && !explainedApproach)
  // fired on chatty sessions the communication gate never capped, which made the
  // banner's "your Communication score was capped" claim untrue.
  const silentSolution = isSilentSolution(
    assessCommunicationEvidence({
      candidateMessageCount,
      approachExplained: aiValidation.approachExplained,
      complexityDiscussed: aiValidation.complexityDiscussed,
    }),
    passRate
  )

  let overall = scores.overall
  let communication = scores.communication
  let understanding = scores.understanding
  let problemSolving = scores.problemSolving
  let codeQuality = scores.codeQuality

  if (passRate >= 100 && isOptimal && hasGoodComm) {
    overall = Math.max(85, overall)
    communication = Math.max(70, communication)
  } else if (passRate >= 100 && isOptimal && explainedApproach) {
    overall = Math.max(78, overall)
    communication = Math.max(55, communication)
  } else if (passRate >= 100 && isOptimal) {
    overall = Math.max(55, overall)
    communication = Math.min(35, communication)
  } else if (passRate >= 100 && explainedApproach) {
    overall = Math.max(72, overall)
  } else if (passRate >= 100) {
    overall = Math.max(52, overall)
    communication = Math.min(40, communication)
  } else if (passRate >= 90) {
    overall = Math.max(50, overall)
  } else if (passRate >= 80) {
    overall = Math.max(45, overall)
  }

  if (passRate >= 100) {
    // Understanding/Problem-Solving floors are interview credit: they require the
    // candidate to have actually shown their thinking. A silent perfect solution
    // keeps the communication-gate caps; only the code itself (codeQuality) floors.
    if (explainedApproach) {
      understanding = Math.max(60, understanding)
      problemSolving = Math.max(65, problemSolving)
    }
    codeQuality = Math.max(70, codeQuality)

    if (isOptimal) {
      if (explainedApproach) {
        understanding = Math.max(70, understanding)
        problemSolving = Math.max(75, problemSolving)
      }
      codeQuality = Math.max(80, codeQuality)
    }

    const pw = SCORING.PERFORMANCE_WEIGHTS
    const newOverall = Math.round(
      understanding * pw.UNDERSTANDING +
        problemSolving * pw.PROBLEM_SOLVING +
        codeQuality * pw.CODE_QUALITY +
        communication * pw.COMMUNICATION
    )
    overall = Math.max(overall, newOverall)
  } else if (passRate >= 80) {
    if (explainedApproach) {
      understanding = Math.max(50, understanding)
      problemSolving = Math.max(55, problemSolving)
    }
    codeQuality = Math.max(55, codeQuality)
  }

  return {
    ...scores,
    understanding,
    problemSolving,
    codeQuality,
    communication,
    overall,
    silentSolution,
  }
}
