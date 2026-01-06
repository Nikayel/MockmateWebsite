/**
 * FSRS (Free Spaced Repetition Scheduler) Algorithm
 *
 * Superior to SM-2 with 20-30% better efficiency.
 * Based on: https://github.com/open-spaced-repetition/fsrs4anki
 *
 * Key improvements over SM-2:
 * - 21 ML-optimized parameters
 * - Configurable desired retention (70-97%)
 * - Better handling of forgetting curves
 * - Personalization after 1000+ reviews
 */

export type FSRSRating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy
export type FSRSState = 'new' | 'learning' | 'review' | 'relearning';

export interface FSRSCard {
  // Core FSRS state
  difficulty: number;      // 0-10 (higher = harder to remember)
  stability: number;       // Days until retention drops to desired level
  state: FSRSState;

  // Review tracking
  lastReview: Date | null;
  nextReview: Date;
  reps: number;           // Total successful reviews
  lapses: number;         // Times forgotten (rated Again)

  // For analytics
  elapsedDays: number;    // Days since last review
  scheduledDays: number;  // Scheduled interval
}

export interface FSRSConfig {
  // Target retention (0.70 - 0.97, default 0.90)
  desiredRetention: number;

  // Maximum interval in days
  maximumInterval: number;

  // Learning steps in minutes
  learningSteps: number[];

  // Relearning steps in minutes
  relearningSteps: number[];

  // FSRS weights (21 parameters) - use defaults until 1000+ reviews
  weights: number[];
}

// Default FSRS parameters (trained on millions of reviews)
export const DEFAULT_FSRS_WEIGHTS: number[] = [
  0.4072,  // w0: initial stability for Again
  1.1829,  // w1: initial stability for Hard
  3.1262,  // w2: initial stability for Good
  15.4722, // w3: initial stability for Easy
  7.2102,  // w4: difficulty weight
  0.5316,  // w5: stability decay
  1.0651,  // w6: stability increase factor
  0.0046,  // w7: difficulty adjustment
  1.5418,  // w8: hard penalty
  0.1618,  // w9: easy bonus
  1.0000,  // w10: reserved
  2.1723,  // w11: hard interval factor
  0.0127,  // w12: easy interval factor
  0.2713,  // w13: stability after lapse factor
  0.0000,  // w14: reserved
  0.2315,  // w15: difficulty lower bound
  0.0000,  // w16: reserved
  2.9898,  // w17: stability increase exponent
  0.5100,  // w18: reserved
  0.2700,  // w19: reserved
  2.0000,  // w20: reserved
];

export const DEFAULT_FSRS_CONFIG: FSRSConfig = {
  desiredRetention: 0.90,
  maximumInterval: 365,
  learningSteps: [1, 10], // 1 minute, 10 minutes
  relearningSteps: [10],  // 10 minutes
  weights: DEFAULT_FSRS_WEIGHTS,
};

/**
 * Create a new FSRS card
 */
export function createFSRSCard(): FSRSCard {
  const now = new Date();
  return {
    difficulty: 0,
    stability: 0,
    state: 'new',
    lastReview: null,
    nextReview: now,
    reps: 0,
    lapses: 0,
    elapsedDays: 0,
    scheduledDays: 0,
  };
}

/**
 * Calculate retrievability (probability of recall)
 * Based on the forgetting curve formula
 */
export function calculateRetrievability(
  stability: number,
  elapsedDays: number
): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

/**
 * Calculate initial difficulty based on rating
 */
function initDifficulty(rating: FSRSRating, w: number[]): number {
  // D0(G) = w[4] - (G-3) * w[5]
  return Math.max(1, Math.min(10, w[4] - (rating - 3) * w[5]));
}

/**
 * Calculate initial stability based on rating
 */
function initStability(rating: FSRSRating, w: number[]): number {
  // S0(G) = w[G-1]
  return Math.max(0.1, w[rating - 1]);
}

/**
 * Update difficulty after review
 */
