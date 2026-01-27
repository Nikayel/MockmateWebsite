/**
 * Spaced Repetition Scheduler
 *
 * Manages the review queue and determines what problems are due for review.
 * Integrates with Firestore to track problem-level learning state.
 */

import { adminDb } from "../firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import type { DSAPattern } from "../types/dsa-patterns"
import type { SpacedRepetitionAlgorithm, SpacedRepetitionMasteryLevel } from "../types"
import { getScenarioById, scenarios } from "../scenarios"
import {
  calculateReviewPriority,
  estimateRetention,
  type Difficulty,
  type MasteryLevel,
} from "./sm2-algorithm"
import {
  getUserAlgorithm,
  calculateNextReview,
  createInitialState,
  prepareStateForStorage,
  reconstructState,
} from "./algorithm-router"

/**
 * Validate and return the canonical difficulty for a scenario.
 * Tries multiple strategies:
 * 1. Look up by scenario ID (e.g., 'dsa-two-sum')
 * 2. Look up by title (e.g., 'Two Sum') - handles old data with wrong IDs
 * 3. Falls back to stored difficulty if nothing found
 */
function getCanonicalDifficulty(
  scenarioId: string,
  storedDifficulty: Difficulty,
  title?: string
): Difficulty {
  // Strategy 1: Look up by ID
  const scenarioById = getScenarioById(scenarioId)
  if (scenarioById) {
    return scenarioById.difficulty as Difficulty
  }

  // Strategy 2: Look up by title (handles old data with wrong scenario_id)
  if (title) {
    const scenarioByTitle = scenarios.find((s) => s.title === title)
    if (scenarioByTitle) {
      return scenarioByTitle.difficulty as Difficulty
    }
  }

  // Strategy 3: Fall back to stored difficulty
  return storedDifficulty
}

/**
 * Get correct scenario ID from title (for fixing old data)
 */
function getScenarioIdByTitle(title: string): string | undefined {
  const scenario = scenarios.find((s) => s.title === title)
  return scenario?.id
}

// Types
export interface ProblemMastery {
  problem_id: string
  scenario_id: string
  title: string
  pattern: DSAPattern
  difficulty: Difficulty

  // SM-2 State
  ease_factor: number
  interval_days: number
  review_count: number
  next_review_at: string // ISO date

  // Performance History
  last_score: number
  average_score: number
  best_score: number
  scores_history: number[] // Last 10 scores

  // Metadata
  first_seen_at: string
  last_reviewed_at: string
  time_spent_minutes: number
  hints_used_total: number

  // Mastery
  mastery_level: MasteryLevel
  confidence: number
}

export interface DueItem {
  problem_id: string
  scenario_id: string
  title: string
  pattern: DSAPattern
  difficulty: Difficulty
  last_score: number
  days_overdue: number
  days_until_review: number // Days until next review (negative if overdue)
  minutes_until_review?: number // Minutes until review (for FSRS learning steps)
  next_review_at: string // ISO date string
  priority: "critical" | "high" | "medium" | "low"
  priority_score: number
  estimated_minutes: number
  mastery_level: MasteryLevel
  retention_estimate: number
  algorithm?: SpacedRepetitionAlgorithm // User's assigned algorithm
  fsrs_state?: "new" | "learning" | "review" | "relearning" // FSRS-specific state
  last_reviewed_at?: string // ISO date - when this problem was last practiced
}

export interface DueQueueResult {
  due_now: DueItem[] // Overdue items
  due_in_minutes: DueItem[] // FSRS learning steps - due within the hour
  due_today: DueItem[] // Due today
  upcoming: DueItem[] // Next 7 days
  user_algorithm?: SpacedRepetitionAlgorithm // User's assigned algorithm
  stats: {
    total_due: number
    overdue_count: number
    learning_steps_due: number // FSRS learning steps count
    streak_at_risk: boolean
  }
}

export interface SchedulerOptions {
  limit?: number
  pattern?: DSAPattern
  difficulty?: Difficulty
  includeUpcoming?: boolean
  upcomingDays?: number
}

