/**
 * Spaced Repetition Scheduler
 *
 * Manages the review queue and determines what problems are due for review.
 * Integrates with Firestore to track problem-level learning state.
 */

import { adminDb } from '../firebase-admin';
import type { DSAPattern } from '../types/dsa-patterns';
import { getScenarioById, scenarios } from '../scenarios';
import {
  calculateReviewPriority,
  estimateRetention,
  type Difficulty,
  type MasteryLevel,
} from './sm2-algorithm';

/**
 * Validate and return the canonical difficulty for a scenario.
 * Tries multiple strategies:
 * 1. Look up by scenario ID (e.g., 'dsa-two-sum')
 * 2. Look up by title (e.g., 'Two Sum') - handles old data with wrong IDs
 * 3. Falls back to stored difficulty if nothing found
 */
function getCanonicalDifficulty(scenarioId: string, storedDifficulty: Difficulty, title?: string): Difficulty {
  // Strategy 1: Look up by ID
  const scenarioById = getScenarioById(scenarioId);
  if (scenarioById) {
    return scenarioById.difficulty as Difficulty;
  }

  // Strategy 2: Look up by title (handles old data with wrong scenario_id)
  if (title) {
    const scenarioByTitle = scenarios.find(s => s.title === title);
    if (scenarioByTitle) {
      return scenarioByTitle.difficulty as Difficulty;
    }
  }

  // Strategy 3: Fall back to stored difficulty
  return storedDifficulty;
}

/**
 * Get correct scenario ID from title (for fixing old data)
 */
function getScenarioIdByTitle(title: string): string | undefined {
  const scenario = scenarios.find(s => s.title === title);
  return scenario?.id;
}

// Types
export interface ProblemMastery {
  problem_id: string;
  scenario_id: string;
  title: string;
  pattern: DSAPattern;
  difficulty: Difficulty;

  // SM-2 State
  ease_factor: number;
  interval_days: number;
  review_count: number;
  next_review_at: string; // ISO date

  // Performance History
  last_score: number;
  average_score: number;
  best_score: number;
  scores_history: number[]; // Last 10 scores

  // Metadata
  first_seen_at: string;
  last_reviewed_at: string;
  time_spent_minutes: number;
  hints_used_total: number;

  // Mastery
  mastery_level: MasteryLevel;
  confidence: number;
}

export interface DueItem {
  problem_id: string;
  scenario_id: string;
  title: string;
  pattern: DSAPattern;
  difficulty: Difficulty;
  last_score: number;
  days_overdue: number;
  days_until_review: number; // Days until next review (negative if overdue)
  next_review_at: string; // ISO date string
  priority: 'critical' | 'high' | 'medium' | 'low';
  priority_score: number;
  estimated_minutes: number;
  mastery_level: MasteryLevel;
  retention_estimate: number;
}

export interface DueQueueResult {
  due_now: DueItem[];      // Overdue items
  due_today: DueItem[];    // Due today
  upcoming: DueItem[];     // Next 7 days
  stats: {
    total_due: number;
    overdue_count: number;
    streak_at_risk: boolean;
  };
}

export interface SchedulerOptions {
  limit?: number;
  pattern?: DSAPattern;
  difficulty?: Difficulty;
  includeUpcoming?: boolean;
  upcomingDays?: number;
}

// Estimated time based on difficulty (minutes)
const ESTIMATED_TIME: Record<Difficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 30,
};

// Priority thresholds based on score
function getPriorityLevel(priorityScore: number): 'critical' | 'high' | 'medium' | 'low' {
  if (priorityScore >= 80) return 'critical';
  if (priorityScore >= 60) return 'high';
  if (priorityScore >= 40) return 'medium';
  return 'low';
}

/**
 * Get problems due for review for a user
 */
