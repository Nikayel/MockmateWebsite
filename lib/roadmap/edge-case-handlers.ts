/**
 * Edge Case Handlers for Roadmap
 *
 * Handles all the edge cases and scenarios that can occur
 * during interview preparation.
 */

import { PersonalizedRoadmap, DailyPlan } from '@/lib/data/company-questions/types';
import { DSAPattern } from '@/lib/types/dsa-patterns';

/**
 * Roadmap health status
 */
export type RoadmapHealth =
  | 'healthy'
  | 'slightly_behind'
  | 'significantly_behind'
  | 'ahead'
  | 'struggling'
  | 'inactive'
  | 'cramming'
  | 'expired'
  | 'completed';

/**
 * Intervention type
 */
export type InterventionType =
  | 'none'
  | 'gentle_nudge'
  | 'catch_up_mode'
  | 'difficulty_adjustment'
  | 'pattern_focus'
  | 're_engagement'
  | 'celebration'
  | 'final_review';

/**
 * User struggle indicators
 */
export interface StruggleIndicators {
  consecutiveLowScores: number;
  patternFailStreak: Map<DSAPattern, number>;
  skippedInARow: number;
  averageScore: number;
  hintUsageRate: number;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  health: RoadmapHealth;
  intervention: InterventionType;
  message: string;
  suggestions: string[];
  adjustments: RoadmapAdjustments;
}

/**
 * Adjustments to apply to roadmap
 */
export interface RoadmapAdjustments {
  difficultyOverride?: 'easy' | 'medium' | null;
  filterToMustKnows?: boolean;
  dailyTargetMultiplier?: number;
  enableTutorialMode?: boolean;
  skipHardProblems?: boolean;
  focusPatterns?: DSAPattern[];
  showWorkedExamples?: boolean;
}

/**
 * Check roadmap health and determine intervention
 */
