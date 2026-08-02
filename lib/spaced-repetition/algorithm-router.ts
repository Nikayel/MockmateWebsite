/**
 * Algorithm Router for A/B Testing
 *
 * Routes spaced repetition calculations to either SM-2 or FSRS
 * based on user's assigned algorithm. Handles:
 * - Algorithm assignment for new users (50/50 random)
 * - Routing calculations to the correct algorithm
 * - Converting between algorithm-specific data structures
 * - Recording research events for analysis
 */

import { adminDb } from "../firebase-admin"
import { getAlgorithmConfig } from "./algorithm-config"
import type { SpacedRepetitionAlgorithm, SpacedRepetitionMasteryLevel } from "../types"
import type { Difficulty, MasteryLevel as SM2MasteryLevel } from "./sm2-algorithm"
import {
  calculateNextInterval as sm2Calculate,
  mapScoreToQuality,
  calculateConfidence as sm2Confidence,
  determineMasteryLevel as sm2MasteryLevel,
  estimateRetention as sm2EstimateRetention,
  type SM2Input,
  type SM2Output,
} from "./sm2-algorithm"
import {
  scheduleFSRS,
  createFSRSCard,
  mapPerformanceToFSRSRating,
  getEstimatedRetention as fsrsEstimateRetention,
  getMasteryLevel as fsrsMasteryLevel,
  getConfidence as fsrsConfidence,
  calculateRetrievability,
  DEFAULT_FSRS_CONFIG,
  type FSRSCard,
  type FSRSRating,
} from "./fsrs-algorithm"

// ============================================
// Types
// ============================================

export interface AlgorithmState {
  algorithm: SpacedRepetitionAlgorithm

  // Unified state (stored in problem_mastery)
  interval_days: number
  next_review_at: string
  review_count: number
  mastery_level: SpacedRepetitionMasteryLevel
  confidence: number

  // SM-2 specific
  ease_factor?: number
  scores_history?: number[]

  // FSRS specific
  fsrs_state?: FSRSCard
}

export interface ReviewInput {
  performance_score: number // 0-100 (interview score - includes communication)
  time_spent_minutes: number
  hints_used: number
  problem_difficulty: Difficulty
  is_early_review?: boolean
  days_overdue?: number
  streak_days?: number

  // Code-focused mastery score (optional, preferred for SR calculations)
  // This score focuses on correctness/time/hints, EXCLUDING communication
  // If provided, this is what the SR algorithm uses to determine intervals
  // If not provided, falls back to performance_score for backwards compatibility
  mastery_score?: number // 0-100 (code mastery - excludes communication)
}

export interface ReviewOutput {
  algorithm: SpacedRepetitionAlgorithm
  next_interval_days: number
  next_review_at: string
  mastery_level: SpacedRepetitionMasteryLevel
  confidence: number
  quality_rating: number // SM-2: 0-5, FSRS: 1-4
  retention_estimate: number

  // Algorithm-specific output
  ease_factor?: number // SM-2
  fsrs_state?: FSRSCard // FSRS
}

// ============================================
// Algorithm Assignment
// ============================================

function normalizeFSRSState(value: unknown): "new" | "learning" | "review" | "relearning" {
  if (value === "new" || value === 0) return "new"
  if (value === "learning" || value === 1) return "learning"
  if (value === "review" || value === 2) return "review"
  if (value === "relearning" || value === 3) return "relearning"

  if (typeof value === "string") {
    const normalized = value.toLowerCase()
    if (normalized === "new") return "new"
    if (normalized === "learning") return "learning"
    if (normalized === "review") return "review"
    if (normalized === "relearning") return "relearning"
  }

  return "review"
}