export async function getDueProblems(
  userId: string,
  options: SchedulerOptions = {}
): Promise<DueQueueResult> {
  const {
    limit = 20,
    pattern,
    difficulty,
    includeUpcoming = true,
    upcomingDays = 7,
  } = options;

  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const upcomingEnd = new Date(now);
  upcomingEnd.setDate(upcomingEnd.getDate() + upcomingDays);

  // Query problem mastery collection
  const masteryRef = adminDb
    .collection('problem_mastery')
    .doc(userId)
    .collection('problems');

  let query: FirebaseFirestore.Query = masteryRef;

  // Apply filters
  if (pattern) {
    query = query.where('pattern', '==', pattern);
  }
  if (difficulty) {
    query = query.where('difficulty', '==', difficulty);
  }

  // Get all problems with their review dates
  const snapshot = await query.get();

  const dueNow: DueItem[] = [];
  const dueToday: DueItem[] = [];
  const upcoming: DueItem[] = [];

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as ProblemMastery;
    const nextReviewAt = new Date(data.next_review_at);
    const daysDiff = Math.floor(
      (nextReviewAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const daysOverdue = Math.max(0, -daysDiff);
    const priorityScore = calculateReviewPriority(
      daysOverdue,
      data.difficulty,
      data.last_score,
      data.mastery_level
    );

    const retention = estimateRetention(
      daysOverdue > 0 ? daysOverdue : 0,
      data.interval_days,
      data.review_count
    );

    // Use canonical difficulty from scenario definition to fix any data inconsistencies
    // Pass title as fallback for old data that has wrong scenario_id
    const canonicalDifficulty = getCanonicalDifficulty(data.scenario_id, data.difficulty, data.title);

    const dueItem: DueItem = {
      problem_id: data.problem_id,
      scenario_id: data.scenario_id,
      title: data.title,
      pattern: data.pattern,
      difficulty: canonicalDifficulty,
      last_score: data.last_score,
      days_overdue: daysOverdue,
      days_until_review: daysDiff, // Negative if overdue, positive if upcoming
      next_review_at: data.next_review_at,
      priority: getPriorityLevel(priorityScore),
      priority_score: priorityScore,
      estimated_minutes: ESTIMATED_TIME[canonicalDifficulty],
      mastery_level: data.mastery_level,
      retention_estimate: retention,
    };

    if (nextReviewAt <= now) {
      // Overdue
      dueNow.push(dueItem);
    } else if (nextReviewAt <= todayEnd) {
      // Due today
      dueToday.push(dueItem);
    } else if (includeUpcoming && nextReviewAt <= upcomingEnd) {
      // Upcoming
      upcoming.push(dueItem);
    }
  });

  // Sort by priority (highest first)
  const sortByPriority = (a: DueItem, b: DueItem) =>
    b.priority_score - a.priority_score;

  dueNow.sort(sortByPriority);
  dueToday.sort(sortByPriority);
  upcoming.sort(sortByPriority);

  // Apply limit
  const limitedDueNow = dueNow.slice(0, limit);
  const limitedDueToday = dueToday.slice(0, limit);
  const limitedUpcoming = upcoming.slice(0, limit);

  // Check streak at risk
  const learningStateRef = adminDb.collection('user_learning_state').doc(userId);
  const learningStateDoc = await learningStateRef.get();
  const learningState = learningStateDoc.data();

  let streakAtRisk = false;
  if (learningState?.streak_days && learningState.streak_days > 0) {
    const lastSession = learningState.last_session_at
      ? new Date(learningState.last_session_at)
      : null;
    if (lastSession) {
      const hoursSinceLastSession =
        (now.getTime() - lastSession.getTime()) / (1000 * 60 * 60);
      // Streak at risk if no practice today and it's past noon
      if (hoursSinceLastSession > 12 && now.getHours() >= 12) {
        streakAtRisk = true;
      }
    }
  }

  return {
    due_now: limitedDueNow,
    due_today: limitedDueToday,
    upcoming: limitedUpcoming,
    stats: {
      total_due: dueNow.length + dueToday.length,
      overdue_count: dueNow.length,
      streak_at_risk: streakAtRisk,
    },
  };
}

/**
 * Get or create problem mastery record
 */
export async function getOrCreateProblemMastery(
  userId: string,
  problemId: string,
  scenarioData: {
    title: string;
    pattern: DSAPattern;
    difficulty: Difficulty;
  }
): Promise<ProblemMastery> {
  const masteryRef = adminDb
    .collection('problem_mastery')
    .doc(userId)
    .collection('problems')
    .doc(problemId);

  const doc = await masteryRef.get();

  if (doc.exists) {
    return doc.data() as ProblemMastery;
  }

  // Create new mastery record
  const now = new Date().toISOString();
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
    mastery_level: 'new',
    confidence: 0,
  };

  await masteryRef.set(newMastery);
  return newMastery;
}

/**
 * Update problem mastery after a review
 */
