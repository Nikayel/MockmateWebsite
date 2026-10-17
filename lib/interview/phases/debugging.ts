import type { InterviewPhase } from "./types"

interface DebuggingPhaseInput {
  hasSubmitted: boolean
  hasCodeChanges: boolean
  testsAreCurrent: boolean
  hasTestResults: boolean
  approachExplained: boolean
}

/** A baseline run is investigation, not verification of a candidate's patch. */
export function detectDebuggingPhase(input: DebuggingPhaseInput): InterviewPhase {
  if (input.hasSubmitted) return "post_interview"
  if (input.hasCodeChanges) return input.testsAreCurrent ? "testing" : "coding"
  if (input.hasTestResults || input.approachExplained) return "discussion"
  return "clarification"
}