function reconstructFSRSCardFromFields(data: {
  interval_days: number
  next_review_at: string
  review_count: number
  mastery_level: SpacedRepetitionMasteryLevel
  fsrs_difficulty?: number
  fsrs_stability?: number
  fsrs_lapses?: number
  last_reviewed_at?: string
}): FSRSCard {
  const lastReview = data.last_reviewed_at ? new Date(data.last_reviewed_at) : null
  const nextReview = new Date(data.next_review_at)

  return {
    difficulty: data.fsrs_difficulty || 5,
    stability: data.fsrs_stability || data.interval_days || 1,
    state:
      data.review_count === 0 ? "new" : data.mastery_level === "learning" ? "learning" : "review",
    lastReview,
    nextReview,
    reps: data.review_count,
    lapses: data.fsrs_lapses || 0,
    learningSteps: 0, // Legacy cards without a serialized blob restart at step 0
    elapsedDays: lastReview
      ? Math.floor((Date.now() - lastReview.getTime()) / (1000 * 60 * 60 * 24))
      : 0,
    scheduledDays: data.interval_days,
  }
}

/**
 * Get user's assigned algorithm, or assign one if not set
 * Uses 50/50 random assignment for A/B testing
 */
export async function getUserAlgorithm(userId: string): Promise<SpacedRepetitionAlgorithm> {
  const config = await getAlgorithmConfig()
  const profileRef = adminDb.collection("profiles").doc(userId)
  const profileDoc = await profileRef.get()

  if (!profileDoc.exists) {
    // User doesn't exist yet, return default (will be assigned on profile creation).
    // Once the A/B has ended this is deterministic; before that it was a
    // non-persisted coin flip that could differ per call.
    return config.ab_ended ? config.default_algorithm : assignRandomAlgorithm()
  }

  const profile = profileDoc.data()

  if (profile?.spaced_repetition_algorithm) {
    const assigned = profile.spaced_repetition_algorithm as SpacedRepetitionAlgorithm

    // Self-heal: after the A/B ended, any non-overridden sm2 user is lazily
    // migrated to the default. This is the safety net for users the batch
    // migration missed (created mid-sweep, failed page, etc.). Users who
    // explicitly chose their algorithm keep it.
    if (
      config.ab_ended &&
      assigned !== config.default_algorithm &&
      profile.algorithm_user_overridden !== true
    ) {
      await profileRef.update({
        spaced_repetition_algorithm: config.default_algorithm,
        algorithm_migrated_at: new Date().toISOString(),
        algorithm_migrated_from: assigned,
      })
      console.log(
        `[AlgorithmRouter] Self-healed user ${userId} from ${assigned} to ${config.default_algorithm} (A/B ended)`
      )
      return config.default_algorithm
    }

    return assigned
  }

  // No algorithm assigned - assign one now
  const algorithm = config.ab_ended ? config.default_algorithm : assignRandomAlgorithm()
  await profileRef.update({
    spaced_repetition_algorithm: algorithm,
    algorithm_assigned_at: new Date().toISOString(),
    algorithm_user_overridden: false,
  })

  console.log(`[AlgorithmRouter] Assigned ${algorithm} to user ${userId}`)
  return algorithm
}

/**
 * Randomly assign SM-2 or FSRS with 50/50 probability
 */
function assignRandomAlgorithm(): SpacedRepetitionAlgorithm {
  return Math.random() < 0.5 ? "sm2" : "fsrs"
}

/**
 * Allow user to override their algorithm (for Pro users)
 * This marks them as overridden so they're excluded from research comparisons
 */
export async function setUserAlgorithm(
  userId: string,
  algorithm: SpacedRepetitionAlgorithm
): Promise<void> {
  const profileRef = adminDb.collection("profiles").doc(userId)
  await profileRef.update({
    spaced_repetition_algorithm: algorithm,
    algorithm_user_overridden: true,
  })

  console.log(`[AlgorithmRouter] User ${userId} manually set algorithm to ${algorithm}`)
}

// ============================================
// Algorithm Routing
// ============================================

/**
 * Calculate next review interval using user's assigned algorithm
 */
export async function calculateNextReview(
  userId: string,
  currentState: AlgorithmState,
  reviewInput: ReviewInput
): Promise<ReviewOutput> {
  const algorithm = await getUserAlgorithm(userId)

  if (algorithm === "fsrs") {
    return calculateFSRSReview(currentState, reviewInput)
  } else {
    return calculateSM2Review(currentState, reviewInput)
  }
}