export function checkRoadmapHealth(
  roadmap: PersonalizedRoadmap,
  struggleIndicators: StruggleIndicators,
  lastSessionDate: Date | null
): HealthCheckResult {
  const now = new Date();
  const interviewDate = new Date(roadmap.interviewDate);
  const daysRemaining = Math.ceil(
    (interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Check expired
  if (daysRemaining < 0) {
    return handleExpired(roadmap);
  }

  // Check completed
  if (roadmap.questionsCompleted >= roadmap.totalQuestions) {
    return handleCompleted(roadmap, daysRemaining);
  }

  // Check inactive
  if (lastSessionDate) {
    const daysSinceSession = Math.floor(
      (now.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceSession >= 7) {
      return handleInactive(roadmap, daysSinceSession);
    }
  }

  // Check struggling
  if (isStruggling(struggleIndicators)) {
    return handleStruggling(roadmap, struggleIndicators);
  }

  // Check progress status
  const expectedProgress = getExpectedProgress(roadmap, daysRemaining);
  const actualProgress = roadmap.questionsCompleted / roadmap.totalQuestions;
  const progressDiff = actualProgress - expectedProgress;

  if (progressDiff < -0.15) {
    return handleSignificantlyBehind(roadmap, daysRemaining, progressDiff);
  }

  if (progressDiff < -0.05) {
    return handleSlightlyBehind(roadmap, daysRemaining);
  }

  if (progressDiff > 0.15) {
    return handleAhead(roadmap, daysRemaining);
  }

  // Check cramming (close to interview with lots to do)
  if (daysRemaining <= 3 && actualProgress < 0.8) {
    return handleCramming(roadmap, daysRemaining);
  }

  // Final review mode
  if (daysRemaining <= 2) {
    return handleFinalReview(roadmap, daysRemaining);
  }

  // All good
  return {
    health: 'healthy',
    intervention: 'none',
    message: "You're on track! Keep up the great work.",
    suggestions: [],
    adjustments: {},
  };
}

/**
 * Check if user is struggling
 */
function isStruggling(indicators: StruggleIndicators): boolean {
  return (
    indicators.consecutiveLowScores >= 3 ||
    indicators.skippedInARow >= 5 ||
    indicators.averageScore < 40 ||
    indicators.hintUsageRate > 0.8
  );
}

/**
 * Get expected progress at this point
 */
function getExpectedProgress(
  roadmap: PersonalizedRoadmap,
  daysRemaining: number
): number {
  const totalDays = roadmap.assessment.daysRemaining;
  const daysElapsed = totalDays - daysRemaining;
  return Math.min(1, daysElapsed / totalDays);
}

/**
 * Handle expired roadmap
 */
function handleExpired(roadmap: PersonalizedRoadmap): HealthCheckResult {
  const progress = Math.round(
    (roadmap.questionsCompleted / roadmap.totalQuestions) * 100
  );

  return {
    health: 'expired',
    intervention: 'none',
    message: `Your interview date has passed. You completed ${progress}% of your roadmap.`,
    suggestions: [
      'Archive this roadmap and create a new one',
      'Review what you learned for future interviews',
      "If you have another interview coming, start fresh!"
    ],
    adjustments: {},
  };
}

/**
 * Handle completed roadmap
 */
function handleCompleted(
  roadmap: PersonalizedRoadmap,
  daysRemaining: number
): HealthCheckResult {
  const suggestions: string[] = [];

  if (daysRemaining > 0) {
    suggestions.push('Practice mock interviews to stay sharp');
    suggestions.push('Review your weakest patterns');
    suggestions.push(`${daysRemaining} days to rest and prepare mentally`);
  } else {
    suggestions.push('You did it! Now go ace that interview!');
  }

  return {
    health: 'completed',
    intervention: 'celebration',
    message: `Congratulations! You completed your entire ${roadmap.companyName} roadmap!`,
    suggestions,
    adjustments: {},
  };
}

/**
 * Handle inactive user (7+ days without practice)
 */
function handleInactive(
  roadmap: PersonalizedRoadmap,
  daysSinceSession: number
): HealthCheckResult {
  return {
    health: 'inactive',
    intervention: 're_engagement',
    message: `Welcome back! It's been ${daysSinceSession} days since your last session.`,
    suggestions: [
      "Let's start with an easy warm-up problem",
      'No pressure - pick up where you left off',
      'Consider adjusting your daily target if needed'
    ],
    adjustments: {
      difficultyOverride: 'easy', // Start easy after break
      dailyTargetMultiplier: 0.7, // Reduce expectations
      showWorkedExamples: true,
    },
  };
}

/**
 * Handle struggling user
 */
function handleStruggling(
  roadmap: PersonalizedRoadmap,
  indicators: StruggleIndicators
): HealthCheckResult {
  // Find which pattern is causing issues
  let worstPattern: DSAPattern | null = null;
  let maxFails = 0;

  for (const [pattern, fails] of indicators.patternFailStreak) {
    if (fails > maxFails) {
      maxFails = fails;
      worstPattern = pattern;
    }
  }

  const suggestions: string[] = [
    'Take a breath - struggling means you\'re learning!',
    'Try watching solution explanations before attempting',
  ];

  if (worstPattern) {
    suggestions.push(`Let's focus on building ${formatPattern(worstPattern)} fundamentals`);
  }

  if (indicators.consecutiveLowScores >= 3) {
    suggestions.push('Consider stepping down to easier problems temporarily');
  }

  return {
    health: 'struggling',
    intervention: 'difficulty_adjustment',
    message: "You're facing some tough problems. Let's adjust the approach.",
    suggestions,
    adjustments: {
      difficultyOverride: 'easy',
      enableTutorialMode: true,
      showWorkedExamples: true,
      skipHardProblems: true,
      focusPatterns: worstPattern ? [worstPattern] : undefined,
    },
  };
}

/**
 * Handle significantly behind schedule
 */
function handleSignificantlyBehind(
  roadmap: PersonalizedRoadmap,
  daysRemaining: number,
  progressDiff: number
): HealthCheckResult {
  const behindBy = Math.round(Math.abs(progressDiff) * 100);

  const suggestions: string[] = [];

  if (daysRemaining > 7) {
    suggestions.push('Focus on must-know questions for this company');
    suggestions.push('Consider increasing daily study time if possible');
    suggestions.push("Quality > quantity - it's better to master fewer patterns");
  } else {
    suggestions.push('Prioritize the highest-value problems only');
    suggestions.push('Skip advanced patterns and focus on fundamentals');
    suggestions.push('Make sure to get enough rest too!');
  }

  return {
    health: 'significantly_behind',
    intervention: 'catch_up_mode',
    message: `You're about ${behindBy}% behind schedule. Let's prioritize what matters most.`,
    suggestions,
    adjustments: {
      filterToMustKnows: true,
      skipHardProblems: daysRemaining <= 7,
      dailyTargetMultiplier: 0.7, // Focus on quality
      difficultyOverride: 'medium',
    },
  };
}

/**
 * Handle slightly behind schedule
 */
function handleSlightlyBehind(
  roadmap: PersonalizedRoadmap,
  daysRemaining: number
): HealthCheckResult {
  return {
    health: 'slightly_behind',
    intervention: 'gentle_nudge',
    message: "You're slightly behind schedule, but easily recoverable!",
    suggestions: [
      'Try to complete one extra problem today',
      'Consider a focused study session this weekend',
      'You\'ve got this!'
    ],
    adjustments: {},
  };
}

/**
 * Handle ahead of schedule
 */
function handleAhead(
  roadmap: PersonalizedRoadmap,
  daysRemaining: number
): HealthCheckResult {
  return {
    health: 'ahead',
    intervention: 'none',
    message: "Excellent progress! You're ahead of schedule.",
    suggestions: [
      'Consider tackling some harder problems',
      'Deep dive into your weakest patterns',
      'Try timed mock interviews'
    ],
    adjustments: {},
  };
}

/**
 * Handle cramming (close to interview with lots to do)
 */
function handleCramming(
  roadmap: PersonalizedRoadmap,
  daysRemaining: number
): HealthCheckResult {
  return {
    health: 'cramming',
    intervention: 'catch_up_mode',
    message: `Only ${daysRemaining} days left. Let's maximize what you can learn.`,
    suggestions: [
      'Focus ONLY on must-know problems',
      'Skip hard problems - medium is enough',
      'Review patterns you already know',
      'Get good sleep - it helps retention!'
    ],
    adjustments: {
      filterToMustKnows: true,
      skipHardProblems: true,
      difficultyOverride: 'medium',
      dailyTargetMultiplier: 0.6,
    },
  };
}

/**
 * Handle final review mode
 */
function handleFinalReview(
  roadmap: PersonalizedRoadmap,
  daysRemaining: number
): HealthCheckResult {
  const isIntern = roadmap.assessment.experienceLevel === 'intern';

  const suggestions = isIntern
    ? [
        'Practice explaining your thought process out loud',
        'Review completed problems, don\'t try new ones',
        'Focus on communication - it matters for interns!',
        'Get plenty of sleep tonight'
      ]
    : [
        'Light review of must-know problems',
        "Don't learn anything new",
        'Review your strongest patterns for confidence',
        'Rest and prepare mentally'
      ];

  return {
    health: 'healthy',
    intervention: 'final_review',
    message: daysRemaining === 0
      ? 'Interview day! You\'ve prepared well. Trust yourself!'
      : `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} until your interview. Focus on rest and confidence.`,
    suggestions,
    adjustments: {
      skipHardProblems: true,
      filterToMustKnows: true,
      dailyTargetMultiplier: 0.3,
    },
  };
}

/**
 * Calculate struggle indicators from roadmap data
 */
export function calculateStruggleIndicators(
  roadmap: PersonalizedRoadmap,
  recentScores: number[],
  recentHintsUsed: number[],
  recentStatuses: Array<'completed' | 'skipped'>
): StruggleIndicators {
  // Count consecutive low scores (< 50)
  let consecutiveLowScores = 0;
  for (let i = recentScores.length - 1; i >= 0; i--) {
    if (recentScores[i] < 50) {
      consecutiveLowScores++;
    } else {
      break;
    }
  }

  // Count skipped in a row
  let skippedInARow = 0;
  for (let i = recentStatuses.length - 1; i >= 0; i--) {
    if (recentStatuses[i] === 'skipped') {
      skippedInARow++;
    } else {
      break;
    }
  }

  // Average score
  const averageScore = recentScores.length > 0
    ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
    : 0;

  // Hint usage rate
  const totalAttempts = recentScores.length;
  const attemptsWithHints = recentHintsUsed.filter(h => h > 0).length;
  const hintUsageRate = totalAttempts > 0 ? attemptsWithHints / totalAttempts : 0;

  // Pattern fail streaks (simplified - would need more data)
  const patternFailStreak = new Map<DSAPattern, number>();

  return {
    consecutiveLowScores,
    patternFailStreak,
    skippedInARow,
    averageScore,
    hintUsageRate,
  };
}

/**
 * Apply adjustments to a daily plan
 */
export function applyAdjustments(
  plan: DailyPlan,
  adjustments: RoadmapAdjustments,
  mustKnowIds: Set<string>
): DailyPlan {
  let questions = [...plan.questions];

  // Filter to must-knows if needed
  if (adjustments.filterToMustKnows) {
    const mustKnows = questions.filter(q => mustKnowIds.has(q.scenarioId));
    if (mustKnows.length > 0) {
      questions = mustKnows;
    }
  }

  // Apply difficulty override
  if (adjustments.difficultyOverride) {
    questions = questions.filter(
      q => q.difficulty === adjustments.difficultyOverride ||
           q.difficulty === 'easy' // Always allow easy
    );
  }

  // Skip hard problems
  if (adjustments.skipHardProblems) {
    questions = questions.filter(q => q.difficulty !== 'hard');
  }

  // Apply daily target multiplier
  if (adjustments.dailyTargetMultiplier) {
    const targetCount = Math.ceil(questions.length * adjustments.dailyTargetMultiplier);
    questions = questions.slice(0, targetCount);
  }

  // Focus on specific patterns
  if (adjustments.focusPatterns && adjustments.focusPatterns.length > 0) {
    const focused = questions.filter(q =>
      adjustments.focusPatterns!.includes(q.pattern as DSAPattern)
    );
    if (focused.length > 0) {
      questions = focused;
    }
  }

  return {
    ...plan,
    questions,
    targetMinutes: questions.reduce((sum, q) => sum + q.estimatedMinutes, 0),
  };
}

/**
 * Get motivational message based on health
 */
export function getMotivationalMessage(health: RoadmapHealth): string {
  const messages: Record<RoadmapHealth, string[]> = {
    healthy: [
      "You're crushing it! Keep going!",
      "Consistency is key, and you've got it!",
      "Every problem solved is a step closer!"
    ],
    slightly_behind: [
      "A small push today gets you back on track!",
      "You've got this - one extra problem makes a difference!",
      "Progress, not perfection!"
    ],
    significantly_behind: [
      "It's not about speed, it's about direction.",
      "Focus on what matters most - you can do this!",
      "Quality practice beats quantity every time."
    ],
    ahead: [
      "Excellent work! You're setting yourself up for success!",
      "This is what preparation looks like!",
      "Your future self will thank you!"
    ],
    struggling: [
      "Struggling means you're learning something new!",
      "Every expert was once a beginner.",
      "Take a break, come back stronger!"
    ],
    inactive: [
      "Welcome back! Let's pick up where we left off.",
      "No judgment here - let's get started!",
      "The best time to practice was yesterday. The second best is now!"
    ],
    cramming: [
      "Focus on the essentials - you know more than you think!",
      "Trust your preparation!",
      "You've got this!"
    ],
    expired: [
      "Every practice session was valuable experience!",
      "Ready for the next opportunity!",
      "Learning never goes to waste."
    ],
    completed: [
      "You did it! Time to show what you've learned!",
      "Preparation complete! Go ace that interview!",
      "You're ready for this!"
    ]
  };

  const options = messages[health];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Format pattern name
 */
function formatPattern(pattern: DSAPattern): string {
  return pattern
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Determine if user should get a difficulty upgrade
 */
export function shouldUpgradeDifficulty(
  experienceLevel: 'intern' | 'beginner' | 'intermediate' | 'advanced',
  recentScores: number[],
  currentDifficulty: 'easy' | 'medium' | 'hard',
  daysRemaining: number,
  patternsMastered: number
): { upgrade: boolean; newDifficulty: 'easy' | 'medium' | 'hard'; reason: string } {
  // Interns have special rules
  if (experienceLevel === 'intern') {
    if (currentDifficulty === 'hard') {
      return { upgrade: false, newDifficulty: 'medium', reason: 'Hard not recommended for interns' };
    }
    if (currentDifficulty === 'medium') {
      // Only upgrade intern to hard if exceptional
      const avgScore = recentScores.length > 0
        ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
        : 0;
      if (avgScore >= 85 && patternsMastered >= 5 && daysRemaining >= 30) {
        return { upgrade: true, newDifficulty: 'hard', reason: 'Exceptional performance - ready for challenge' };
      }
      return { upgrade: false, newDifficulty: 'medium', reason: 'Focus on medium for interview prep' };
    }
  }

  // Calculate average of recent scores
  const avgScore = recentScores.length > 0
    ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
    : 0;

  // Upgrade conditions
  if (avgScore >= 80 && recentScores.length >= 3) {
    if (currentDifficulty === 'easy') {
      return { upgrade: true, newDifficulty: 'medium', reason: 'Consistently solving easy problems' };
    }
    if (currentDifficulty === 'medium' && experienceLevel !== 'beginner') {
      return { upgrade: true, newDifficulty: 'hard', reason: 'Ready for harder challenges' };
    }
  }

  return { upgrade: false, newDifficulty: currentDifficulty, reason: 'Current level appropriate' };
}

/**
 * Determine if user should get a difficulty downgrade
 */
export function shouldDowngradeDifficulty(
  recentScores: number[],
  currentDifficulty: 'easy' | 'medium' | 'hard',
  consecutiveFailures: number
): { downgrade: boolean; newDifficulty: 'easy' | 'medium' | 'hard'; reason: string } {
  if (currentDifficulty === 'easy') {
    return { downgrade: false, newDifficulty: 'easy', reason: 'Already at easiest level' };
  }

  // Check for consistent struggle
  if (consecutiveFailures >= 3) {
    const newDiff = currentDifficulty === 'hard' ? 'medium' : 'easy';
    return { downgrade: true, newDifficulty: newDiff, reason: 'Struggling at current level' };
  }

  const avgScore = recentScores.length > 0
    ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
    : 50;

  if (avgScore < 40 && recentScores.length >= 3) {
    const newDiff = currentDifficulty === 'hard' ? 'medium' : 'easy';
    return { downgrade: true, newDifficulty: newDiff, reason: 'Low average score' };
  }

  return { downgrade: false, newDifficulty: currentDifficulty, reason: 'Current level appropriate' };
}
