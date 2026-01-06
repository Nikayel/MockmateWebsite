/**
 * Enhanced SM-2 Spaced Repetition Algorithm
 *
 * Improvements over standard SM-2:
 * - Difficulty weighting (hard problems have shorter intervals)
 * - Streak bonus (7+ day streak increases intervals)
 * - Time decay (early reviews reduce interval growth)
 * - Performance trend (consecutive perfect scores = bonus)
 * - Forgetting curve (overdue by 2x interval resets to learning)
 */

export type Difficulty = 'easy' | 'medium' | 'hard';
export type MasteryLevel = 'new' | 'learning' | 'reviewing' | 'mastered';

export interface SM2Input {
  previousInterval: number;       // Days since last review
  previousEaseFactor: number;     // 1.3 - 2.5 (default 2.5)
  performanceScore: number;       // 0-100 performance score
  reviewCount: number;            // Total times reviewed
  lastReviewDate: Date;
  problemDifficulty: Difficulty;
  streakDays?: number;            // Current streak (optional)
  scoresHistory?: number[];       // Recent scores for trend analysis
  isEarlyReview?: boolean;        // True if reviewed before due date
  daysOverdue?: number;           // How many days past due date
}

export interface SM2Output {
  nextInterval: number;           // Days until next review
  newEaseFactor: number;          // Updated ease factor
  masteryLevel: MasteryLevel;     // Current mastery status
  confidence: number;             // 0-100 confidence score
  quality: number;                // 0-5 SM-2 quality score
}

// Difficulty weight multipliers
const DIFFICULTY_WEIGHTS: Record<Difficulty, number> = {
  easy: 1.2,
  medium: 1.0,
  hard: 0.8,
};

// Streak bonus thresholds
const STREAK_BONUS_THRESHOLD = 7;
const STREAK_BONUS_MULTIPLIER = 1.1;

// Early review penalty
const EARLY_REVIEW_MULTIPLIER = 0.7;

// Performance trend bonus (3+ consecutive perfect scores)
const PERFECT_SCORE_THRESHOLD = 86;
const CONSECUTIVE_PERFECT_BONUS = 1.15;

// Overdue threshold for reset (2x interval)
const OVERDUE_RESET_MULTIPLIER = 2;

// Max interval cap
const MAX_INTERVAL_DAYS = 180;

// Ease factor bounds (standard SM-2 uses 1.3 - 2.5)
const MIN_EASE_FACTOR = 1.3;
const MAX_EASE_FACTOR = 2.5;
const DEFAULT_EASE_FACTOR = 2.5;

/**
 * Maps performance score (0-100) to SM-2 quality rating (0-5)
 *
 * Quality mappings:
 * 0-20   → quality 0 (complete blackout)
 * 21-40  → quality 1 (incorrect but remembered something)
 * 41-55  → quality 2 (incorrect but easy to recall)
 * 56-70  → quality 3 (correct with difficulty)
 * 71-85  → quality 4 (correct with hesitation)
 * 86-100 → quality 5 (perfect response)
 */
export function mapScoreToQuality(performanceScore: number): number {
  if (performanceScore <= 20) return 0;
  if (performanceScore <= 40) return 1;
  if (performanceScore <= 55) return 2;
  if (performanceScore <= 70) return 3;
  if (performanceScore <= 85) return 4;
  return 5;
}

/**
 * Calculate confidence score based on multiple factors
 */
export function calculateConfidence(
  interval: number,
  quality: number,
  reviewCount: number,
  scoresHistory?: number[]
): number {
  let confidence = 0;

  // Base confidence from quality (0-40)
  confidence += quality * 8;

  // Interval contribution (0-30) - longer intervals = higher confidence
  const intervalScore = Math.min(30, (interval / MAX_INTERVAL_DAYS) * 30);
  confidence += intervalScore;

  // Review count contribution (0-20)
  const reviewScore = Math.min(20, reviewCount * 2);
  confidence += reviewScore;

  // Consistency bonus (0-10) - if recent scores are consistent
  if (scoresHistory && scoresHistory.length >= 3) {
    const recentScores = scoresHistory.slice(-3);
    const avgScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const variance = recentScores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / recentScores.length;
    const consistency = Math.max(0, 10 - (variance / 100));
    confidence += consistency;
  }

  return Math.min(100, Math.round(confidence));
}

/**
 * Determine mastery level based on interval and review count
 *
 * Note: reviewCount here is the NEW count AFTER the review (so first review = 1)
 *
 * Mastery progression:
 * - 'new': Never reviewed
 * - 'learning': Short intervals (< 7 days) or failed reviews
 * - 'reviewing': Medium intervals (7-20 days), building confidence
 * - 'mastered': Long intervals (21+ days), consistently good performance
 *
 * With perfect scores, typical progression:
 * - Review 1: 1 day → learning
 * - Review 2: 3 days → learning
 * - Review 3: 7-8 days → reviewing
 * - Review 4: 20+ days → mastered (if interval >= 21)
 */
export function determineMasteryLevel(
  interval: number,
  reviewCount: number,
  quality: number
): MasteryLevel {
  // Failed review = back to learning
  if (quality < 3) return 'learning';

  // Never reviewed = new (reviewCount is post-review, so 0 means never reviewed)
  if (reviewCount === 0) return 'new';

  // Based on interval thresholds (lowered from 30 to 21 for faster mastery progression)
  // 21 days = 3 weeks of consistent good performance = reasonable mastery indicator
  if (interval >= 21) return 'mastered';
  if (interval >= 7) return 'reviewing';

  // First few reviews with short intervals = still learning
  return 'learning';
}

/**
 * Apply difficulty weight to interval
 */