// Estimated time based on difficulty (minutes)
const ESTIMATED_TIME: Record<Difficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 30,
}

// Priority thresholds based on score
function getPriorityLevel(priorityScore: number): "critical" | "high" | "medium" | "low" {
  if (priorityScore >= 80) return "critical"
  if (priorityScore >= 60) return "high"
  if (priorityScore >= 40) return "medium"
  return "low"
}

/**
 * Get problems due for review for a user
 */
export async function getDueProblems(
  userId: string,
  options: SchedulerOptions = {}
): Promise<DueQueueResult> {
  const { limit = 20, pattern, difficulty, includeUpcoming = true, upcomingDays = 7 } = options

  const now = new Date()
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

  // Use UTC to ensure consistent behavior across all environments (localhost vs production)
  const todayEnd = new Date(now)
  todayEnd.setUTCHours(23, 59, 59, 999)

  const upcomingEnd = new Date(now)
  upcomingEnd.setUTCDate(upcomingEnd.getUTCDate() + upcomingDays)
  upcomingEnd.setUTCHours(23, 59, 59, 999)

  // Get user's algorithm for transparency
  const userAlgorithm = await getUserAlgorithm(userId)

  // Query problem mastery collection
  const masteryRef = adminDb.collection("problem_mastery").doc(userId).collection("problems")

  let query: FirebaseFirestore.Query = masteryRef

  // Apply filters
  if (pattern) {
    query = query.where("pattern", "==", pattern)
  }
  if (difficulty) {
    query = query.where("difficulty", "==", difficulty)
  }

  // Get all problems with their review dates
  const snapshot = await query.get()

  const dueInMinutes: DueItem[] = [] // FSRS learning steps
  const dueNow: DueItem[] = []
  const dueToday: DueItem[] = []
  const upcoming: DueItem[] = []

  // Helper to calculate calendar days difference (for "Tomorrow" to show as 1 day, not 0)
  const getCalendarDaysDiff = (fromDate: Date, toDate: Date): number => {
    const fromStart = new Date(fromDate)
    fromStart.setHours(0, 0, 0, 0)
    const toStart = new Date(toDate)
    toStart.setHours(0, 0, 0, 0)
    return Math.round((toStart.getTime() - fromStart.getTime()) / (1000 * 60 * 60 * 24))
  }

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as ProblemMastery
    const nextReviewAt = new Date(data.next_review_at)

    // Calculate time differences
    const millisDiff = nextReviewAt.getTime() - now.getTime()
    const minutesDiff = Math.floor(millisDiff / (1000 * 60))
    // Use calendar days for days_until_review so "Tomorrow" shows as 1 day, not 0
    const daysDiff = getCalendarDaysDiff(now, nextReviewAt)

    const daysOverdue = Math.max(0, -daysDiff)
    const priorityScore = calculateReviewPriority(
      daysOverdue,
      data.difficulty,
      data.last_score,
      data.mastery_level
    )

    const retention = estimateRetention(
      daysOverdue > 0 ? daysOverdue : 0,
      data.interval_days,
      data.review_count
    )

    // Use canonical difficulty from scenario definition to fix any data inconsistencies
    const canonicalDifficulty = getCanonicalDifficulty(
      data.scenario_id,
      data.difficulty,
      data.title
    )

    // Extract FSRS state if available
    let fsrsState: "new" | "learning" | "review" | "relearning" | undefined
    if ((data as any).fsrs_state) {
      try {
        const parsed = JSON.parse((data as any).fsrs_state)
        fsrsState = parsed.state
      } catch {
        // Ignore parse errors
      }
    }

    const dueItem: DueItem = {
      problem_id: data.problem_id,
      scenario_id: data.scenario_id,
      title: data.title,
      pattern: data.pattern,
      difficulty: canonicalDifficulty,
      last_score: data.last_score,
      days_overdue: daysOverdue,
      days_until_review: daysDiff,
      minutes_until_review: minutesDiff > 0 ? minutesDiff : undefined,
      next_review_at: data.next_review_at,
      priority: getPriorityLevel(priorityScore),
      priority_score: priorityScore,
      estimated_minutes: ESTIMATED_TIME[canonicalDifficulty],
      mastery_level: data.mastery_level,
      retention_estimate: retention,
      algorithm: userAlgorithm,
      fsrs_state: fsrsState,
      last_reviewed_at: data.last_reviewed_at,
    }

    // Categorize based on timing
    if (nextReviewAt <= now) {
      // Overdue
      dueNow.push(dueItem)
    } else if (
      nextReviewAt <= oneHourFromNow &&
      userAlgorithm === "fsrs" &&
      (fsrsState === "learning" || fsrsState === "relearning")
    ) {
      // FSRS learning steps due within the hour (special category)
      dueInMinutes.push(dueItem)
    } else if (nextReviewAt <= todayEnd) {
      // Due later today
      dueToday.push(dueItem)
    } else if (includeUpcoming && nextReviewAt <= upcomingEnd) {
      // Upcoming
      upcoming.push(dueItem)
    }
  })

  // Sort by priority (highest first), but dueInMinutes by time
  const sortByPriority = (a: DueItem, b: DueItem) => b.priority_score - a.priority_score
  const sortByMinutes = (a: DueItem, b: DueItem) =>
    (a.minutes_until_review || 0) - (b.minutes_until_review || 0)

  dueInMinutes.sort(sortByMinutes) // Soonest first for learning steps
  dueNow.sort(sortByPriority)
  dueToday.sort(sortByPriority)
  upcoming.sort(sortByPriority)

  // Apply limit
  const limitedDueInMinutes = dueInMinutes.slice(0, limit)
  const limitedDueNow = dueNow.slice(0, limit)
  const limitedDueToday = dueToday.slice(0, limit)
  const limitedUpcoming = upcoming.slice(0, limit)

  // Check streak at risk
  const learningStateRef = adminDb.collection("user_learning_state").doc(userId)
  const learningStateDoc = await learningStateRef.get()
  const learningState = learningStateDoc.data()

  let streakAtRisk = false
  if (learningState?.streak_days && learningState.streak_days > 0) {
    const lastSession = learningState.last_session_at
      ? new Date(learningState.last_session_at)
      : null
    if (lastSession) {
      const hoursSinceLastSession = (now.getTime() - lastSession.getTime()) / (1000 * 60 * 60)
      // Streak at risk if no practice today and it's past noon
      if (hoursSinceLastSession > 12 && now.getHours() >= 12) {
        streakAtRisk = true
      }
    }
  }

  return {
    due_now: limitedDueNow,
    due_in_minutes: limitedDueInMinutes,
    due_today: limitedDueToday,
    upcoming: limitedUpcoming,
    user_algorithm: userAlgorithm,
    stats: {
      total_due: dueNow.length + dueInMinutes.length + dueToday.length,
      overdue_count: dueNow.length,
      learning_steps_due: dueInMinutes.length,
      streak_at_risk: streakAtRisk,
    },
  }
}

