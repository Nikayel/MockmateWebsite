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
  // Fail safe on a missing count. Test files are excluded from typecheck, so a
  // caller can omit it and reach here with undefined; every `undefined < n`
  // comparison is false, which would fall through to "adequate" and hand a
  // silent session the most permissive level. Absent evidence is not evidence.
  const messageCount = Number.isFinite(signals.candidateMessageCount)
    ? signals.candidateMessageCount
    : 0
  if (messageCount < 2) return "none"
  if (messageCount < 4) return "minimal"
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

/** Pass rate at which working code counts as "solved" for the silent-solution flag. */
export const SILENT_SOLUTION_MIN_PASS_RATE = 70

/**
 * The "Silent Solution Detected" flag surfaced to the candidate.
 *
 * It is deliberately co-extensive with the gate above actually capping, because
 * the banner tells the candidate their communication score WAS capped. Any
 * non-"adequate" level caps; "adequate" does not. Defining the flag any other way
 * makes the banner claim a penalty that was never applied, or hide one that was.
 *
 * This predicate is the single definition. Three had drifted apart before it:
 * edge-utils used `level === "none" && passRate >= 70` (missed "minimal", where a
 * cap did fire), score-floors used `passRate >= 80 && !explainedApproach` (fired
 * on chatty sessions the gate never capped), and score-accumulator used
 * `passRate >= 70 && !approachExplained && candidateMessageCount < 3`. The same
 * session could therefore show the banner on one route and not the other.
 */
export function isSilentSolution(level: CommunicationEvidenceLevel, passRate: number): boolean {
  return level !== "adequate" && passRate >= SILENT_SOLUTION_MIN_PASS_RATE
}