/**
 * Calculate review using SM-2 algorithm
 *
 * Uses mastery_score (code-focused) if available, otherwise falls back to
 * performance_score (interview score including communication).
 */
function calculateSM2Review(currentState: AlgorithmState, input: ReviewInput): ReviewOutput {
  // Use mastery_score for SR calculations if available (code-focused, no communication)
  // Fall back to performance_score for backwards compatibility
  const scoreForSR = input.mastery_score ?? input.performance_score

  const sm2Input: SM2Input = {
    previousInterval: currentState.interval_days,
    previousEaseFactor: currentState.ease_factor || 2.5,
    performanceScore: scoreForSR,
    reviewCount: currentState.review_count,
    lastReviewDate: new Date(),
    problemDifficulty: input.problem_difficulty,
    streakDays: input.streak_days,
    scoresHistory: currentState.scores_history,
    isEarlyReview: input.is_early_review,
    daysOverdue: input.days_overdue,
  }

  const result = sm2Calculate(sm2Input)

  const nextReviewDate = new Date()
  nextReviewDate.setDate(nextReviewDate.getDate() + result.nextInterval)

  return {
    algorithm: "sm2",
    next_interval_days: result.nextInterval,
    next_review_at: nextReviewDate.toISOString(),
    mastery_level: result.masteryLevel as SpacedRepetitionMasteryLevel,
    confidence: result.confidence,
    quality_rating: result.quality,
    retention_estimate: sm2EstimateRetention(0, result.nextInterval, currentState.review_count + 1),
    ease_factor: result.newEaseFactor,
  }
}

/**
 * Calculate review using FSRS algorithm
 *
 * Uses mastery_score (code-focused) if available, otherwise falls back to
 * performance_score (interview score including communication).
 */
function calculateFSRSReview(currentState: AlgorithmState, input: ReviewInput): ReviewOutput {
  // Get or create FSRS card state
  const card: FSRSCard = currentState.fsrs_state || createFSRSCard()

  // Use mastery_score for SR calculations if available (code-focused, no communication)
  // Fall back to performance_score for backwards compatibility
  const scoreForSR = input.mastery_score ?? input.performance_score

  // Map performance score to FSRS rating
  // Handle time_spent_minutes = 0 (untracked) by using neutral ratio of 1.0
  const expectedMinutes =
    input.problem_difficulty === "easy" ? 10 : input.problem_difficulty === "medium" ? 20 : 30
  const timeRatio = input.time_spent_minutes > 0 ? input.time_spent_minutes / expectedMinutes : 1.0 // Neutral ratio when time is not tracked

  const rating = mapPerformanceToFSRSRating(scoreForSR, input.hints_used, timeRatio)

  // Schedule next review
  const newCard = scheduleFSRS(card, rating, DEFAULT_FSRS_CONFIG)

  // Convert FSRS state to mastery level
  const fsrsMastery = fsrsMasteryLevel(newCard)
  const masteryLevel: SpacedRepetitionMasteryLevel =
    fsrsMastery === "familiar" ? "reviewing" : fsrsMastery

  return {
    algorithm: "fsrs",
    next_interval_days: newCard.scheduledDays,
    next_review_at: newCard.nextReview.toISOString(),
    mastery_level: masteryLevel,
    confidence: fsrsConfidence(newCard),
    quality_rating: rating,
    retention_estimate: fsrsEstimateRetention(newCard),
    fsrs_state: newCard,
  }
}

// ============================================
// State Conversion
// ============================================

/**
 * Create initial algorithm state for a new problem
 */
export function createInitialState(
  algorithm: SpacedRepetitionAlgorithm,
  difficulty: Difficulty
): AlgorithmState {
  const now = new Date().toISOString()

  if (algorithm === "fsrs") {
    const card = createFSRSCard()
    return {
      algorithm: "fsrs",
      interval_days: 0,
      next_review_at: now,
      review_count: 0,
      mastery_level: "new",
      confidence: 0,
      fsrs_state: card,
    }
  } else {
    return {
      algorithm: "sm2",
      interval_days: 0,
      next_review_at: now,
      review_count: 0,
      mastery_level: "new",
      confidence: 0,
      ease_factor: 2.5,
    }
  }
}