function nextDifficulty(
  currentDifficulty: number,
  rating: FSRSRating,
  w: number[]
): number {
  // D'(D,G) = D - w[6] * (G - 3)
  // Constrained to [1, 10]
  const nextD = currentDifficulty - w[6] * (rating - 3);

  // Mean reversion: D'' = w[7] * D0(3) + (1 - w[7]) * D'
  const meanD = w[7] * w[4] + (1 - w[7]) * nextD;

  return Math.max(1, Math.min(10, meanD));
}

/**
 * Calculate stability after successful recall
 */
function nextRecallStability(
  difficulty: number,
  stability: number,
  retrievability: number,
  rating: FSRSRating,
  w: number[]
): number {
  // S'_r(D,S,R,G) = S * (e^w[8] * (11-D) * S^(-w[9]) * (e^(w[10]*(1-R)) - 1) * hardPenalty * easyBonus + 1)

  const hardPenalty = rating === 2 ? w[11] : 1;
  const easyBonus = rating === 4 ? w[12] : 1;

  const innerTerm =
    Math.exp(w[8]) *
    (11 - difficulty) *
    Math.pow(stability, -w[9]) *
    (Math.exp(w[10] * (1 - retrievability)) - 1) *
    hardPenalty *
    easyBonus;

  return Math.max(0.1, stability * (innerTerm + 1));
}

/**
 * Calculate stability after lapse (forgetting)
 */
function nextForgetStability(
  difficulty: number,
  stability: number,
  retrievability: number,
  w: number[]
): number {
  // S'_f(D,S,R) = w[13] * D^(-w[14]) * ((S+1)^w[15] - 1) * e^(w[16]*(1-R))
  return Math.max(
    0.1,
    w[13] *
    Math.pow(difficulty, -w[14]) *
    (Math.pow(stability + 1, w[15]) - 1) *
    Math.exp(w[16] * (1 - retrievability))
  );
}

/**
 * Calculate next interval based on desired retention
 */
function nextInterval(
  stability: number,
  desiredRetention: number,
  maximumInterval: number
): number {
  // I(S,R) = 9 * S * (1/R - 1)
  const interval = 9 * stability * (1 / desiredRetention - 1);
  return Math.min(Math.max(1, Math.round(interval)), maximumInterval);
}

/**
 * Main FSRS scheduling function
 */
