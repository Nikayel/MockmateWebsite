import type { BugfixEvidenceSummary, BugfixScoreBreakdown } from "./types"

const DEFAULT_WEIGHTS = {
  reproductionDiscipline: 0.1,
  codebaseNavigation: 0.1,
  evidenceGathering: 0.1,
  hypothesisQuality: 0.1,
  minimalFixQuality: 0.12,
  verificationDiscipline: 0.12,
  overEditControl: 0.08,
  rootCauseUnderstanding: 0.1,
  regressionPrevention: 0.08,
  aiCollaborationQuality: 0.05,
  communication: 0.05,
} satisfies Record<keyof Omit<BugfixScoreBreakdown, "overall">, number>

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function ratioScore(count: number, target: number): number {
  if (target <= 0) return 100
  return clampScore((count / target) * 100)
}

export function calculateBugfixEvidenceScore(
  evidence: BugfixEvidenceSummary,
  options: {
    difficulty?: "easy" | "medium" | "hard"
    communicationScore?: number
  } = {}
): BugfixScoreBreakdown {
  const expectedTouched = evidence.expectedTouchedFiles.length
  const touchedExpected = evidence.editedFiles.filter((path) =>
    evidence.expectedTouchedFiles.includes(path)
  ).length
  const difficulty = options.difficulty || "medium"
  const seniorBias = difficulty === "hard" ? 10 : 0

  const breakdown: Omit<BugfixScoreBreakdown, "overall"> = {
    reproductionDiscipline: evidence.reproducedBeforeEditing ? 100 : 35,
    codebaseNavigation: ratioScore(evidence.inspectedFiles.length, difficulty === "easy" ? 2 : 4),
    evidenceGathering: ratioScore(
      evidence.inspectedTestOrDocs.length + evidence.visibleTestsRun,
      2
    ),
    hypothesisQuality: clampScore(evidence.hypothesisCount > 0 ? 80 + seniorBias : 20),
    minimalFixQuality:
      expectedTouched === 0
        ? 70
        : clampScore(
            ratioScore(touchedExpected, expectedTouched) - evidence.overEditedFiles.length * 25
          ),
    verificationDiscipline: clampScore(
      evidence.finalPassRate * 0.7 + evidence.visibleTestsRun * 15
    ),
    overEditControl: clampScore(100 - evidence.overEditedFiles.length * 35),
    rootCauseUnderstanding: evidence.rootCauseExplained ? 90 : 25,
    regressionPrevention: evidence.preventionExplained ? 90 : difficulty === "hard" ? 15 : 35,
    aiCollaborationQuality: clampScore(
      70 + evidence.aiPartnerUseCount * 10 - evidence.aiShortcutCount * 35
    ),
    communication: clampScore(
      options.communicationScore ?? (evidence.rootCauseExplained ? 75 : 40)
    ),
  }

  const overall = Object.entries(DEFAULT_WEIGHTS).reduce((sum, [key, weight]) => {
    return sum + breakdown[key as keyof typeof breakdown] * weight
  }, 0)

  return {
    ...breakdown,
    overall: clampScore(overall),
  }
}