/**
 * Reconstruct algorithm state from stored problem mastery data
 */
export function reconstructState(
  algorithm: SpacedRepetitionAlgorithm,
  data: {
    interval_days: number
    next_review_at: string
    review_count: number
    mastery_level: SpacedRepetitionMasteryLevel
    confidence: number
    ease_factor?: number
    fsrs_difficulty?: number
    fsrs_stability?: number
    fsrs_state?: string
    fsrs_lapses?: number
    last_reviewed_at?: string
    scores_history?: number[]
  }
): AlgorithmState {
  const baseState: AlgorithmState = {
    algorithm,
    interval_days: data.interval_days,
    next_review_at: data.next_review_at,
    review_count: data.review_count,
    mastery_level: data.mastery_level,
    confidence: data.confidence,
  }

  if (algorithm === "sm2") {
    return {
      ...baseState,
      ease_factor: data.ease_factor || 2.5,
      scores_history: data.scores_history,
    }
  } else {
    // Reconstruct FSRS card from stored data
    let fsrsCard: FSRSCard

    if (data.fsrs_state) {
      try {
        // Parse JSON and reconstruct Date objects (JSON.parse loses Date types).
        // Supports both the app's legacy FSRSCard shape and raw ts-fsrs card fields.
        const parsed = JSON.parse(data.fsrs_state)
        fsrsCard = {
          difficulty: parsed.difficulty ?? data.fsrs_difficulty ?? 5,
          stability: parsed.stability ?? data.fsrs_stability ?? data.interval_days ?? 1,
          state: normalizeFSRSState(parsed.state),
          lastReview: parsed.lastReview
            ? new Date(parsed.lastReview)
            : parsed.last_review
              ? new Date(parsed.last_review)
              : data.last_reviewed_at
                ? new Date(data.last_reviewed_at)
                : null,
          nextReview: parsed.nextReview
            ? new Date(parsed.nextReview)
            : parsed.due
              ? new Date(parsed.due)
              : new Date(data.next_review_at),
          reps: parsed.reps ?? data.review_count,
          lapses: parsed.lapses ?? data.fsrs_lapses ?? 0,
          learningSteps: parsed.learningSteps ?? parsed.learning_steps ?? 0,
          elapsedDays: parsed.elapsedDays ?? parsed.elapsed_days ?? 0,
          scheduledDays: parsed.scheduledDays ?? parsed.scheduled_days ?? data.interval_days,
        }
      } catch {
        fsrsCard = reconstructFSRSCardFromFields(data)
      }
    } else {
      fsrsCard = reconstructFSRSCardFromFields(data)
    }

    return {
      ...baseState,
      fsrs_state: fsrsCard,
    }
  }
}

/**
 * Prepare algorithm state for storage in Firestore
 */
export function prepareStateForStorage(state: AlgorithmState): Record<string, unknown> {
  const base = {
    interval_days: state.interval_days,
    next_review_at: state.next_review_at,
    review_count: state.review_count,
    mastery_level: state.mastery_level,
    confidence: state.confidence,
  }

  if (state.algorithm === "sm2") {
    return {
      ...base,
      ease_factor: state.ease_factor || 2.5,
    }
  } else {
    const fsrs = state.fsrs_state
    return {
      ...base,
      ease_factor: 2.5, // Keep for backwards compatibility
      fsrs_difficulty: fsrs?.difficulty,
      fsrs_stability: fsrs?.stability,
      fsrs_state: fsrs ? JSON.stringify(fsrs) : undefined,
      fsrs_lapses: fsrs?.lapses,
    }
  }
}

// ============================================
// Retention Estimation
// ============================================

/**
 * Estimate current retention for a problem using algorithm-specific formulas.
 *
 * Both algorithms use different forgetting curves:
 * - SM-2: Uses Ebbinghaus-style exponential decay with stability based on interval/review count
 * - FSRS: Uses power-law decay (more accurate) with ML-derived stability
 *
 * The returned value is normalized to 0-100% scale for UI consistency.
 */