export function scheduleFSRS(
  card: FSRSCard,
  rating: FSRSRating,
  config: FSRSConfig = DEFAULT_FSRS_CONFIG
): FSRSCard {
  const now = new Date();
  const w = config.weights;

  // Calculate elapsed days since last review
  const elapsedDays = card.lastReview
    ? Math.max(0, (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Calculate current retrievability
  const retrievability = card.stability > 0
    ? calculateRetrievability(card.stability, elapsedDays)
    : 0;

  let newCard: FSRSCard = { ...card, elapsedDays };

  switch (card.state) {
    case 'new':
      newCard = handleNewCard(newCard, rating, w, config);
      break;

    case 'learning':
    case 'relearning':
      newCard = handleLearningCard(newCard, rating, w, config);
      break;

    case 'review':
      newCard = handleReviewCard(newCard, rating, retrievability, w, config);
      break;
  }

  newCard.lastReview = now;
  return newCard;
}

/**
 * Handle scheduling for new cards
 */
function handleNewCard(
  card: FSRSCard,
  rating: FSRSRating,
  w: number[],
  config: FSRSConfig
): FSRSCard {
  const now = new Date();

  // Initialize difficulty and stability
  card.difficulty = initDifficulty(rating, w);
  card.stability = initStability(rating, w);

  if (rating === 1) {
    // Again - start learning
    card.state = 'learning';
    card.lapses++;
    const stepMinutes = config.learningSteps[0] || 1;
    card.nextReview = new Date(now.getTime() + stepMinutes * 60 * 1000);
    card.scheduledDays = 0;
  } else if (rating === 2) {
    // Hard - learning with longer step
    card.state = 'learning';
    const stepMinutes = config.learningSteps[1] || config.learningSteps[0] || 10;
    card.nextReview = new Date(now.getTime() + stepMinutes * 60 * 1000);
    card.scheduledDays = 0;
  } else {
    // Good or Easy - graduate to review
    card.state = 'review';
    card.reps++;
    const interval = nextInterval(card.stability, config.desiredRetention, config.maximumInterval);
    card.scheduledDays = interval;
    card.nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
  }

  return card;
}

/**
 * Handle scheduling for learning/relearning cards
 */
function handleLearningCard(
  card: FSRSCard,
  rating: FSRSRating,
  w: number[],
  config: FSRSConfig
): FSRSCard {
  const now = new Date();
  const steps = card.state === 'learning'
    ? config.learningSteps
    : config.relearningSteps;

  if (rating === 1) {
    // Again - reset to first step
    card.lapses++;
    const stepMinutes = steps[0] || 1;
    card.nextReview = new Date(now.getTime() + stepMinutes * 60 * 1000);
    card.scheduledDays = 0;
  } else if (rating === 2) {
    // Hard - repeat current step
    const stepMinutes = steps[0] || 10;
    card.nextReview = new Date(now.getTime() + stepMinutes * 60 * 1000);
    card.scheduledDays = 0;
  } else {
    // Good or Easy - graduate to review
    card.state = 'review';
    card.reps++;
    card.difficulty = nextDifficulty(card.difficulty, rating, w);

    // Easy gets bonus stability
    if (rating === 4) {
      card.stability *= 1.3;
    }

    const interval = nextInterval(card.stability, config.desiredRetention, config.maximumInterval);
    card.scheduledDays = interval;
    card.nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
  }

  return card;
}

/**
 * Handle scheduling for review cards
 */
function handleReviewCard(
  card: FSRSCard,
  rating: FSRSRating,
  retrievability: number,
  w: number[],
  config: FSRSConfig
): FSRSCard {
  const now = new Date();

  // Update difficulty
  card.difficulty = nextDifficulty(card.difficulty, rating, w);

  if (rating === 1) {
    // Again - lapse, go to relearning
    card.state = 'relearning';
    card.lapses++;
    card.stability = nextForgetStability(card.difficulty, card.stability, retrievability, w);

    const stepMinutes = config.relearningSteps[0] || 10;
    card.nextReview = new Date(now.getTime() + stepMinutes * 60 * 1000);
    card.scheduledDays = 0;
  } else {
    // Successful recall - update stability and schedule
    card.reps++;
    card.stability = nextRecallStability(
      card.difficulty,
      card.stability,
      retrievability,
      rating,
      w
    );

    const interval = nextInterval(card.stability, config.desiredRetention, config.maximumInterval);
    card.scheduledDays = interval;
    card.nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
  }

  return card;
}

/**
 * Map performance score (0-100) to FSRS rating
 */
export function mapPerformanceToFSRSRating(
  score: number,
  hintsUsed: number,
  timeRatio: number // actual time / expected time
): FSRSRating {
  // Again (1): Failed badly
  if (score < 40 || hintsUsed > 3) return 1;

  // Hard (2): Struggled significantly
  if (score < 60 || hintsUsed > 1 || timeRatio > 2.0) return 2;

  // Good (3): Solved with some effort
  if (score < 85 || hintsUsed > 0 || timeRatio > 1.3) return 3;

  // Easy (4): Solved quickly and correctly
  return 4;
}

/**
 * Get human-readable description of rating
 */
export function getRatingDescription(rating: FSRSRating): string {
  switch (rating) {
    case 1: return 'Again - Need to relearn';
    case 2: return 'Hard - Struggled but got it';
    case 3: return 'Good - Solved with effort';
    case 4: return 'Easy - Solved quickly';
  }
}

/**
 * Calculate estimated retention for a card
 */
export function getEstimatedRetention(card: FSRSCard): number {
  if (card.state === 'new') return 0;

  const now = new Date();
  const daysSinceReview = card.lastReview
    ? (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24)
    : 0;

  return calculateRetrievability(card.stability, daysSinceReview) * 100;
}

/**
 * Determine if card is due for review
 */
export function isDue(card: FSRSCard): boolean {
  const now = new Date();
  return card.nextReview <= now;
}

/**
 * Get days until next review (negative if overdue)
 */
export function getDaysUntilReview(card: FSRSCard): number {
  const now = new Date();
  const diff = card.nextReview.getTime() - now.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calculate review priority (higher = more urgent)
 */
export function getReviewPriority(card: FSRSCard): number {
  const daysUntil = getDaysUntilReview(card);

  // Overdue items get highest priority
  if (daysUntil < 0) {
    return 100 + Math.min(50, Math.abs(daysUntil) * 5);
  }

  // Due today
  if (daysUntil === 0) {
    return 80;
  }

  // Factor in difficulty and lapses
  const difficultyBonus = card.difficulty * 2;
  const lapseBonus = Math.min(20, card.lapses * 5);

  // Lower priority for items due later
  const duePenalty = Math.min(60, daysUntil * 10);

  return Math.max(0, 50 + difficultyBonus + lapseBonus - duePenalty);
}

/**
 * Batch schedule multiple cards and return sorted by priority
 */
export function getDueCards(
  cards: Array<{ id: string; card: FSRSCard }>,
  limit?: number
): Array<{ id: string; card: FSRSCard; priority: number }> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const dueCards = cards
    .filter(({ card }) => card.nextReview <= tomorrow)
    .map(({ id, card }) => ({
      id,
      card,
      priority: getReviewPriority(card),
    }))
    .sort((a, b) => b.priority - a.priority);

  return limit ? dueCards.slice(0, limit) : dueCards;
}

/**
 * Calculate overall mastery level based on card state
 *
 * Aligned with SM-2 mastery thresholds for consistency:
 * - 'new': Never reviewed
 * - 'learning': In learning/relearning phase
 * - 'familiar': Medium intervals (7-20 days scheduled), building confidence
 * - 'mastered': Long intervals (21+ days scheduled), consistently good performance
 *
 * Uses scheduledDays (next interval) rather than stability directly,
 * since that's what determines when the user will next see the problem.
 *
 * Typical FSRS progression with "Good" ratings:
 * - Review 1: ~1 day interval → learning → familiar
 * - Review 2: ~3-4 day interval → familiar
 * - Review 3: ~7-10 day interval → familiar
 * - Review 4: ~21+ day interval → mastered
 */
export function getMasteryLevel(card: FSRSCard): 'new' | 'learning' | 'familiar' | 'mastered' {
  if (card.state === 'new') return 'new';
  if (card.state === 'learning' || card.state === 'relearning') return 'learning';

  // Use interval-based thresholds (aligned with SM-2's 21-day mastery threshold)
  // This ensures consistent mastery progression regardless of algorithm assignment
  const interval = card.scheduledDays;

  // Mastered: 21+ day intervals indicate strong long-term retention
  // Also require at least 3 successful reps to prevent gaming
  if (interval >= 21 && card.reps >= 3) return 'mastered';

  return 'familiar';
}

/**
 * Get confidence percentage (0-100)
 */
export function getConfidence(card: FSRSCard): number {
  if (card.state === 'new') return 0;

  // Base confidence from stability
  const stabilityScore = Math.min(40, (card.stability / 60) * 40);

  // Rep count contribution
  const repScore = Math.min(30, card.reps * 3);

  // Current retention estimate
  const retention = getEstimatedRetention(card);
  const retentionScore = (retention / 100) * 20;

  // Penalty for lapses
  const lapsePenalty = Math.min(20, card.lapses * 5);

  return Math.round(Math.max(0, Math.min(100,
    stabilityScore + repScore + retentionScore - lapsePenalty
  )));
}
