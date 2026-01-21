/**
 * Roadmap Algorithm Constants
 *
 * Single source of truth for all roadmap algorithm configurations.
 * DRY principle: These constants are shared across all roadmap generation files.
 */

import { DSAPattern } from "@/lib/types/dsa-patterns"

/**
 * Weight factors for priority scoring (must sum to 1.0)
 */
export const PRIORITY_WEIGHTS = {
  companyFrequency: 0.3, // How often company asks this pattern
  mustKnow: 0.25, // Is this a must-know question?
  knowledgeGap: 0.2, // Does user need to learn this?
  timeEfficiency: 0.15, // ROI based on time available
  prerequisites: 0.05, // Are prerequisites met?
  roleAlignment: 0.05, // Role-specific pattern alignment
} as const

/**
 * Time estimates by difficulty (minutes)
 * Base time before experience-level adjustments
 */
export const BASE_TIME_ESTIMATES = {
  easy: 25,
  medium: 40,
  hard: 60,
} as const

/**
 * Time multipliers for different experience levels
 * Applied to BASE_TIME_ESTIMATES
 */
export const EXPERIENCE_TIME_MULTIPLIERS = {
  intern: 1.5, // Interns need 50% more time
  beginner: 1.3, // Beginners need 30% more time
  intermediate: 1.0, // Baseline
  advanced: 0.8, // Advanced users are faster
} as const

/**
 * Calculate adjusted time estimate based on experience level
 */
export function getAdjustedTimeEstimate(
  difficulty: "easy" | "medium" | "hard",
  experienceLevel: "intern" | "beginner" | "intermediate" | "advanced"
): number {
  const baseTime = BASE_TIME_ESTIMATES[difficulty]
  const multiplier = EXPERIENCE_TIME_MULTIPLIERS[experienceLevel]
  return Math.round(baseTime * multiplier)
}

/**
 * Realistic daily question limits by experience level
 * Quality > Quantity - these are achievable targets
 */
export const DAILY_QUESTION_LIMITS = {
  intern: 3, // Interns need more time per problem
  beginner: 4,
  intermediate: 5,
  advanced: 6,
} as const

/**
 * Minimum questions per pattern for adequate coverage
 */
export const MIN_QUESTIONS_PER_PATTERN = {
  intern: 6, // Interns should practice more fundamentals
  beginner: 5,
  intermediate: 3,
  advanced: 2,
} as const

/**
 * Days to leave for review before interview
 */
export const REVIEW_BUFFER_DAYS = 3

/**
 * Maximum new patterns per day (cognitive load limit)
 */
export const MAX_NEW_PATTERNS_PER_DAY = 2

/**
 * Review to new question ratio
 */
export const REVIEW_TO_NEW_RATIO = 0.7

/**
 * Intern-specific patterns to prioritize (commonly asked in internship interviews)
 */
export const INTERN_PRIORITY_PATTERNS: readonly DSAPattern[] = [
  "arrays-hashing",
  "two-pointers",
  "sliding-window",
  "binary-search",
  "stack",
  "trees",
  "dp-1d",
  "string",
] as const

/**
 * Knowledge gap multipliers based on familiarity level
 * Higher = more priority for learning
 */
export const KNOWLEDGE_GAP_MULTIPLIERS = {
  unknown: 1.0, // Full priority - highest need
  seen: 0.7, // 70% priority
  practiced: 0.4, // 40% priority
  confident: 0.1, // 10% priority - lowest need
} as const

/**
 * Magic numbers explained as constants
 */
export const MILESTONE_COMPLETION_PERCENTAGE = 0.6 // Must-know milestone at 60% of timeline
export const BEHIND_SCHEDULE_THRESHOLD = -0.15 // 15% behind triggers catch-up mode
export const SLIGHTLY_BEHIND_THRESHOLD = -0.05 // 5% behind triggers gentle nudge
export const AHEAD_SCHEDULE_THRESHOLD = 0.15 // 15% ahead shows "excellent progress"
export const MASTERY_PERCENTAGE_THRESHOLD = 80 // 80% completion = mastered