export function estimateRetention(
  algorithm: SpacedRepetitionAlgorithm,
  state: AlgorithmState,
  daysSinceReview: number
): number {
  if (algorithm === "fsrs" && state.fsrs_state) {
    // FSRS uses power-law forgetting curve: R = (1 + t/(9*S))^(-1)
    const retention = calculateRetrievability(state.fsrs_state.stability, daysSinceReview) * 100
    return Math.round(Math.max(0, Math.min(100, retention)))
  } else {
    // SM-2 uses exponential decay approximation
    const retention = sm2EstimateRetention(daysSinceReview, state.interval_days, state.review_count)
    return Math.round(Math.max(0, Math.min(100, retention)))
  }
}

/**
 * Estimate retention for algorithm (wrapper for scheduler compatibility)
 */
export function estimateRetentionForAlgorithm(
  algorithm: SpacedRepetitionAlgorithm,
  state: AlgorithmState,
  daysSinceReview: number
): number {
  return estimateRetention(algorithm, state, daysSinceReview)
}

export type MemoryUrgency = "safe" | "ok" | "warning" | "urgent"

/**
 * The one place the retention bands are defined, highest floor first.
 *
 * Exported because several surfaces band the same number independently and had
 * already drifted: /knowledge coloured its concept bars at 80/60/40 while the card
 * chip beside it used these cut points, so one value could read green on the bar and
 * amber on the chip. Anything that turns a 0-100 retention into a label, a colour or
 * a verdict must derive it from here.
 *
 * The two named constants elsewhere are the same numbers by design:
 * `SOLID_RECALL_THRESHOLD` (0.9) is the "safe" floor and `AT_RISK_RETRIEVABILITY`
 * (70) is the "ok" floor.
 */
export const MEMORY_STRENGTH_BANDS = [
  { floor: 90, label: "Strong", urgency: "safe" },
  { floor: 70, label: "Good", urgency: "ok" },
  { floor: 50, label: "Weakening", urgency: "warning" },
  { floor: 0, label: "Fading", urgency: "urgent" },
] as const satisfies ReadonlyArray<{ floor: number; label: string; urgency: MemoryUrgency }>

/** The band a 0-100 retention falls in. Values outside the range clamp to an end band. */
export function memoryBandFor(retention: number): { label: string; urgency: MemoryUrgency } {
  const band =
    MEMORY_STRENGTH_BANDS.find((b) => retention >= b.floor) ??
    MEMORY_STRENGTH_BANDS[MEMORY_STRENGTH_BANDS.length - 1]
  return { label: band.label, urgency: band.urgency }
}

/**
 * Convert retention to a consistent "memory strength" score
 * This provides a normalized metric for comparing across algorithms
 * Returns 0-100 banded by MEMORY_STRENGTH_BANDS.
 */
export function getMemoryStrength(
  algorithm: SpacedRepetitionAlgorithm,
  state: AlgorithmState,
  daysSinceReview: number
): { score: number; label: string; urgency: MemoryUrgency } {
  const retention = estimateRetention(algorithm, state, daysSinceReview)
  return { score: retention, ...memoryBandFor(retention) }
}

// ============================================
// Statistics Helpers
// ============================================

/**
 * Get algorithm distribution stats for admin dashboard
 */
export async function getAlgorithmDistribution(): Promise<{
  sm2: { total: number; active_7d: number; overridden: number }
  fsrs: { total: number; active_7d: number; overridden: number }
}> {
  const profiles = await adminDb.collection("profiles").get()

  const stats = {
    sm2: { total: 0, active_7d: 0, overridden: 0 },
    fsrs: { total: 0, active_7d: 0, overridden: 0 },
  }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  profiles.docs.forEach((doc) => {
    const data = doc.data()
    const algorithm = (data.spaced_repetition_algorithm as SpacedRepetitionAlgorithm) || "sm2"
    const lastActive = data.updated_at ? new Date(data.updated_at) : null

    stats[algorithm].total++

    if (lastActive && lastActive >= sevenDaysAgo) {
      stats[algorithm].active_7d++
    }

    if (data.algorithm_user_overridden) {
      stats[algorithm].overridden++
    }
  })

  return stats
}