/**
 * Get or create problem mastery record
 */
export async function getOrCreateProblemMastery(
  userId: string,
  problemId: string,
  scenarioData: {
    title: string
    pattern: DSAPattern
    difficulty: Difficulty
  }
): Promise<ProblemMastery> {
  const masteryRef = adminDb
    .collection("problem_mastery")
    .doc(userId)
    .collection("problems")
    .doc(problemId)

  const doc = await masteryRef.get()

  if (doc.exists) {
    return doc.data() as ProblemMastery
  }

  // Create new mastery record
  const now = new Date().toISOString()
  const newMastery: ProblemMastery = {
    problem_id: problemId,
    scenario_id: problemId,
    title: scenarioData.title,
    pattern: scenarioData.pattern,
    difficulty: scenarioData.difficulty,
    ease_factor: 2.5,
    interval_days: 0,
    review_count: 0,
    next_review_at: now, // Due immediately for first review
    last_score: 0,
    average_score: 0,
    best_score: 0,
    scores_history: [],
    first_seen_at: now,
    last_reviewed_at: now,
    time_spent_minutes: 0,
    hints_used_total: 0,
    mastery_level: "new",
    confidence: 0,
  }

  await masteryRef.set(newMastery)
  return newMastery
}

/**
 * Update problem mastery after a review
 *
 * Uses atomic operations where possible to handle concurrent requests:
 * - review_count: FieldValue.increment(1)
 * - time_spent_minutes: FieldValue.increment(delta)
 * - hints_used_total: FieldValue.increment(delta)
 */
