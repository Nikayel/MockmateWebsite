import type { ScoreResult } from "../types"

/**
 * Communication-evidence gate.
 *
 * In a mock interview, Understanding and Problem-Solving are judged from what the
 * candidate SAYS, not just what the code does. A silent candidate with a perfect
 * solution gives the interviewer no evidence of either (the solution could be
 * memorized), so those two subscores — and the overall — are hard-capped when the
 * session carries no or almost no verbal signal.
 *
 * Every scoring path (instant accumulator, Edge validated, Node DSA, Node bugfix)
 * applies this same gate so the instant and refined numbers agree on silence.
 */
export type CommunicationEvidenceLevel = "none" | "minimal" | "adequate"

export interface CommunicationEvidenceSignals {
  candidateMessageCount: number
  approachExplained: boolean
  complexityDiscussed: boolean
}

export const COMMUNICATION_GATE_CAPS: Record<
  Exclude<CommunicationEvidenceLevel, "adequate">,
  { understanding: number; problemSolving: number; overall: number }
> = {
  // Zero verbal engagement: code correctness stays earned (codeQuality untouched),
  // but nothing the interviewer could grade Understanding/Problem-Solving on.
  none: { understanding: 40, problemSolving: 45, overall: 55 },
  // A couple of throwaway messages, never an approach or complexity statement.
  minimal: { understanding: 55, problemSolving: 60, overall: 65 },
}

export function assessCommunicationEvidence(
  signals: CommunicationEvidenceSignals
): CommunicationEvidenceLevel {
  const spokeSubstantively = signals.approachExplained || signals.complexityDiscussed
  if (spokeSubstantively) return "adequate"
  if (signals.candidateMessageCount < 2) return "none"
  if (signals.candidateMessageCount < 4) return "minimal"
  return "adequate"
}

/**
 * Cap Understanding / Problem-Solving for a low-evidence session. Callers apply
 * this BEFORE computing the weighted overall, then cap the overall separately
 * with capOverallForCommunicationEvidence (floors may run in between).
 */
export function capSubscoresForCommunicationEvidence(
  scores: Pick<ScoreResult, "understanding" | "problemSolving">,
  level: CommunicationEvidenceLevel
): Pick<ScoreResult, "understanding" | "problemSolving"> {
  if (level === "adequate") return scores
  const caps = COMMUNICATION_GATE_CAPS[level]
  return {
    understanding: Math.min(scores.understanding, caps.understanding),
    problemSolving: Math.min(scores.problemSolving, caps.problemSolving),
  }
}

export function capOverallForCommunicationEvidence(
  overall: number,
  level: CommunicationEvidenceLevel
): number {
  if (level === "adequate") return overall
  return Math.min(overall, COMMUNICATION_GATE_CAPS[level].overall)
}
