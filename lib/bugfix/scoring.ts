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

/**
 * Score for a language dimension that only the semantic scorer can judge, when it did
 * not run (the no-AI fallback path).
 *
 * These three dimensions (hypothesis / root cause / prevention) used to be typed into
 * textareas, so "no text" reliably meant "candidate said nothing" and scoring 0 was fair.
 * The textareas are gone -- the candidate now states these to the interviewer -- so an
 * empty `*Text` field means "we have no signal", not "they never reasoned". Scoring 0
 * there would silently dock 28% of the total from every session the fallback path touches.
 * Stay neutral instead, matching BUGFIX_SEMANTIC_NEUTRAL.
 */
const UNJUDGED_LANGUAGE_SCORE = 50

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function averageScores(values: number[]): number {
  if (values.length === 0) return 0
  return clampScore(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export interface BugfixCategoryScores {
  understanding: number
  problemSolving: number
  codeQuality: number
  communication: number
}

/**
 * Project the 11 scored bugfix dimensions onto the four user-facing category scores.
 *
 * Each dimension has exactly ONE home, so nothing is double-counted or silently dropped:
 *  - understanding: reproduction discipline, codebase navigation, evidence gathering
 *  - problemSolving: hypothesis quality, root-cause understanding, regression prevention
 *  - codeQuality:    minimal-fix quality, verification discipline, over-edit control
 *  - communication:  communication, AI-collaboration quality
 *
 * Both the streaming feedback route and the fallback path project through this one helper,
 * so the same evidence can no longer yield two different category breakdowns.
 */
export function mapBugfixBreakdownToCategoryScores(
  score: BugfixScoreBreakdown
): BugfixCategoryScores {
  return {
    understanding: averageScores([
      score.reproductionDiscipline,
      score.codebaseNavigation,
      score.evidenceGathering,
    ]),
    problemSolving: averageScores([
      score.hypothesisQuality,
      score.rootCauseUnderstanding,
      score.regressionPrevention,
    ]),
    codeQuality: averageScores([
      score.verificationDiscipline,
      score.minimalFixQuality,
      score.overEditControl,
    ]),
    communication: averageScores([score.communication, score.aiCollaborationQuality]),
  }
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
    semanticOverrides?: {
      hypothesisQuality?: number
      rootCauseAccuracy?: number
      preventionQuality?: number
      communicationScore?: number
    }
  } = {}
): BugfixScoreBreakdown {
  const expectedTouched = evidence.expectedTouchedFiles.length
  const touchedExpected = evidence.editedFiles.filter((path) =>
    evidence.expectedTouchedFiles.includes(path)
  ).length
  const difficulty = options.difficulty || "medium"
  const overrides = options.semanticOverrides ?? {}

  const breakdown: Omit<BugfixScoreBreakdown, "overall"> = {
    reproductionDiscipline: evidence.reproducedBeforeEditing ? 100 : 35,
    codebaseNavigation: ratioScore(evidence.inspectedFiles.length, difficulty === "easy" ? 2 : 4),
    evidenceGathering: ratioScore(
      evidence.inspectedTestOrDocs.length + evidence.visibleTestsRun,
      2
    ),
    hypothesisQuality: overrides.hypothesisQuality ?? UNJUDGED_LANGUAGE_SCORE,
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
    rootCauseUnderstanding: overrides.rootCauseAccuracy ?? UNJUDGED_LANGUAGE_SCORE,
    regressionPrevention: overrides.preventionQuality ?? UNJUDGED_LANGUAGE_SCORE,
    aiCollaborationQuality: clampScore(
      70 + evidence.aiPartnerUseCount * 10 - evidence.aiShortcutCount * 35
    ),
    communication: overrides.communicationScore ?? 50,
  }

  const overall = Object.entries(DEFAULT_WEIGHTS).reduce((sum, [key, weight]) => {
    return sum + breakdown[key as keyof typeof breakdown] * weight
  }, 0)

  return {
    ...breakdown,
    overall: clampScore(overall),
  }
}