export async function updateProblemMastery(
  userId: string,
  problemId: string,
  update: Partial<ProblemMastery> & {
    performance_score: number
    last_score?: number // Technical/mastery score for display (defaults to performance_score)
    time_spent_minutes?: number
    hints_used?: number
    increment_review_count?: boolean // Whether to atomically increment review_count
  }
): Promise<ProblemMastery> {
  const masteryRef = adminDb
    .collection("problem_mastery")
    .doc(userId)
    .collection("problems")
    .doc(problemId)

  // Use a transaction to prevent race conditions when multiple tabs
  // complete the same session simultaneously
  return await adminDb.runTransaction(async (transaction) => {
    const doc = await transaction.get(masteryRef)

    if (!doc.exists) {
      throw new Error(`Problem mastery not found: ${problemId}`)
    }

    const current = doc.data() as ProblemMastery
    const now = new Date().toISOString()

    // Update scores history (keep last 10)
    const newScoresHistory = [...current.scores_history, update.performance_score].slice(-10)

    // Calculate new average
    const newAverage = newScoresHistory.reduce((a, b) => a + b, 0) / newScoresHistory.length

    // Calculate new best
    const newBest = Math.max(current.best_score, update.performance_score)

    // Always correct difficulty to canonical value (fixes any previously incorrect data)
    // Pass title as fallback for old data that has wrong scenario_id
    const canonicalDifficulty = getCanonicalDifficulty(
      current.scenario_id,
      current.difficulty,
      current.title
    )

    // Also fix scenario_id if it doesn't match a known scenario
    const correctScenarioId = getScenarioIdByTitle(current.title) || current.scenario_id

    // Prepare update data - separate atomic operations from regular updates
    const { increment_review_count, time_spent_minutes, hints_used, last_score, ...restUpdate } =
      update

    // Use last_score if provided (technical/mastery score), otherwise use performance_score
    const scoreForLastScore = last_score ?? update.performance_score

    // Build the Firestore update object with atomic increments
    const firestoreUpdate: Record<string, any> = {
      ...restUpdate,
      scenario_id: correctScenarioId,
      difficulty: canonicalDifficulty,
      last_score: scoreForLastScore,
      average_score: Math.round(newAverage),
      best_score: newBest,
      scores_history: newScoresHistory,
      last_reviewed_at: now,
    }

    // Use atomic increments for counters to prevent race conditions
    if (increment_review_count) {
      firestoreUpdate.review_count = FieldValue.increment(1)
    }
    if (time_spent_minutes && time_spent_minutes > 0) {
      firestoreUpdate.time_spent_minutes = FieldValue.increment(time_spent_minutes)
    }
    if (hints_used && hints_used > 0) {
      firestoreUpdate.hints_used_total = FieldValue.increment(hints_used)
    }

    transaction.update(masteryRef, firestoreUpdate)

    // Return the expected new state (approximation since we used atomic increments)
    return {
      ...current,
      ...restUpdate,
      scenario_id: correctScenarioId,
      difficulty: canonicalDifficulty,
      last_score: scoreForLastScore,
      average_score: Math.round(newAverage),
      best_score: newBest,
      scores_history: newScoresHistory,
      last_reviewed_at: now,
      review_count: increment_review_count ? current.review_count + 1 : current.review_count,
      time_spent_minutes: current.time_spent_minutes + (time_spent_minutes || 0),
      hints_used_total: current.hints_used_total + (hints_used || 0),
    } as ProblemMastery
  })
}

/**
 * Mark a problem as skipped with penalty
 *
 * Applies penalties for both SM-2 and FSRS:
 * - SM-2: Reduces ease factor by 0.1 (10%)
 * - FSRS: Increases difficulty by 0.5 and reduces stability by 10%
 * - Both: Reschedules to tomorrow
 */
