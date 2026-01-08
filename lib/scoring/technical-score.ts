/**
 * Technical Score Calculator
 *
 * Calculates a code-focused score that excludes communication.
 * This score measures pure technical ability:
 * - Understanding: How well user understood the problem
 * - Problem-Solving: Approach and algorithm selection
 * - Code Quality: Correctness, efficiency, cleanliness
 *
 * Communication is excluded because technical skill should be
 * measured independently from presentation ability.
 */

import { ScoreBreakdown, SCORE_WEIGHTS } from "./types"

/**
 * Calculate technical score from score breakdown
 *
 * Original weights: U=25%, PS=25%, CQ=30%, Comm=20%
 * Technical reweights (excluding 20% communication):
 * - Understanding: 25/80 = 31.25%
 * - Problem-Solving: 25/80 = 31.25%
 * - Code Quality: 30/80 = 37.5%
 *
 * @param breakdown - Score breakdown with all components
 * @returns Technical score (0-100)
 */
export function calculateTechnicalScore(breakdown: ScoreBreakdown): number {
  const { understanding, problemSolving, codeQuality } = SCORE_WEIGHTS.technical

  const score =
    breakdown.understandingScore * understanding +
    breakdown.problemSolvingScore * problemSolving +
    breakdown.codeQualityScore * codeQuality

  return Math.round(score)
}

/**
 * Calculate technical score from individual components
 * Useful when you don't have a full ScoreBreakdown object
 *
 * @param understandingScore - Understanding score (0-100)
 * @param problemSolvingScore - Problem-solving score (0-100)
 * @param codeQualityScore - Code quality score (0-100)
 * @returns Technical score (0-100)
 */
export function calculateTechnicalScoreFromComponents(
  understandingScore: number,
  problemSolvingScore: number,
  codeQualityScore: number
): number {
  const { understanding, problemSolving, codeQuality } = SCORE_WEIGHTS.technical

  const score =
    understandingScore * understanding +
    problemSolvingScore * problemSolving +
    codeQualityScore * codeQuality

  return Math.round(score)
}

/**
 * Get the contribution of each component to the technical score
 * Useful for displaying breakdown in UI
 *
 * @param breakdown - Score breakdown with all components
 * @returns Object with each component's contribution
 */
export function getTechnicalScoreContribution(breakdown: ScoreBreakdown): {
  understanding: { score: number; weight: number; contribution: number }
  problemSolving: { score: number; weight: number; contribution: number }
  codeQuality: { score: number; weight: number; contribution: number }
  total: number
} {
  const weights = SCORE_WEIGHTS.technical

  const understandingContribution = breakdown.understandingScore * weights.understanding
  const problemSolvingContribution = breakdown.problemSolvingScore * weights.problemSolving
  const codeQualityContribution = breakdown.codeQualityScore * weights.codeQuality

  return {
    understanding: {
      score: breakdown.understandingScore,
      weight: weights.understanding,
      contribution: Math.round(understandingContribution),
    },
    problemSolving: {
      score: breakdown.problemSolvingScore,
      weight: weights.problemSolving,
      contribution: Math.round(problemSolvingContribution),
    },
    codeQuality: {
      score: breakdown.codeQualityScore,
      weight: weights.codeQuality,
      contribution: Math.round(codeQualityContribution),
    },
    total: Math.round(
      understandingContribution + problemSolvingContribution + codeQualityContribution
    ),
  }
}