export function applyDifficultyWeight(interval: number, difficulty: Difficulty): number {
  return Math.round(interval * DIFFICULTY_WEIGHTS[difficulty]);
}

/**
 * Apply streak bonus to interval
 */
export function applyStreakBonus(interval: number, streakDays?: number): number {
  if (streakDays && streakDays >= STREAK_BONUS_THRESHOLD) {
    return Math.round(interval * STREAK_BONUS_MULTIPLIER);
  }
  return interval;
}

/**
 * Check if user has consecutive perfect scores
 */
export function hasConsecutivePerfectScores(scoresHistory?: number[]): boolean {
  if (!scoresHistory || scoresHistory.length < 3) return false;
  const recent = scoresHistory.slice(-3);
  return recent.every(score => score >= PERFECT_SCORE_THRESHOLD);
}

/**
 * Check if problem is severely overdue (needs reset)
 */
export function isSeverelyOverdue(daysOverdue: number, previousInterval: number): boolean {
  return daysOverdue > previousInterval * OVERDUE_RESET_MULTIPLIER;
}

/**
 * Main SM-2 calculation function with enhancements
 */
export function calculateNextInterval(input: SM2Input): SM2Output {
  const {
    previousInterval,
    previousEaseFactor,
    performanceScore,
    reviewCount,
    problemDifficulty,
    streakDays,
    scoresHistory,
    isEarlyReview,
    daysOverdue,
  } = input;

  const quality = mapScoreToQuality(performanceScore);

  // Check for severe overdue - reset to learning
  if (daysOverdue && isSeverelyOverdue(daysOverdue, previousInterval)) {
    return {
      nextInterval: 1,
      newEaseFactor: Math.max(MIN_EASE_FACTOR, previousEaseFactor - 0.15),
      masteryLevel: 'learning',
      confidence: 10,
      quality,
    };
  }

  // Failed review (quality < 3) - reset to beginning
  if (quality < 3) {
    return {
      nextInterval: 1,
      newEaseFactor: Math.max(MIN_EASE_FACTOR, previousEaseFactor - 0.2),
      masteryLevel: 'learning',
      confidence: Math.min(20, calculateConfidence(1, quality, reviewCount, scoresHistory)),
      quality,
    };
  }

  // Successful review - calculate new interval
  let interval: number;

  if (reviewCount === 0) {
    // First successful review
    interval = 1;
  } else if (reviewCount === 1) {
    // Second successful review
    interval = 3;
  } else {
    // Subsequent reviews - use SM-2 formula
    interval = Math.round(previousInterval * previousEaseFactor);
  }

  // Apply modifiers
  interval = applyDifficultyWeight(interval, problemDifficulty);
  interval = applyStreakBonus(interval, streakDays);

  // Apply early review penalty
  if (isEarlyReview) {
    interval = Math.round(interval * EARLY_REVIEW_MULTIPLIER);
  }

  // Apply consecutive perfect scores bonus
  if (hasConsecutivePerfectScores(scoresHistory)) {
    interval = Math.round(interval * CONSECUTIVE_PERFECT_BONUS);
  }

  // Cap at max interval
  interval = Math.min(interval, MAX_INTERVAL_DAYS);

  // Ensure minimum of 1 day
  interval = Math.max(1, interval);

  // Update ease factor using SM-2 formula
  let newEaseFactor = previousEaseFactor +
    (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Ensure ease factor stays within bounds (1.3 - 2.5)
  newEaseFactor = Math.max(MIN_EASE_FACTOR, Math.min(MAX_EASE_FACTOR, newEaseFactor));

  const masteryLevel = determineMasteryLevel(interval, reviewCount + 1, quality);
  const confidence = calculateConfidence(interval, quality, reviewCount + 1, scoresHistory);

  return {
    nextInterval: interval,
    newEaseFactor,
    masteryLevel,
    confidence,
    quality,
  };
}

/**
 * Calculate initial values for a new problem
 */
export function getInitialSM2State(difficulty: Difficulty): {
  easeFactor: number;
  interval: number;
  masteryLevel: MasteryLevel;
} {
  return {
    easeFactor: DEFAULT_EASE_FACTOR,
    interval: 0,
    masteryLevel: 'new',
  };
}

/**
 * Estimate retention probability based on days since last review
 * Uses Ebbinghaus forgetting curve
 */
export function estimateRetention(
  daysSinceReview: number,
  interval: number,
  reviewCount: number
): number {
  if (daysSinceReview <= 0) return 100;

  // Base retention curve (exponential decay)
  // Higher review counts and longer intervals mean slower decay
  const stability = Math.log(interval + 1) * (1 + reviewCount * 0.1);
  const retention = 100 * Math.exp(-daysSinceReview / (stability * 2));

  return Math.max(0, Math.min(100, Math.round(retention)));
}

/**
 * Calculate priority score for review scheduling
 * Higher priority = should be reviewed sooner
 */
export function calculateReviewPriority(
  daysOverdue: number,
  difficulty: Difficulty,
  lastScore: number,
  masteryLevel: MasteryLevel
): number {
  let priority = 50; // Base priority

  // Overdue boost (up to +40)
  if (daysOverdue > 0) {
    priority += Math.min(40, daysOverdue * 10);
  }

  // Difficulty boost
  const difficultyBoost = { easy: 0, medium: 5, hard: 10 };
  priority += difficultyBoost[difficulty];

  // Low last score boost (up to +20)
  if (lastScore < 70) {
    priority += (70 - lastScore) / 3;
  }

  // Mastery level adjustments
  const masteryAdjust = { new: 10, learning: 5, reviewing: 0, mastered: -10 };
  priority += masteryAdjust[masteryLevel];

  return Math.min(100, Math.max(0, Math.round(priority)));
}
