/**
 * Mastery Calculator
 *
 * Calculates aggregate mastery statistics for patterns, difficulty levels,
 * and overall user progress.
 */

import { adminDb } from '../firebase-admin';
import type { DSAPattern } from '../types/dsa-patterns';
import type { ProblemMastery } from './scheduler';
import type { Difficulty, MasteryLevel } from './sm2-algorithm';

export interface PatternMasteryStats {
  pattern: DSAPattern;
  total: number;
  mastered: number;
  reviewing: number;
  learning: number;
  new_count: number;
  average_score: number;
  mastery_percentage: number;
  weakest_problem_id?: string;
  weakest_problem_title?: string;
  strongest_problem_id?: string;
}

export interface DifficultyStats {
  difficulty: Difficulty;
  total: number;
  mastered: number;
  reviewing: number;
  learning: number;
  average_score: number;
}

export interface TrendStats {
  period: 'last_7_days' | 'last_30_days';
  reviews: number;
  average_score: number;
  new_mastered: number;
  problems_reviewed: string[];
}

export interface OverallStats {
  total_problems_seen: number;
  problems_mastered: number;
  problems_reviewing: number;
  problems_learning: number;
  problems_new: number;
  mastery_percentage: number;
  streak_days: number;
  longest_streak_days: number;
  total_reviews: number;
  average_score: number;
  total_time_minutes: number;
}

export interface UserMasteryStats {
  overall: OverallStats;
  by_pattern: PatternMasteryStats[];
  by_difficulty: DifficultyStats[];
  trends: {
    last_7_days: TrendStats;
    last_30_days: TrendStats;
  };
}

/**
 * Calculate pattern-level mastery statistics
 */
export function calculatePatternStats(
  problems: ProblemMastery[]
): PatternMasteryStats[] {
  const patternMap = new Map<DSAPattern, ProblemMastery[]>();

  // Group problems by pattern
  problems.forEach((problem) => {
    const existing = patternMap.get(problem.pattern) || [];
    existing.push(problem);
    patternMap.set(problem.pattern, existing);
  });

  const stats: PatternMasteryStats[] = [];

  patternMap.forEach((patternProblems, pattern) => {
    const mastered = patternProblems.filter(
      (p) => p.mastery_level === 'mastered'
    ).length;
    const reviewing = patternProblems.filter(
      (p) => p.mastery_level === 'reviewing'
    ).length;
    const learning = patternProblems.filter(
      (p) => p.mastery_level === 'learning'
    ).length;
    const newCount = patternProblems.filter(
      (p) => p.mastery_level === 'new'
    ).length;

    const totalScore = patternProblems.reduce(
      (sum, p) => sum + p.average_score,
      0
    );
    const averageScore = Math.round(totalScore / patternProblems.length);

    // Find weakest and strongest problems
    const sortedByScore = [...patternProblems].sort(
      (a, b) => a.average_score - b.average_score
    );
    const weakest = sortedByScore[0];
    const strongest = sortedByScore[sortedByScore.length - 1];

    stats.push({
      pattern,
      total: patternProblems.length,
      mastered,
      reviewing,
      learning,
      new_count: newCount,
      average_score: averageScore,
      mastery_percentage: Math.round((mastered / patternProblems.length) * 100),
      weakest_problem_id: weakest?.problem_id,
      weakest_problem_title: weakest?.title,
      strongest_problem_id: strongest?.problem_id,
    });
  });

  // Sort by mastery percentage (lowest first to highlight weak areas)
  return stats.sort((a, b) => a.mastery_percentage - b.mastery_percentage);
}

/**
 * Calculate difficulty-level statistics
 */
