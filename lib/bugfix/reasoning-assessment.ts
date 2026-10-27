import type { BugfixEvidenceSummary } from "./types"

/** Attach only a quote actually present in a candidate turn, never the interviewer's answer. */
export function applyRootCauseAssessment(
  summary: BugfixEvidenceSummary,
  assessment: { rootCauseAccuracy: number; rootCauseEvidence?: string | null },
  candidateTurns: string[]
): BugfixEvidenceSummary {
  const quote = assessment.rootCauseEvidence?.trim()
  const supported = quote && candidateTurns.some((turn) => turn.includes(quote))
  return {
    ...summary,
    rootCauseAssessment: supported
      ? { status: "observed", score: assessment.rootCauseAccuracy, evidence: quote }
      : { status: assessment.rootCauseEvidence === null ? "not-observed" : "unavailable" },
    rootCauseExplained: Boolean(supported),
    rootCauseText: supported ? quote : "",
  }
}

/** A missing legacy textarea or a neutral fallback score is not an observed weakness. */
export function needsRootCausePractice(evidence?: {
  rootCauseAssessment?: BugfixEvidenceSummary["rootCauseAssessment"]
}): boolean {
  const assessment = evidence?.rootCauseAssessment
  return (
    assessment?.status === "observed" &&
    typeof assessment.score === "number" &&
    Number.isFinite(assessment.score) &&
    assessment.score >= 0 &&
    assessment.score < 70
  )
}
