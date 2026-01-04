/**
 * Mastery Score Calculator for Spaced Repetition
 *
 * This module calculates a CODE-FOCUSED mastery score that's specifically
 * designed for the spaced repetition algorithm. It's SEPARATE from the
 * interview performance score.
 *
 * Key Philosophy:
 * - Interview Score = "Would you pass this interview?" (includes communication)
 * - Mastery Score = "Do you KNOW this pattern/concept?" (code correctness only)
 *
 * The spaced repetition algorithm should use mastery score because:
 * 1. SR is about COGNITIVE RETENTION of specific skills
 * 2. Communication is a meta-skill, not pattern-specific
 * 3. Someone who solves correctly but quietly should NOT review more
 * 4. Someone who communicates well but fails should review MORE
 *
 * Factors considered:
 * - Correctness (test pass rate) - 60%
 * - Time efficiency (adjusted for communication overhead) - 25%
 * - Hint dependency - 15%
 */

import type { InteractionMetrics } from '../scoring'

// =============================================================================
// TYPES
// =============================================================================

export interface MasteryScoreInput {
  // Core metrics (required)
  testCasesPassed: number
  testCasesTotal: number
  timeSpentMinutes: number
  hintsUsed: number
  hintsTotal: number
  problemDifficulty: 'easy' | 'medium' | 'hard'

  // Communication time adjustment (optional)
  // These help us subtract communication overhead from total time
  interviewerMessagesCount?: number
  aiMessagesCount?: number
  approachExplained?: boolean
  complexityDiscussed?: boolean

  // Code quality signals (optional, used as tiebreakers)
  codeEfficiencyScore?: number
  debuggingAttempts?: number
  totalExecutions?: number
}

export interface MasteryScoreResult {
  // The mastery score used for spaced repetition (0-100)
  masteryScore: number

  // Component breakdown for debugging/analytics
  components: {
    correctnessScore: number      // 0-100, weighted 60%
    timeEfficiencyScore: number   // 0-100, weighted 25%
    independenceScore: number     // 0-100, weighted 15%
  }

  // Time analysis
  timeAnalysis: {
    rawTimeMinutes: number
    estimatedCommunicationMinutes: number
    adjustedTimeMinutes: number
    expectedTimeMinutes: number
    timeRatio: number  // adjusted/expected, <1 is fast, >1 is slow
  }

