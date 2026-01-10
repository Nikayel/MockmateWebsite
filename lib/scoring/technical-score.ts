/**
 * Technical Score Calculator
 *
 * @deprecated Technical score is now unified with Mastery score.
 *
 * Technical score = Mastery score = objective code metrics:
 * - Correctness (60%): test pass rate
 * - Time Efficiency (25%): how quickly solved relative to expected time
 * - Independence (15%): minimal hint usage
 *
 * Use calculateMasteryScore from lib/spaced-repetition/mastery-score.ts instead.
 *
 * These functions are kept for backwards compatibility but should not be used
 * for new code. They return a fallback calculation based on score breakdown.
 */

import { ScoreBreakdown, SCORE_WEIGHTS } from "./types"

/**
 * @deprecated Use masteryScore directly from session data.
 * This fallback uses the old AI-based calculation for backwards compatibility.
 */
export function calculateTechnicalScore(breakdown: ScoreBreakdown): number {
  // Fallback: use a weighted average of code quality and problem solving
  // This is only used when masteryScore is not available
  const score =
    breakdown.codeQualityScore * 0.6 +
    breakdown.problemSolvingScore * 0.25 +
    breakdown.understandingScore * 0.15

  return Math.round(score)
}

/**
 * @deprecated Use masteryScore directly from session data.
 */
export function calculateTechnicalScoreFromComponents(
  understandingScore: number,
  problemSolvingScore: number,
  codeQualityScore: number
): number {
  const score = codeQualityScore * 0.6 + problemSolvingScore * 0.25 + understandingScore * 0.15

  return Math.round(score)
}

/**
 * @deprecated Technical score is now mastery-based.
 * This function returns mastery-based breakdown.
 */
export function getTechnicalScoreContribution(_breakdown: ScoreBreakdown): {
  correctness: { weight: number; description: string }
  timeEfficiency: { weight: number; description: string }
  independence: { weight: number; description: string }
} {
  return {
    correctness: {
      weight: SCORE_WEIGHTS.technical.correctness,
      description: "Test pass rate",
    },
    timeEfficiency: {
      weight: SCORE_WEIGHTS.technical.timeEfficiency,
      description: "Time relative to expected",
    },
    independence: {
      weight: SCORE_WEIGHTS.technical.independence,
      description: "Minimal hint usage",
    },
  }
}