export async function skipProblem(userId: string, problemId: string): Promise<void> {
  const masteryRef = adminDb
    .collection("problem_mastery")
    .doc(userId)
    .collection("problems")
    .doc(problemId)

  const doc = await masteryRef.get()

  if (!doc.exists) {
    throw new Error(`Problem mastery not found: ${problemId}`)
  }

  const current = doc.data() as ProblemMastery

  // Get user's algorithm
  const userAlgorithm = await getUserAlgorithm(userId)

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + 1) // Due tomorrow

  const updateData: Record<string, unknown> = {
    next_review_at: nextReview.toISOString(),
    interval_days: 1, // Reset to 1 day interval
    // Don't change review_count - skipped doesn't count as reviewed
  }

  if (userAlgorithm === "fsrs") {
    // FSRS penalty: increase difficulty and reduce stability
    const currentDifficulty = (current as any).fsrs_difficulty || 5
    const currentStability = (current as any).fsrs_stability || current.interval_days || 1

    updateData.fsrs_difficulty = Math.min(10, currentDifficulty + 0.5)
    updateData.fsrs_stability = Math.max(0.5, currentStability * 0.9)

    // Also update the serialized FSRS state if it exists
    if ((current as any).fsrs_state) {
      try {
        const fsrsState = JSON.parse((current as any).fsrs_state)
        fsrsState.difficulty = updateData.fsrs_difficulty
        fsrsState.stability = updateData.fsrs_stability
        fsrsState.nextReview = nextReview.toISOString()
        fsrsState.scheduledDays = 1
        updateData.fsrs_state = JSON.stringify(fsrsState)
      } catch {
        // Ignore parse errors
      }
    }
  } else {
    // SM-2 penalty: reduce ease factor by 10%
    updateData.ease_factor = Math.max(1.3, current.ease_factor - 0.1)
  }

  await masteryRef.update(updateData)
}

/**
 * Get all problems for a user (for stats)
 */
export async function getAllUserProblems(userId: string): Promise<ProblemMastery[]> {
  const masteryRef = adminDb.collection("problem_mastery").doc(userId).collection("problems")

  const snapshot = await masteryRef.get()

  return snapshot.docs.map((doc) => doc.data() as ProblemMastery)
}

/**
 * Get problems by pattern
 */
export async function getProblemsByPattern(
  userId: string,
  pattern: DSAPattern
): Promise<ProblemMastery[]> {
  const masteryRef = adminDb.collection("problem_mastery").doc(userId).collection("problems")

  const snapshot = await masteryRef.where("pattern", "==", pattern).get()

  return snapshot.docs.map((doc) => doc.data() as ProblemMastery)
}

/**
 * Initialize problem mastery from a completed session
 * Uses the algorithm router (SM-2 or FSRS) based on user's assigned algorithm
 */
