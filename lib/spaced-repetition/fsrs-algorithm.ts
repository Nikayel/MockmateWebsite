/**
 * FSRS (Free Spaced Repetition Scheduler) adapter.
 *
 * The app keeps a stable local card shape, but delegates scheduling math to
 * the official ts-fsrs package so difficulty/stability/interval calculations
 * stay aligned with the maintained FSRS implementation.
 */

import {
  Rating,
  State,
  createEmptyCard,
  forgetting_curve,
  fsrs,
  generatorParameters,
  type Card,
  type Grade,
} from "ts-fsrs"

export type FSRSRating = 1 | 2 | 3 | 4 // Again, Hard, Good, Easy
export type FSRSState = "new" | "learning" | "review" | "relearning"

export interface FSRSCard {
  // Core FSRS state
  difficulty: number // 0-10 (higher = harder to remember)
  stability: number // Days until retention drops to desired level
  state: FSRSState

  // Review tracking
  lastReview: Date | null
  nextReview: Date
  reps: number // Total reviews
  lapses: number // Times forgotten (rated Again)
  learningSteps: number // Index into the (re)learning steps for short-term scheduling

  // For analytics
  elapsedDays: number // Days since last review
  scheduledDays: number // Scheduled interval
}

export interface FSRSConfig {
  // Target retention (0.70 - 0.97, default 0.90)
  desiredRetention: number

  // Maximum interval in days
  maximumInterval: number

  // Learning steps in minutes
  learningSteps: number[]

  // Relearning steps in minutes
  relearningSteps: number[]

  // FSRS weights (21 parameters) - use defaults until enough reviews exist to tune them
  weights: number[]
}

const DEFAULT_TS_FSRS_PARAMS = generatorParameters()

export const DEFAULT_FSRS_WEIGHTS: number[] = [...DEFAULT_TS_FSRS_PARAMS.w]

export const DEFAULT_FSRS_CONFIG: FSRSConfig = {
  desiredRetention: 0.9,
  maximumInterval: 365,
  // Coding exercises need longer learning gaps than flashcards.
  learningSteps: [720, 1440],
  relearningSteps: [1440],
  weights: DEFAULT_FSRS_WEIGHTS,
}

function minutesToStep(minutes: number): `${number}m` {
  const safeMinutes = Math.max(1, Math.round(minutes))
  return `${safeMinutes}m`
}

function buildScheduler(config: FSRSConfig) {
  return fsrs(
    generatorParameters({
      request_retention: config.desiredRetention,
      maximum_interval: config.maximumInterval,
      w: config.weights,
      enable_fuzz: false,
      enable_short_term: true,
      learning_steps: config.learningSteps.map(minutesToStep),
      relearning_steps: config.relearningSteps.map(minutesToStep),
    })
  )
}

function toTsState(state: FSRSState): State {
  switch (state) {
    case "new":
      return State.New
    case "learning":
      return State.Learning
    case "review":
      return State.Review
    case "relearning":
      return State.Relearning
  }
}

function fromTsState(state: State): FSRSState {
  switch (state) {
    case State.New:
      return "new"
    case State.Learning:
      return "learning"
    case State.Review:
      return "review"
    case State.Relearning:
      return "relearning"
  }
}

function toTsRating(rating: FSRSRating): Grade {
  switch (rating) {
    case 1:
      return Rating.Again
    case 2:
      return Rating.Hard
    case 3:
      return Rating.Good
    case 4:
      return Rating.Easy
  }
}

function toTsCard(card: FSRSCard): Card {
  return {
    due: card.nextReview,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps ?? 0,
    reps: card.reps,
    lapses: card.lapses,
    state: toTsState(card.state),
    last_review: card.lastReview ?? undefined,
  }
}

function fromTsCard(card: Card): FSRSCard {
  return {
    difficulty: card.difficulty,
    stability: card.stability,
    state: fromTsState(card.state),
    lastReview: card.last_review ?? null,
    nextReview: card.due,
    reps: card.reps,
    lapses: card.lapses,
    learningSteps: card.learning_steps ?? 0,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
  }
}

/**
 * Create a new FSRS card.
 */
export function createFSRSCard(now: Date = new Date()): FSRSCard {
  return fromTsCard(createEmptyCard(now))
}

/**
 * Calculate retrievability (probability of recall).
 */
