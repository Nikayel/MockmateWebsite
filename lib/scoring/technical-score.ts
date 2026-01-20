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
 *
 * NOTE: All calculation logic is now delegated to lib/constants.ts
 * (Single Source of Truth for scoring calculations)
 */

import { ScoreBreakdown, SCORE_WEIGHTS } from "./types"
import { calculateTechnicalScoreFromBreakdown as centralCalculate } from "@/lib/constants"

/**
 * @deprecated Use masteryScore directly from session data.
 * This fallback uses the old AI-based calculation for backwards compatibility.
 *
 * Delegates to calculateTechnicalScoreFromBreakdown in lib/constants.ts
 */
export function calculateTechnicalScore(breakdown: ScoreBreakdown): number {
  // Delegate to central utility function (Single Source of Truth)
  return centralCalculate({
    codeQualityScore: breakdown.codeQualityScore,
    problemSolvingScore: breakdown.problemSolvingScore,
    understandingScore: breakdown.understandingScore,
  })
}

/**
 * @deprecated Use masteryScore directly from session data.
 *
 * Delegates to calculateTechnicalScoreFromBreakdown in lib/constants.ts
 */
export function calculateTechnicalScoreFromComponents(
  understandingScore: number,
  problemSolvingScore: number,
  codeQualityScore: number
): number {
  // Delegate to central utility function (Single Source of Truth)
  return centralCalculate({
    codeQualityScore,
    problemSolvingScore,
    understandingScore,
  })
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