export async function initializeProblemMasteryFromSession(
  userId: string,
  sessionData: {
    scenario_id: string
    title: string
    pattern: DSAPattern
    difficulty: Difficulty
    performance_score: number
    mastery_score?: number // Code-focused score for last_score (optional)
    time_spent_minutes?: number
    hints_used?: number
  }
): Promise<ProblemMastery> {
  const masteryRef = adminDb
    .collection("problem_mastery")
    .doc(userId)
    .collection("problems")
    .doc(sessionData.scenario_id)

  const doc = await masteryRef.get()
  const now = new Date()

  // Use mastery_score for last_score if provided, otherwise use performance_score
  const scoreForLastScore = sessionData.mastery_score ?? sessionData.performance_score

  if (doc.exists) {
    // Update existing record
    return updateProblemMastery(userId, sessionData.scenario_id, {
      performance_score: sessionData.performance_score,
      last_score: scoreForLastScore,
      time_spent_minutes: sessionData.time_spent_minutes,
      hints_used: sessionData.hints_used,
    })
  }

  // Get user's assigned algorithm (SM-2 or FSRS)
  const userAlgorithm = await getUserAlgorithm(userId)

  // Create initial state for the algorithm
  const initialState = createInitialState(userAlgorithm, sessionData.difficulty)

  // Calculate the next review using the algorithm router
  // This respects the user's assigned algorithm and the performance score
  const reviewResult = await calculateNextReview(userId, initialState, {
    performance_score: sessionData.performance_score,
    time_spent_minutes: sessionData.time_spent_minutes || 0,
    hints_used: sessionData.hints_used || 0,
    problem_difficulty: sessionData.difficulty,
    is_early_review: false,
    days_overdue: 0,
  })

  // Prepare storage data from algorithm result
  const storageData = prepareStateForStorage({
    algorithm: reviewResult.algorithm,
    interval_days: reviewResult.next_interval_days,
    next_review_at: reviewResult.next_review_at,
    review_count: 1,
    mastery_level: reviewResult.mastery_level,
    confidence: reviewResult.confidence,
    ease_factor: reviewResult.ease_factor,
    fsrs_state: reviewResult.fsrs_state,
  })

  // Create new record with algorithm-calculated review data
  const newMastery: ProblemMastery = {
    problem_id: sessionData.scenario_id,
    scenario_id: sessionData.scenario_id,
    title: sessionData.title,
    pattern: sessionData.pattern,
    difficulty: sessionData.difficulty,
    ease_factor: (storageData.ease_factor as number) || 2.5,
    interval_days: storageData.interval_days as number,
    review_count: 1,
    next_review_at: storageData.next_review_at as string,
    last_score: scoreForLastScore,
    average_score: sessionData.performance_score,
    best_score: sessionData.performance_score,
    scores_history: [sessionData.performance_score],
    first_seen_at: now.toISOString(),
    last_reviewed_at: now.toISOString(),
    time_spent_minutes: sessionData.time_spent_minutes || 0,
    hints_used_total: sessionData.hints_used || 0,
    mastery_level: reviewResult.mastery_level as MasteryLevel,
    confidence: reviewResult.confidence,
  }

  await masteryRef.set(newMastery)
  return newMastery
}

// ============================================
// Batch Deferral (Overflow Management)
// ============================================

export interface BatchDeferralResult {
  deferred_count: number
  deferred_problem_ids: string[]
  remaining_due_count: number
  spread_days: number
}

/**
 * Batch defer low-priority problems to reduce review overload
 *
 * This function integrates properly with both SM-2 and FSRS algorithms
 * by simulating a "struggled" review rather than applying manual penalties.
 *
 * Algorithm behavior:
 * - SM-2: performance_score=50 triggers quality=2, reducing ease_factor
 * - FSRS: Maps to rating=2 (Hard), adjusting difficulty/stability properly
 *
 * Spreading logic prevents future backlog:
 * - 50% of items deferred to tomorrow
 * - 30% to day 2
 * - 20% spread across days 3-7
 *
 * @param userId - User ID
 * @param targetLimit - Maximum problems to keep in queue
 * @param maxDaysToSpread - Max days to spread deferrals (default 7)
 */
