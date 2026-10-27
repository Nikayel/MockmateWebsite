import type { BugfixEvidenceSummary, BugfixScoreBreakdown } from "./types"
import {
  BUGFIX_SCORE_CATEGORIES,
  BUGFIX_SCORE_DIMENSIONS,
  type BugfixScoreCategory,
} from "./score-dimensions"

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
  const categoryScore = (category: BugfixScoreCategory) =>
    averageScores(BUGFIX_SCORE_CATEGORIES[category].dimensions.map((dimension) => score[dimension]))
  return {
    understanding: categoryScore("understanding"),
    problemSolving: categoryScore("problemSolving"),
    codeQuality: categoryScore("codeQuality"),
    communication: categoryScore("communication"),
  }
}

function ratioScore(count: number, target: number): number {
  if (target <= 0) return 100
  return clampScore((count / target) * 100)
}

/**
 * Apply the transcript-integrity caps to a communication score. Uses the
 * min of every applicable cap rather than first-match, so a session that is
 * both stuffed and irrelevant takes the harsher of the two.
 */
function capCommunicationForIntegrity(
  score: number,
  integrity?: { isCoherent?: boolean; responsesRelevant?: boolean }
): number {
  if (!integrity) return score
  let capped = score
  if (integrity.isCoherent === false) capped = Math.min(25, capped)
  if (integrity.responsesRelevant === false) capped = Math.min(45, capped)
  return capped
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
    /**
     * Transcript-integrity signals. The communication dimension is otherwise an
     * LLM judgment (semanticOverrides.communicationScore), which is exactly the
     * signal a keyword-stuffed or incoherent transcript is built to fool. These
     * caps are the deterministic backstop, matching the DSA scorers.
     *
     * This matters because the stream route REPLACES the capped scorer output
     * wholesale with this breakdown for bugfix sessions, so without it the
     * Edge integrity caps never reach bugfix at all.
     */
    integrity?: {
      isCoherent?: boolean
      responsesRelevant?: boolean
    }
  } = {}
): BugfixScoreBreakdown {
  const expectedTouched = evidence.expectedTouchedFiles.length
  const touchedExpected = evidence.editedFiles.filter((path) =>
    evidence.expectedTouchedFiles.includes(path)
  ).length
  const overrides = options.semanticOverrides ?? {}

  const breakdown: Omit<BugfixScoreBreakdown, "overall"> = {
    reproductionDiscipline: evidence.reproducedBeforeEditing ? 100 : 35,
    // Opening more tabs is not stronger navigation. Only the relevant file set
    // can establish coverage; scenarios without one remain unassessed/neutral.
    codebaseNavigation:
      expectedTouched > 0
        ? ratioScore(
            evidence.inspectedFiles.filter((path) => evidence.expectedTouchedFiles.includes(path))
              .length,
            expectedTouched
          )
        : 50,
    evidenceGathering: evidence.reproducedBeforeEditing ? 100 : 50,
    hypothesisQuality: overrides.hypothesisQuality ?? UNJUDGED_LANGUAGE_SCORE,
    minimalFixQuality:
      expectedTouched === 0
        ? 70
        : clampScore(
            ratioScore(touchedExpected, expectedTouched) - evidence.overEditedFiles.length * 25
          ),
    // Repeating the same test must not improve the score.
    verificationDiscipline:
      evidence.finalSourceVerified === false
        ? 35
        : evidence.visibleTestsRun > 0
          ? clampScore(evidence.finalPassRate)
          : 50,
    overEditControl: clampScore(100 - evidence.overEditedFiles.length * 35),
    rootCauseUnderstanding: overrides.rootCauseAccuracy ?? UNJUDGED_LANGUAGE_SCORE,
    regressionPrevention: overrides.preventionQuality ?? UNJUDGED_LANGUAGE_SCORE,
    // A request does not establish what help was delivered or understood.
    aiCollaborationQuality: 50,
    communication: capCommunicationForIntegrity(
      overrides.communicationScore ?? 50,
      options.integrity
    ),
  }

  const overall = Object.entries(BUGFIX_SCORE_DIMENSIONS).reduce((sum, [key, dimension]) => {
    return sum + breakdown[key as keyof typeof breakdown] * dimension.weight
  }, 0)

  return {
    ...breakdown,
    overall: clampScore(overall),
  }
}