export async function updateProblemMastery(
  userId: string,
  problemId: string,
  update: Partial<ProblemMastery> & {
    performance_score: number;
    time_spent_minutes?: number;
    hints_used?: number;
  }
): Promise<ProblemMastery> {
  const masteryRef = adminDb
    .collection('problem_mastery')
    .doc(userId)
    .collection('problems')
    .doc(problemId);

  const doc = await masteryRef.get();

  if (!doc.exists) {
    throw new Error(`Problem mastery not found: ${problemId}`);
  }

  const current = doc.data() as ProblemMastery;
  const now = new Date().toISOString();

  // Update scores history (keep last 10)
  const newScoresHistory = [...current.scores_history, update.performance_score].slice(-10);

  // Calculate new average
  const newAverage =
    newScoresHistory.reduce((a, b) => a + b, 0) / newScoresHistory.length;

  // Calculate new best
  const newBest = Math.max(current.best_score, update.performance_score);

  // Always correct difficulty to canonical value (fixes any previously incorrect data)
  // Pass title as fallback for old data that has wrong scenario_id
  const canonicalDifficulty = getCanonicalDifficulty(current.scenario_id, current.difficulty, current.title);

  // Also fix scenario_id if it doesn't match a known scenario
  const correctScenarioId = getScenarioIdByTitle(current.title) || current.scenario_id;

  const updateData: Partial<ProblemMastery> = {
    ...update,
    scenario_id: correctScenarioId, // Fix old data with wrong scenario_id
    difficulty: canonicalDifficulty,
    last_score: update.performance_score,
    average_score: Math.round(newAverage),
    best_score: newBest,
    scores_history: newScoresHistory,
    last_reviewed_at: now,
    time_spent_minutes:
      current.time_spent_minutes + (update.time_spent_minutes || 0),
    hints_used_total: current.hints_used_total + (update.hints_used || 0),
  };

  await masteryRef.update(updateData);

  return {
    ...current,
    ...updateData,
  } as ProblemMastery;
}

/**
 * Mark a problem as skipped with penalty
 */
export async function skipProblem(
  userId: string,
  problemId: string
): Promise<void> {
  const masteryRef = adminDb
    .collection('problem_mastery')
    .doc(userId)
    .collection('problems')
    .doc(problemId);

  const doc = await masteryRef.get();

  if (!doc.exists) {
    throw new Error(`Problem mastery not found: ${problemId}`);
  }

  const current = doc.data() as ProblemMastery;

  // Apply skip penalty: reduce ease factor and keep short interval
  const newEaseFactor = Math.max(1.3, current.ease_factor - 0.1);
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + 1); // Due tomorrow

  await masteryRef.update({
    ease_factor: newEaseFactor,
    next_review_at: nextReview.toISOString(),
    // Don't change review_count - skipped doesn't count as reviewed
  });
}

/**
 * Get all problems for a user (for stats)
 */
export async function getAllUserProblems(
  userId: string
): Promise<ProblemMastery[]> {
  const masteryRef = adminDb
    .collection('problem_mastery')
    .doc(userId)
    .collection('problems');

  const snapshot = await masteryRef.get();

  return snapshot.docs.map((doc) => doc.data() as ProblemMastery);
}

/**
 * Get problems by pattern
 */
export async function getProblemsByPattern(
  userId: string,
  pattern: DSAPattern
): Promise<ProblemMastery[]> {
  const masteryRef = adminDb
    .collection('problem_mastery')
    .doc(userId)
    .collection('problems');

  const snapshot = await masteryRef.where('pattern', '==', pattern).get();

  return snapshot.docs.map((doc) => doc.data() as ProblemMastery);
}

/**
 * Initialize problem mastery from a completed session
 */
export async function initializeProblemMasteryFromSession(
  userId: string,
  sessionData: {
    scenario_id: string;
    title: string;
    pattern: DSAPattern;
    difficulty: Difficulty;
    performance_score: number;
    time_spent_minutes?: number;
    hints_used?: number;
  }
): Promise<ProblemMastery> {
  const masteryRef = adminDb
    .collection('problem_mastery')
    .doc(userId)
    .collection('problems')
    .doc(sessionData.scenario_id);

  const doc = await masteryRef.get();
  const now = new Date();

  if (doc.exists) {
    // Update existing record
    return updateProblemMastery(userId, sessionData.scenario_id, {
      performance_score: sessionData.performance_score,
      time_spent_minutes: sessionData.time_spent_minutes,
      hints_used: sessionData.hints_used,
    });
  }

  // Create new record with initial review data
  const newMastery: ProblemMastery = {
    problem_id: sessionData.scenario_id,
    scenario_id: sessionData.scenario_id,
    title: sessionData.title,
    pattern: sessionData.pattern,
    difficulty: sessionData.difficulty,
    ease_factor: 2.5,
    interval_days: 1, // First interval after seeing a problem
    review_count: 1,
    next_review_at: new Date(
      now.getTime() + 24 * 60 * 60 * 1000
    ).toISOString(), // Tomorrow
    last_score: sessionData.performance_score,
    average_score: sessionData.performance_score,
    best_score: sessionData.performance_score,
    scores_history: [sessionData.performance_score],
    first_seen_at: now.toISOString(),
    last_reviewed_at: now.toISOString(),
    time_spent_minutes: sessionData.time_spent_minutes || 0,
    hints_used_total: sessionData.hints_used || 0,
    mastery_level: sessionData.performance_score >= 56 ? 'learning' : 'new',
    confidence: sessionData.performance_score >= 56 ? 30 : 10,
  };

  await masteryRef.set(newMastery);
  return newMastery;
}