export function calculateDifficultyStats(
  problems: ProblemMastery[]
): DifficultyStats[] {
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

  return difficulties.map((difficulty) => {
    const difficultyProblems = problems.filter(
      (p) => p.difficulty === difficulty
    );

    if (difficultyProblems.length === 0) {
      return {
        difficulty,
        total: 0,
        mastered: 0,
        reviewing: 0,
        learning: 0,
        average_score: 0,
      };
    }

    const mastered = difficultyProblems.filter(
      (p) => p.mastery_level === 'mastered'
    ).length;
    const reviewing = difficultyProblems.filter(
      (p) => p.mastery_level === 'reviewing'
    ).length;
    const learning = difficultyProblems.filter(
      (p) => p.mastery_level === 'learning'
    ).length;

    const totalScore = difficultyProblems.reduce(
      (sum, p) => sum + p.average_score,
      0
    );
    const averageScore = Math.round(totalScore / difficultyProblems.length);

    return {
      difficulty,
      total: difficultyProblems.length,
      mastered,
      reviewing,
      learning,
      average_score: averageScore,
    };
  });
}

/**
 * Calculate trend statistics for a given period
 */
export function calculateTrendStats(
  problems: ProblemMastery[],
  period: 'last_7_days' | 'last_30_days'
): TrendStats {
  const now = new Date();
  const daysBack = period === 'last_7_days' ? 7 : 30;
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  // Filter problems reviewed in the period
  const recentlyReviewed = problems.filter((p) => {
    const reviewedAt = new Date(p.last_reviewed_at);
    return reviewedAt >= cutoffDate;
  });

  // Count total reviews (approximation based on review_count change would be ideal,
  // but we'll use problems reviewed as a proxy)
  const reviews = recentlyReviewed.length;

  // Calculate average score of recent reviews
  const totalScore = recentlyReviewed.reduce(
    (sum, p) => sum + p.last_score,
    0
  );
  const averageScore =
    reviews > 0 ? Math.round(totalScore / reviews) : 0;

  // Count newly mastered (would need historical data for accuracy)
  const newMastered = recentlyReviewed.filter(
    (p) => p.mastery_level === 'mastered'
  ).length;

  return {
    period,
    reviews,
    average_score: averageScore,
    new_mastered: newMastered,
    problems_reviewed: recentlyReviewed.map((p) => p.problem_id),
  };
}

/**
 * Calculate overall mastery statistics
 */
export function calculateOverallStats(
  problems: ProblemMastery[],
  streakDays: number,
  longestStreak: number
): OverallStats {
  const total = problems.length;

  if (total === 0) {
    return {
      total_problems_seen: 0,
      problems_mastered: 0,
      problems_reviewing: 0,
      problems_learning: 0,
      problems_new: 0,
      mastery_percentage: 0,
      streak_days: streakDays,
      longest_streak_days: longestStreak,
      total_reviews: 0,
      average_score: 0,
      total_time_minutes: 0,
    };
  }

  const mastered = problems.filter(
    (p) => p.mastery_level === 'mastered'
  ).length;
  const reviewing = problems.filter(
    (p) => p.mastery_level === 'reviewing'
  ).length;
  const learning = problems.filter(
    (p) => p.mastery_level === 'learning'
  ).length;
  const newCount = problems.filter((p) => p.mastery_level === 'new').length;

  const totalReviews = problems.reduce((sum, p) => sum + p.review_count, 0);
  const totalScore = problems.reduce((sum, p) => sum + p.average_score, 0);
  const totalTime = problems.reduce(
    (sum, p) => sum + p.time_spent_minutes,
    0
  );

  return {
    total_problems_seen: total,
    problems_mastered: mastered,
    problems_reviewing: reviewing,
    problems_learning: learning,
    problems_new: newCount,
    mastery_percentage: Math.round((mastered / total) * 100),
    streak_days: streakDays,
    longest_streak_days: Math.max(longestStreak, streakDays),
    total_reviews: totalReviews,
    average_score: Math.round(totalScore / total),
    total_time_minutes: Math.round(totalTime),
  };
}

/**
 * Get complete mastery statistics for a user
 */
