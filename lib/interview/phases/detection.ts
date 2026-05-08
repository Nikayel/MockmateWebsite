import type { InterviewPhase, PhaseDetectionContext } from "./types"

export function detectInterviewPhase(context: PhaseDetectionContext): InterviewPhase {
  if (context.hasSubmitted) {
    return "post_interview"
  }

  if (context.testsHaveRun) {
    return "testing"
  }

  const codeWritten = context.currentCodeLength - context.starterCodeLength
  if (codeWritten > 50 && context.messageCount > 4) {
    return "coding"
  }

  if (context.approachExplained) {
    return "discussion"
  }

  if (context.messageCount === 0) {
    return "intro"
  }

  if (context.messageCount <= 4 && !context.approachExplained) {
    return "clarification"
  }

  return "discussion"
}

export function detectInterviewPhaseLegacy(context: {
  messageCount: number
  hasExplainedApproach: boolean
  hasStartedCoding: boolean
  testsHaveRun: boolean
  allTestsPassed: boolean
  hasSubmitted: boolean
}): InterviewPhase {
  return detectInterviewPhase({
    hasSubmitted: context.hasSubmitted,
    testsHaveRun: context.testsHaveRun,
    currentCodeLength: context.hasStartedCoding ? 100 : 0,
    starterCodeLength: 0,
    approachExplained: context.hasExplainedApproach,
    messageCount: context.messageCount,
  })
}
