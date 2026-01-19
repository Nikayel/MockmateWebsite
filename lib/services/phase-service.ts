/**
 * Phase Detection Service
 *
 * Phase 3 of incremental service extraction.
 * Wraps phase detection with service interface.
 *
 * This provides:
 * - Clean request/response interface
 * - Allowed transitions for state machine validation
 * - Phase-specific prompt retrieval
 * - Future: phase history, analytics, A/B testing
 *
 * Risk: Low | Rollback: Set USE_PHASE_SERVICE flag to false
 */

import {
  detectInterviewPhase,
  type InterviewPhase,
  type PhaseDetectionContext,
} from "@/lib/interview/interview-phases"
import { PHASE_PROMPTS } from "@/lib/interview/interviewer-prompts"

export interface PhaseRequest {
  hasSubmitted: boolean
  testsHaveRun: boolean
  currentCodeLength: number
  starterCodeLength: number
  approachExplained: boolean
  messageCount: number
}

export interface PhaseResponse {
  phase: InterviewPhase
  prompt: string
  allowedTransitions: InterviewPhase[]
  metadata: {
    codeWritten: number
    isEarlyConversation: boolean
  }
}

/**
 * Valid phase transitions
 *
 * Interview phases follow a mostly linear progression,
 * but some transitions are allowed to go "backwards" in certain cases.
 */
const PHASE_TRANSITIONS: Record<InterviewPhase, InterviewPhase[]> = {
  intro: ["discussion"],
  discussion: ["coding", "testing"], // Can skip to testing if tests run early
  coding: ["testing", "discussion"], // Can go back to discussion if needed
  testing: ["coding", "post_interview"], // Can go back to fix code
  post_interview: ["complete"],
  complete: [], // Terminal state
}

/**
 * Phase detection service - wraps phase detection with service interface
 *
 * @param req - Phase detection request
 * @returns Phase response with detected phase, prompt, and allowed transitions
 */
export function phaseService(req: PhaseRequest): PhaseResponse {
  const context: PhaseDetectionContext = {
    hasSubmitted: req.hasSubmitted,
    testsHaveRun: req.testsHaveRun,
    currentCodeLength: req.currentCodeLength,
    starterCodeLength: req.starterCodeLength,
    approachExplained: req.approachExplained,
    messageCount: req.messageCount,
  }

  const phase = detectInterviewPhase(context)
  const prompt = PHASE_PROMPTS[phase] || PHASE_PROMPTS.discussion
  const allowedTransitions = getValidTransitions(phase)

  return {
    phase,
    prompt,
    allowedTransitions,
    metadata: {
      codeWritten: req.currentCodeLength - req.starterCodeLength,
      isEarlyConversation: req.messageCount <= 2,
    },
  }
}

/**
 * Get valid transitions from a given phase
 */
export function getValidTransitions(phase: InterviewPhase): InterviewPhase[] {
  return PHASE_TRANSITIONS[phase] || []
}

/**
 * Check if a phase transition is valid
 */
export function isValidTransition(from: InterviewPhase, to: InterviewPhase): boolean {
  // Same phase is always valid (no transition)
  if (from === to) return true

  // Check if transition is in allowed list
  return PHASE_TRANSITIONS[from]?.includes(to) || false
}

/**
 * Get the phase prompt for a specific phase
 */
export function getPhasePrompt(phase: InterviewPhase): string {
  return PHASE_PROMPTS[phase] || PHASE_PROMPTS.discussion
}