export async function getUserMasteryStats(
  userId: string
): Promise<UserMasteryStats> {
  // Get all problem mastery records
  const masteryRef = adminDb
    .collection('problem_mastery')
    .doc(userId)
    .collection('problems');

  const snapshot = await masteryRef.get();
  const problems = snapshot.docs.map((doc) => doc.data() as ProblemMastery);

  // Get streak information from learning state
  const learningStateRef = adminDb.collection('user_learning_state').doc(userId);
  const learningStateDoc = await learningStateRef.get();
  const learningState = learningStateDoc.data();

  const streakDays = learningState?.streak_days || 0;
  const longestStreak = learningState?.longest_streak_days || streakDays;

  return {
    overall: calculateOverallStats(problems, streakDays, longestStreak),
    by_pattern: calculatePatternStats(problems),
    by_difficulty: calculateDifficultyStats(problems),
    trends: {
      last_7_days: calculateTrendStats(problems, 'last_7_days'),
      last_30_days: calculateTrendStats(problems, 'last_30_days'),
    },
  };
}

/**
 * Get weak patterns that need focus
 */
export async function getWeakPatterns(
  userId: string,
  limit: number = 3
): Promise<PatternMasteryStats[]> {
  const stats = await getUserMasteryStats(userId);

  // Filter patterns with problems and sort by mastery percentage
  return stats.by_pattern
    .filter((p) => p.total > 0 && p.mastery_percentage < 80)
    .slice(0, limit);
}

/**
 * Get patterns ready for advancement
 */
export async function getPatternsReadyForAdvancement(
  userId: string
): Promise<PatternMasteryStats[]> {
  const stats = await getUserMasteryStats(userId);

  // Patterns with high mastery that might be ready for harder problems
  return stats.by_pattern.filter(
    (p) => p.mastery_percentage >= 80 && p.total > 0
  );
}

/**
 * Update user's aggregate learning state
 */
export async function updateUserLearningStateSummary(
  userId: string
): Promise<void> {
  const stats = await getUserMasteryStats(userId);

  const learningStateRef = adminDb.collection('user_learning_state').doc(userId);

  // Build pattern mastery summary
  const patternMastery: Record<
    string,
    {
      total: number;
      mastered: number;
      average_score: number;
      weakest_problem_id?: string;
    }
  > = {};

  stats.by_pattern.forEach((pattern) => {
    patternMastery[pattern.pattern] = {
      total: pattern.total,
      mastered: pattern.mastered,
      average_score: pattern.average_score,
      weakest_problem_id: pattern.weakest_problem_id,
    };
  });

  await learningStateRef.set(
    {
      user_id: userId,
      total_problems_seen: stats.overall.total_problems_seen,
      problems_mastered: stats.overall.problems_mastered,
      problems_learning:
        stats.overall.problems_learning + stats.overall.problems_reviewing,
      pattern_mastery: patternMastery,
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Get daily goal progress
 */
export async function getDailyGoalProgress(
  userId: string
): Promise<{
  daily_goal: number;
  daily_progress: number;
  problems_today: string[];
}> {
  const learningStateRef = adminDb.collection('user_learning_state').doc(userId);
  const doc = await learningStateRef.get();
  const data = doc.data();

  const dailyGoal = data?.daily_goal || 5; // Default 5 problems per day

  // Get problems reviewed today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const masteryRef = adminDb
    .collection('problem_mastery')
    .doc(userId)
    .collection('problems');

  const snapshot = await masteryRef
    .where('last_reviewed_at', '>=', today.toISOString())
    .get();

  const problemsToday = snapshot.docs.map(
    (doc) => (doc.data() as ProblemMastery).problem_id
  );

  return {
    daily_goal: dailyGoal,
    daily_progress: problemsToday.length,
    problems_today: problemsToday,
  };
}

/**
 * Set user's daily goal
 */
export async function setDailyGoal(
  userId: string,
  goal: number
): Promise<void> {
  const learningStateRef = adminDb.collection('user_learning_state').doc(userId);

  await learningStateRef.set(
    {
      daily_goal: Math.max(1, Math.min(20, goal)), // Limit 1-20
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );
}