export async function batchDeferProblems(
  userId: string,
  targetLimit: number,
  maxDaysToSpread: number = 7
): Promise<BatchDeferralResult> {
  // Get all due problems
  const dueQueue = await getDueProblems(userId, {
    limit: 100, // Get more than needed to see full picture
    includeUpcoming: false,
  })

  // Combine all due items (due_now + due_in_minutes + due_today)
  const allDueItems = [...dueQueue.due_now, ...dueQueue.due_in_minutes, ...dueQueue.due_today]

  // If not over limit, nothing to defer
  if (allDueItems.length <= targetLimit) {
    return {
      deferred_count: 0,
      deferred_problem_ids: [],
      remaining_due_count: allDueItems.length,
      spread_days: 0,
    }
  }

  // Sort by priority (highest first - we want to KEEP high priority)
  const sorted = [...allDueItems].sort((a, b) => b.priority_score - a.priority_score)

  // Keep the top N items, defer the rest
  const toKeep = sorted.slice(0, targetLimit)
  const toDefer = sorted.slice(targetLimit)

  // Get user's algorithm for proper deferral
  const userAlgorithm = await getUserAlgorithm(userId)

  // Calculate spread distribution
  const totalToDefer = toDefer.length
  const day1Count = Math.ceil(totalToDefer * 0.5) // 50% tomorrow
  const day2Count = Math.ceil(totalToDefer * 0.3) // 30% day 2
  // remaining 20% spread across days 3-7

  // Assign each deferred item to a day
  const deferredProblemIds: string[] = []
  let maxDayUsed = 1

  for (let i = 0; i < toDefer.length; i++) {
    const item = toDefer[i]
    let daysToAdd: number

    if (i < day1Count) {
      daysToAdd = 1 // Tomorrow
    } else if (i < day1Count + day2Count) {
      daysToAdd = 2 // Day 2
    } else {
      // Spread remaining across days 3-7
      const remainingIndex = i - day1Count - day2Count
      const daysAvailable = Math.min(maxDaysToSpread - 2, 5) // Days 3-7
      daysToAdd = 3 + (remainingIndex % daysAvailable)
    }

    maxDayUsed = Math.max(maxDayUsed, daysToAdd)

    // Defer this item using algorithm-appropriate method
    await deferSingleProblem(userId, item.problem_id, item.difficulty, daysToAdd, userAlgorithm)
    deferredProblemIds.push(item.problem_id)
  }

  return {
    deferred_count: toDefer.length,
    deferred_problem_ids: deferredProblemIds,
    remaining_due_count: toKeep.length,
    spread_days: maxDayUsed,
  }
}

/**
 * Defer a single problem using algorithm-integrated logic
 *
 * Instead of manually adjusting ease_factor or FSRS difficulty,
 * this simulates a "struggled" review to get proper algorithm behavior.
 */
async function deferSingleProblem(
  userId: string,
  problemId: string,
  difficulty: Difficulty,
  daysToDefer: number,
  algorithm: "sm2" | "fsrs"
): Promise<void> {
  const masteryRef = adminDb
    .collection("problem_mastery")
    .doc(userId)
    .collection("problems")
    .doc(problemId)

  const doc = await masteryRef.get()
  if (!doc.exists) return

  const current = doc.data() as ProblemMastery

  // Reconstruct current state for algorithm
  const currentState = reconstructState(algorithm, {
    interval_days: current.interval_days,
    next_review_at: current.next_review_at,
    review_count: current.review_count,
    mastery_level: current.mastery_level as any,
    confidence: current.confidence,
    ease_factor: current.ease_factor,
    fsrs_difficulty: (current as any).fsrs_difficulty,
    fsrs_stability: (current as any).fsrs_stability,
    fsrs_state: (current as any).fsrs_state,
    fsrs_lapses: (current as any).fsrs_lapses,
    last_reviewed_at: current.last_reviewed_at,
    scores_history: current.scores_history,
  })

  // Simulate a "struggled" review (score=50 maps to quality=2 for SM-2, rating=2 for FSRS)
  // This properly reduces ease_factor/stability without fully resetting progress
  const deferInput = {
    performance_score: 50, // "Struggled" score
    time_spent_minutes: 0,
    hints_used: 0,
    problem_difficulty: difficulty,
    is_early_review: false,
    days_overdue: 0,
  }

  const reviewResult = await calculateNextReview(userId, currentState, deferInput)

  // Override the next_review_at to spread items across days
  const deferDate = new Date()
  deferDate.setDate(deferDate.getDate() + daysToDefer)
  deferDate.setHours(9, 0, 0, 0) // Set to 9 AM for consistent scheduling

  // Prepare update data
  const storageData = prepareStateForStorage({
    algorithm: reviewResult.algorithm,
    interval_days: daysToDefer, // Use the defer days as the new interval
    next_review_at: deferDate.toISOString(),
    review_count: currentState.review_count, // Don't increment - this wasn't a real review
    mastery_level: reviewResult.mastery_level,
    confidence: reviewResult.confidence,
    ease_factor: reviewResult.ease_factor,
    fsrs_state: reviewResult.fsrs_state,
  })

  // Update the mastery record
  await masteryRef.update({
    ...storageData,
    // Mark that this was a deferral, not a real review
    last_deferred_at: new Date().toISOString(),
  })
}