  // Metadata
  metadata: {
    algorithm: 'v1'
    calculatedAt: string
  }
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const WEIGHTS = {
  correctness: 0.60,      // Did the code work?
  timeEfficiency: 0.25,   // How quickly did they solve it?
  independence: 0.15,     // Did they need hints?
}

// Expected solve times by difficulty (minutes)
// These are for PURE CODING time, excluding communication
const EXPECTED_TIME = {
  easy: 8,      // Easy problems should be ~8 min of coding
  medium: 15,   // Medium problems ~15 min
  hard: 25,     // Hard problems ~25 min
}

// Estimated communication overhead (minutes per interaction type)
const COMMUNICATION_OVERHEAD = {
  perInterviewerMessage: 0.5,     // Each interviewer exchange ~30 sec
  perAIMessage: 0.3,              // AI interactions are faster
  approachExplanation: 2.0,       // Explaining approach takes ~2 min
  complexityDiscussion: 1.5,      // Discussing complexity ~1.5 min
}

// =============================================================================
// MAIN CALCULATION
// =============================================================================

/**
 * Calculate the mastery score for spaced repetition.
 *
 * This score focuses purely on code correctness and efficiency,
 * deliberately EXCLUDING communication skills which are tracked
 * separately in the interview score.
 */
export function calculateMasteryScore(input: MasteryScoreInput): MasteryScoreResult {
  const now = new Date().toISOString()

  // 1. CORRECTNESS SCORE (60%)
  // Pure test pass rate, with slight difficulty adjustment
  const correctnessScore = calculateCorrectnessScore(input)

  // 2. TIME EFFICIENCY SCORE (25%)
  // How quickly they solved it, adjusted for communication overhead
  const timeAnalysis = analyzeTime(input)
  const timeEfficiencyScore = calculateTimeEfficiencyScore(timeAnalysis, input)

  // 3. INDEPENDENCE SCORE (15%)
  // Did they solve it without hints?
  const independenceScore = calculateIndependenceScore(input)

  // Weighted final score
  const masteryScore = Math.round(
    correctnessScore * WEIGHTS.correctness +
    timeEfficiencyScore * WEIGHTS.timeEfficiency +
    independenceScore * WEIGHTS.independence
  )

  return {
    masteryScore: Math.max(0, Math.min(100, masteryScore)),
    components: {
      correctnessScore: Math.round(correctnessScore),
      timeEfficiencyScore: Math.round(timeEfficiencyScore),
      independenceScore: Math.round(independenceScore),
    },
    timeAnalysis,
    metadata: {
      algorithm: 'v1',
      calculatedAt: now,
    },
  }
}

// =============================================================================
// COMPONENT CALCULATIONS
// =============================================================================

/**
 * Calculate correctness score based on test pass rate.
 * Slight adjustment for difficulty - harder problems get a small boost.
 */
function calculateCorrectnessScore(input: MasteryScoreInput): number {
  if (input.testCasesTotal === 0) {
    // No tests - use efficiency as proxy (shouldn't happen often)
    return input.codeEfficiencyScore || 50
  }

  const passRate = input.testCasesPassed / input.testCasesTotal
  let score = passRate * 100

  // Small difficulty bonus for partial credit
  // (Getting 80% on hard is better than 80% on easy)
  const difficultyBonus = {
    easy: 0,
    medium: 3,
    hard: 6,
  }[input.problemDifficulty]

  // Only apply bonus if they passed at least half
  if (passRate >= 0.5) {
    score += difficultyBonus * passRate
  }

  // Bonus for passing ALL tests
  if (passRate === 1) {
    score += 5
  }

  return Math.min(100, score)
}

/**
 * Analyze time spent, adjusting for communication overhead.
 */
function analyzeTime(input: MasteryScoreInput): MasteryScoreResult['timeAnalysis'] {
  const rawTime = input.timeSpentMinutes || 0
  const expectedTime = EXPECTED_TIME[input.problemDifficulty]

  // Estimate communication overhead
  let communicationTime = 0

  if (input.interviewerMessagesCount) {
    communicationTime += input.interviewerMessagesCount * COMMUNICATION_OVERHEAD.perInterviewerMessage
  }

  if (input.aiMessagesCount) {
    communicationTime += input.aiMessagesCount * COMMUNICATION_OVERHEAD.perAIMessage
  }

  if (input.approachExplained) {
    communicationTime += COMMUNICATION_OVERHEAD.approachExplanation
  }

  if (input.complexityDiscussed) {
    communicationTime += COMMUNICATION_OVERHEAD.complexityDiscussion
  }

  // Adjusted time = raw time - communication overhead
  // But never less than 1 minute (they still did something)
  const adjustedTime = Math.max(1, rawTime - communicationTime)

  // Time ratio: <1 means faster than expected, >1 means slower
  const timeRatio = expectedTime > 0 ? adjustedTime / expectedTime : 1

  return {
    rawTimeMinutes: rawTime,
    estimatedCommunicationMinutes: Math.round(communicationTime * 10) / 10,
    adjustedTimeMinutes: Math.round(adjustedTime * 10) / 10,
    expectedTimeMinutes: expectedTime,
    timeRatio: Math.round(timeRatio * 100) / 100,
  }
}

/**
 * Calculate time efficiency score.
 * Fast + correct = high score, slow + struggling = low score
 */
function calculateTimeEfficiencyScore(
  timeAnalysis: MasteryScoreResult['timeAnalysis'],
  input: MasteryScoreInput
): number {
  const { timeRatio } = timeAnalysis

  // If they didn't pass any tests, time doesn't matter
  if (input.testCasesTotal > 0 && input.testCasesPassed === 0) {
    return 20 // Minimum score for showing up
  }

  // Time ratio scoring:
  // <= 0.5: Very fast (100)
  // 0.5 - 1.0: Fast to on-time (100-80)
  // 1.0 - 1.5: Slightly slow (80-60)
  // 1.5 - 2.0: Slow (60-40)
  // > 2.0: Very slow (40-20)

  if (timeRatio <= 0.5) {
    return 100
  } else if (timeRatio <= 1.0) {
    // Linear interpolation from 100 to 80
    return 100 - (timeRatio - 0.5) * 40
  } else if (timeRatio <= 1.5) {
    // Linear interpolation from 80 to 60
    return 80 - (timeRatio - 1.0) * 40
  } else if (timeRatio <= 2.0) {
    // Linear interpolation from 60 to 40
    return 60 - (timeRatio - 1.5) * 40
  } else {
    // Very slow - score decreases more slowly
    return Math.max(20, 40 - (timeRatio - 2.0) * 10)
  }
}

/**
 * Calculate independence score based on hint usage.
 */
function calculateIndependenceScore(input: MasteryScoreInput): number {
  if (input.hintsTotal === 0) {
    // No hints available - assume independent
    return 100
  }

  const hintRatio = input.hintsUsed / input.hintsTotal

  // Scoring:
  // 0 hints: 100
  // 1 hint: 70-85 (depending on total)
  // 2 hints: 50-65
  // 3+ hints: 30-50
  // All hints: 20

  if (input.hintsUsed === 0) {
    return 100
  }

  if (hintRatio >= 1) {
    return 20 // Used all hints
  }

  // Base penalty per hint
  const baseScore = 100 - (input.hintsUsed * 25)

  // Adjust based on ratio (using 1 of 5 hints is better than 1 of 2)
  const ratioAdjustment = (1 - hintRatio) * 15

  return Math.max(20, Math.min(85, baseScore + ratioAdjustment))
}

// =============================================================================
// CONVERSION UTILITIES
// =============================================================================

/**
 * Convert InteractionMetrics (from scoring.ts) to MasteryScoreInput
 * This allows reusing existing session data
 */
export function fromInteractionMetrics(metrics: InteractionMetrics): MasteryScoreInput {
  return {
    testCasesPassed: metrics.testCasesPassed,
    testCasesTotal: metrics.testCasesTotal,
    timeSpentMinutes: Math.round(metrics.timeSpent / 60), // Convert seconds to minutes
    hintsUsed: metrics.hintsRevealed,
    hintsTotal: metrics.hintsTotal,
    problemDifficulty: metrics.problemDifficulty,

    // Communication signals for time adjustment
    interviewerMessagesCount: metrics.interviewerQuestionsAnswered + metrics.clarifyingQuestionsAsked,
    aiMessagesCount: metrics.aiQuestionsAsked,
    approachExplained: metrics.approachExplanationGiven,
    complexityDiscussed: metrics.complexityAnalysisProvided,

    // Code quality signals
    codeEfficiencyScore: metrics.codeEfficiencyScore,
    debuggingAttempts: metrics.debuggingAttempts,
  }
}

/**
 * Quick mastery score from basic metrics (for API compatibility)
 * Use when full InteractionMetrics aren't available
 */
export function quickMasteryScore(params: {
  performanceScore: number  // The interview score (used as baseline)
  testCasesPassed: number
  testCasesTotal: number
  timeSpentMinutes: number
  hintsUsed: number
  problemDifficulty: 'easy' | 'medium' | 'hard'
}): number {
  const { performanceScore, testCasesPassed, testCasesTotal, timeSpentMinutes, hintsUsed, problemDifficulty } = params

  // If we have test case data, calculate properly
  if (testCasesTotal > 0) {
    const result = calculateMasteryScore({
      testCasesPassed,
      testCasesTotal,
      timeSpentMinutes,
      hintsUsed,
      hintsTotal: 3, // Default assumption
      problemDifficulty,
    })
    return result.masteryScore
  }

  // Fallback: adjust performance score by removing estimated communication component
  // Interview score has 20% communication weight, so we "remove" that influence
  // by re-scaling the other 80% to 100%

  // But we also need to account for hints - penalize more heavily for SR
  const hintPenalty = Math.min(30, hintsUsed * 10)

  // Estimate time penalty if way over expected
  const expectedTime = EXPECTED_TIME[problemDifficulty]
  const timeRatio = timeSpentMinutes / expectedTime
  const timePenalty = timeRatio > 2 ? Math.min(20, (timeRatio - 2) * 10) : 0

  // Rescale: remove communication boost/penalty, add SR-specific penalties
  const rescaled = (performanceScore / 0.80) * 0.80 // Essentially the same, just cleaner
  const adjusted = rescaled - hintPenalty - timePenalty

  return Math.max(0, Math.min(100, Math.round(adjusted)))
}
