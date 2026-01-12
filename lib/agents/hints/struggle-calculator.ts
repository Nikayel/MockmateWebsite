/**
 * Struggle level calculation based on user metrics
 */

import type { StruggleMetrics, HintLevel } from "./types"

export type StruggleLevel = "none" | "mild" | "moderate" | "high"

/**
 * Calculate user's struggle level based on metrics
 */
export function calculateStruggleLevel(metrics: StruggleMetrics): StruggleLevel {
  let score = 0

  // Time factor (more time = more struggle)
  if (metrics.timeSpentMinutes > 30) score += 3
  else if (metrics.timeSpentMinutes > 20) score += 2
  else if (metrics.timeSpentMinutes > 10) score += 1

  // Failed tests factor
  if (metrics.testsFailed > 0) {
    const failRate = metrics.testsFailed / Math.max(metrics.testsRun, 1)
    if (failRate > 0.8) score += 3
    else if (failRate > 0.5) score += 2
    else if (failRate > 0.2) score += 1
  }

  // Inactivity factor (no code changes = stuck)
  if (metrics.lastCodeChangeMinutesAgo > 5) score += 2
  else if (metrics.lastCodeChangeMinutesAgo > 3) score += 1

  // Error count factor
  if (metrics.errorCount > 5) score += 2
  else if (metrics.errorCount > 2) score += 1

  // Many code changes but no progress = struggling
  if (metrics.codeChanges > 20 && metrics.testsFailed > 0) score += 1

  // Map score to struggle level
  if (score >= 7) return "high"
  if (score >= 4) return "moderate"
  if (score >= 2) return "mild"
  return "none"
}

/**
 * Get recommended hint reveal level based on struggle
 */
export function getRecommendedRevealLevel(
  struggleLevel: StruggleLevel,
  hintsRevealed: number
): HintLevel {
  switch (struggleLevel) {
    case "high":
      return Math.min(3 + Math.floor(hintsRevealed / 2), 4) as HintLevel
    case "moderate":
      return Math.min(2 + Math.floor(hintsRevealed / 3), 3) as HintLevel
    case "mild":
      return Math.min(1 + Math.floor(hintsRevealed / 4), 2) as HintLevel
    default:
      return 1
  }
}