/**
 * Assign algorithms to all users who don't have one
 * Useful for migrating existing users
 */
export async function migrateExistingUsers(): Promise<{
  migrated: number
  sm2_assigned: number
  fsrs_assigned: number
}> {
  const profiles = await adminDb.collection("profiles").get()
  const batch = adminDb.batch()

  let migrated = 0
  let sm2Assigned = 0
  let fsrsAssigned = 0

  profiles.docs.forEach((doc) => {
    const data = doc.data()

    if (!data.spaced_repetition_algorithm) {
      const algorithm = assignRandomAlgorithm()
      batch.update(doc.ref, {
        spaced_repetition_algorithm: algorithm,
        algorithm_assigned_at: new Date().toISOString(),
        algorithm_user_overridden: false,
      })

      migrated++
      if (algorithm === "sm2") sm2Assigned++
      else fsrsAssigned++
    }
  })

  if (migrated > 0) {
    await batch.commit()
    console.log(
      `[AlgorithmRouter] Migrated ${migrated} users (SM-2: ${sm2Assigned}, FSRS: ${fsrsAssigned})`
    )
  }

  return {
    migrated,
    sm2_assigned: sm2Assigned,
    fsrs_assigned: fsrsAssigned,
  }
}

// ============================================
// Unified Mastery Level
// ============================================

/**
 * Get a unified mastery level that works for both FSRS and SM2
 *
 * This function provides consistent mastery level determination
 * regardless of which algorithm a user is assigned to.
 *
 * Mastery Levels:
 * - new: Never reviewed (reps = 0)
 * - learning: Short intervals (< 7 days), still building skill
 * - reviewing: Medium intervals (7-20 days), needs occasional practice
 * - mastered: Long intervals (21+ days), in long-term memory
 *
 * Algorithm-specific differences:
 * - FSRS: Requires interval >= 21 AND reps >= 3 for mastered
 * - SM2: Requires interval >= 21 days for mastered
 *
 * @param algorithm - User's assigned algorithm ('sm2' or 'fsrs')
 * @param interval - Current review interval in days
 * @param reps - Number of successful reviews
 * @returns Unified mastery level
 */
export function getUnifiedMasteryLevel(
  algorithm: SpacedRepetitionAlgorithm,
  interval: number,
  reps: number
): SpacedRepetitionMasteryLevel {
  // Never reviewed = new
  if (reps === 0) return "new"

  if (algorithm === "fsrs") {
    // FSRS: More strict - requires both interval AND rep count
    // This ensures the user has demonstrated consistent retention
    if (interval >= 21 && reps >= 3) return "mastered"
    if (interval >= 7) return "reviewing"
    return "learning"
  } else {
    // SM2: Based primarily on interval
    if (interval >= 21) return "mastered"
    if (interval >= 7) return "reviewing"
    return "learning"
  }
}

/**
 * Check if a problem is considered "mastered"
 * Quick helper for filtering/display purposes
 *
 * @param algorithm - User's assigned algorithm
 * @param interval - Current review interval in days
 * @param reps - Number of successful reviews
 * @returns true if problem is mastered
 */
export function isProblemMastered(
  algorithm: SpacedRepetitionAlgorithm,
  interval: number,
  reps: number
): boolean {
  return getUnifiedMasteryLevel(algorithm, interval, reps) === "mastered"
}

/**
 * Get mastery progress as a percentage (0-100)
 * Useful for progress bars and visualizations
 *
 * Progress milestones:
 * - 0%: New (never practiced)
 * - 25%: First successful review
 * - 50%: Reached 7-day interval (reviewing)
 * - 75%: Reached 14-day interval
 * - 100%: Mastered (21+ day interval)
 *
 * @param interval - Current review interval in days
 * @param reps - Number of successful reviews
 * @returns Progress percentage (0-100)
 */
export function getMasteryProgress(interval: number, reps: number): number {
  if (reps === 0) return 0
  if (interval >= 21) return 100
  if (interval >= 14) return 75
  if (interval >= 7) return 50
  if (reps >= 1) return 25
  return 0
}
