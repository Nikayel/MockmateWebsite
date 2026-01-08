/**
 * Mastery Score Calculator
 *
 * Calculates a simple mastery score based purely on test pass rate.
 * This score is used by the spaced repetition system to determine
 * when to schedule review sessions.
 *
 * Unlike performance score (which includes communication),
 * mastery score focuses only on code correctness.
 */

/**
 * Calculate mastery score from test pass rate
 *
 * @param testPassRate - Ratio of tests passed (0.0 to 1.0)
 * @returns Mastery score (0-100)
 *
 * @example
 * calculateMasteryScore(1.0)   // 100 - all tests passed
 * calculateMasteryScore(0.75)  // 75 - 3/4 tests passed
 * calculateMasteryScore(0)     // 0 - no tests passed
 */
export function calculateMasteryScore(testPassRate: number): number {
  // Clamp to valid range
  const clampedRate = Math.max(0, Math.min(1, testPassRate))

  // Convert to 0-100 scale
  return Math.round(clampedRate * 100)
}

/**
 * Calculate mastery score from test results
 *
 * @param testsPassed - Number of tests that passed
 * @param totalTests - Total number of tests
 * @returns Mastery score (0-100)
 */
export function calculateMasteryScoreFromTests(testsPassed: number, totalTests: number): number {
  if (totalTests === 0) {
    // No tests to run - can't determine mastery
    return 0
  }

  const passRate = testsPassed / totalTests
  return calculateMasteryScore(passRate)
}

/**
 * Determine if a mastery score indicates the user has "passed" the problem
 * Used for quick checks in UI and filtering
 *
 * @param masteryScore - Score from 0-100
 * @returns true if score indicates reasonable mastery
 */
export function hasPassed(masteryScore: number): boolean {
  // 70% or higher considered passing
  return masteryScore >= 70
}

/**
 * Get a quality rating for spaced repetition algorithms
 * Maps mastery score to quality rating used by SM2/FSRS
 *
 * @param masteryScore - Score from 0-100
 * @returns Quality rating 0-5 (for SM2) or 1-4 (for FSRS)
 */
export function getMasteryQuality(masteryScore: number): {
  sm2Quality: number // 0-5
  fsrsRating: number // 1-4
} {
  // SM2 quality mapping (0-5 scale)
  let sm2Quality: number
  if (masteryScore >= 90) {
    sm2Quality = 5 // Perfect
  } else if (masteryScore >= 75) {
    sm2Quality = 4 // Good with minor issues
  } else if (masteryScore >= 60) {
    sm2Quality = 3 // Correct but difficult
  } else if (masteryScore >= 40) {
    sm2Quality = 2 // Incorrect but familiar
  } else if (masteryScore >= 20) {
    sm2Quality = 1 // Almost complete blackout
  } else {
    sm2Quality = 0 // Complete blackout
  }

  // FSRS rating mapping (1-4 scale)
  let fsrsRating: number
  if (masteryScore >= 85) {
    fsrsRating = 4 // Easy
  } else if (masteryScore >= 60) {
    fsrsRating = 3 // Good
  } else if (masteryScore >= 40) {
    fsrsRating = 2 // Hard
  } else {
    fsrsRating = 1 // Again
  }

  return { sm2Quality, fsrsRating }
}