export function calculateRetrievability(stability: number, elapsedDays: number): number {
  if (stability <= 0) return 0
  return forgetting_curve(DEFAULT_FSRS_WEIGHTS, elapsedDays, stability)
}

/**
 * Main FSRS scheduling function.
 */
export function scheduleFSRS(
  card: FSRSCard,
  rating: FSRSRating,
  config: FSRSConfig = DEFAULT_FSRS_CONFIG
): FSRSCard {
  const scheduler = buildScheduler(config)
  const result = scheduler.next(toTsCard(card), new Date(), toTsRating(rating))
  return fromTsCard(result.card)
}

/**
 * Map performance score (0-100) to FSRS rating.
 */
export function mapPerformanceToFSRSRating(
  score: number,
  hintsUsed: number,
  timeRatio: number // actual time / expected time
): FSRSRating {
  // Again (1): Failed badly
  if (score < 40 || hintsUsed > 3) return 1

  // Hard (2): Struggled significantly
  if (score < 60 || hintsUsed > 1 || timeRatio > 2.0) return 2

  // Good (3): Solved with some effort
  if (score < 85 || hintsUsed > 0 || timeRatio > 1.3) return 3

  // Easy (4): Solved quickly and correctly
  return 4
}

/**
 * Get human-readable description of rating.
 */
export function getRatingDescription(rating: FSRSRating): string {
  switch (rating) {
    case 1:
      return "Again - Need to relearn"
    case 2:
      return "Hard - Struggled but got it"
    case 3:
      return "Good - Solved with effort"
    case 4:
      return "Easy - Solved quickly"
  }
}

/**
 * Calculate estimated retention for a card.
 */
export function getEstimatedRetention(card: FSRSCard): number {
  if (card.state === "new") return 0

  const now = new Date()
  const daysSinceReview = card.lastReview
    ? (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24)
    : 0

  return calculateRetrievability(card.stability, daysSinceReview) * 100
}

/**
 * Determine if card is due for review.
 */
export function isDue(card: FSRSCard): boolean {
  return card.nextReview <= new Date()
}

/**
 * Get days until next review (negative if overdue).
 */
export function getDaysUntilReview(card: FSRSCard): number {
  const diff = card.nextReview.getTime() - Date.now()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

/**
 * Calculate review priority (higher = more urgent).
 */
export function getReviewPriority(card: FSRSCard): number {
  const daysUntil = getDaysUntilReview(card)

  if (daysUntil < 0) {
    return 100 + Math.min(50, Math.abs(daysUntil) * 5)
  }

  if (daysUntil === 0) {
    return 80
  }

  const difficultyBonus = card.difficulty * 2
  const lapseBonus = Math.min(20, card.lapses * 5)
  const duePenalty = Math.min(60, daysUntil * 10)

  return Math.max(0, 50 + difficultyBonus + lapseBonus - duePenalty)
}

/**
 * Batch schedule multiple cards and return sorted by priority.
 */
export function getDueCards(
  cards: Array<{ id: string; card: FSRSCard }>,
  limit?: number
): Array<{ id: string; card: FSRSCard; priority: number }> {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const dueCards = cards
    .filter(({ card }) => card.nextReview <= tomorrow)
    .map(({ id, card }) => ({
      id,
      card,
      priority: getReviewPriority(card),
    }))
    .sort((a, b) => b.priority - a.priority)

  return limit ? dueCards.slice(0, limit) : dueCards
}

/**
 * Calculate overall mastery level based on card state.
 */
export function getMasteryLevel(card: FSRSCard): "new" | "learning" | "familiar" | "mastered" {
  if (card.state === "new") return "new"
  if (card.state === "learning" || card.state === "relearning") return "learning"

  if (card.scheduledDays >= 21 && card.reps >= 3) return "mastered"

  return "familiar"
}

/**
 * Get confidence percentage (0-100).
 */
export function getConfidence(card: FSRSCard): number {
  if (card.state === "new") return 0

  const stabilityScore = Math.min(40, (card.stability / 60) * 40)
  const repScore = Math.min(30, card.reps * 3)
  const retentionScore = (getEstimatedRetention(card) / 100) * 20
  const lapsePenalty = Math.min(20, card.lapses * 5)

  return Math.round(
    Math.max(0, Math.min(100, stabilityScore + repScore + retentionScore - lapsePenalty))
  )
}
