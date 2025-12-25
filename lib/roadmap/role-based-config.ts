/**
 * Role-Based Configuration for Interview Preparation
 *
 * Defines difficulty gates, pattern priorities, and interview
 * expectations for each experience level.
 */

import { DSAPattern } from '@/lib/types/dsa-patterns';

/**
 * Experience levels
 */
export type ExperienceLevel = 'intern' | 'beginner' | 'intermediate' | 'advanced';

/**
 * Role-based difficulty configuration
 */
export interface RoleDifficultyConfig {
  // Difficulty distribution (should sum to 100)
  distribution: {
    easy: number;
    medium: number;
    hard: number;
  };

  // When can they access hard problems?
  hardProblemGates: {
    minDaysRemaining: number;
    minPatternsMastered: number;
    minProblemsSolved: number;
    minMediumSuccessRate: number;
  };

  // Time multiplier (how much longer they need)
  timeMultiplier: number;

  // Minimum problems per pattern for coverage
  minProblemsPerPattern: number;

  // Focus areas for interviews
  focusAreas: {
    communication: 'low' | 'medium' | 'high';
    optimization: 'low' | 'medium' | 'high';
    codeQuality: 'low' | 'medium' | 'high';
    edgeCases: 'low' | 'medium' | 'high';
    systemDesign: 'none' | 'basic' | 'moderate' | 'advanced';
  };
}

/**
 * Intern-specific pattern priorities
 * These are the patterns most commonly asked in intern interviews
 */
export const INTERN_PRIORITY_PATTERNS: DSAPattern[] = [
  'arrays-hashing',
  'two-pointers',
  'sliding-window',
  'binary-search',
  'stack',
  'trees',
  'string',
  'linked-list',
];

/**
 * Patterns to AVOID or minimize for interns
 */
export const INTERN_AVOID_PATTERNS: DSAPattern[] = [
  'dp-2d',
  'dp-tree',
  'dp-knapsack',
  'dp-lcs',
  'dijkstra',
  'topological-sort',
  'union-find',
  'trie',
  'segment-tree',
  'bit-manipulation',
];

/**
 * Role configurations
 */
export const ROLE_CONFIGS: Record<ExperienceLevel, RoleDifficultyConfig> = {
  intern: {
    distribution: {
      easy: 40,
      medium: 55,
      hard: 5, // Only after significant progress
    },
    hardProblemGates: {
      minDaysRemaining: 30,
      minPatternsMastered: 5,
      minProblemsSolved: 50,
      minMediumSuccessRate: 0.85,
    },
    timeMultiplier: 1.5, // 50% more time needed
    minProblemsPerPattern: 6,
    focusAreas: {
      communication: 'high',   // Critical for interns
      optimization: 'low',     // Correct > optimal
      codeQuality: 'medium',
      edgeCases: 'medium',
      systemDesign: 'none',
    },
  },

  beginner: {
    distribution: {
      easy: 25,
      medium: 60,
      hard: 15,
    },
    hardProblemGates: {
      minDaysRemaining: 21,
      minPatternsMastered: 4,
      minProblemsSolved: 30,
      minMediumSuccessRate: 0.75,
    },
    timeMultiplier: 1.3,
    minProblemsPerPattern: 5,
    focusAreas: {
      communication: 'high',
      optimization: 'medium',
      codeQuality: 'medium',
      edgeCases: 'medium',
      systemDesign: 'none',
    },
  },

  intermediate: {
    distribution: {
      easy: 15,
      medium: 55,
      hard: 30,
    },
    hardProblemGates: {
      minDaysRemaining: 14,
      minPatternsMastered: 3,
      minProblemsSolved: 20,
      minMediumSuccessRate: 0.65,
    },
    timeMultiplier: 1.0,
    minProblemsPerPattern: 3,
    focusAreas: {
      communication: 'medium',
      optimization: 'high',
      codeQuality: 'high',
      edgeCases: 'high',
      systemDesign: 'basic',
    },
  },

  advanced: {
    distribution: {
      easy: 5,
      medium: 45,
      hard: 50,
    },
    hardProblemGates: {
      minDaysRemaining: 7,
      minPatternsMastered: 2,
      minProblemsSolved: 10,
      minMediumSuccessRate: 0.50,
    },
    timeMultiplier: 0.8,
    minProblemsPerPattern: 2,
    focusAreas: {
      communication: 'medium',
      optimization: 'high',
      codeQuality: 'high',
      edgeCases: 'high',
      systemDesign: 'advanced',
    },
  },
};

/**
 * Company-specific intern interview data
 */
export interface InternInterviewData {
  companyId: string;
  typicalPatterns: DSAPattern[];
  difficultyExpectation: 'easy-medium' | 'medium' | 'medium-hard';
  behavioralWeight: 'low' | 'medium' | 'high';
  internTips: string[];
  typicalQuestions: string[];
  whatTheyLookFor: string[];
  redFlags: string[];
}

export const INTERN_COMPANY_DATA: Record<string, InternInterviewData> = {
  amazon: {
    companyId: 'amazon',
    typicalPatterns: ['arrays-hashing', 'trees', 'string', 'two-pointers', 'bfs'],
    difficultyExpectation: 'easy-medium',
    behavioralWeight: 'high', // LP questions for interns too
    internTips: [
      'Amazon asks Leadership Principle questions even for interns',
      'Prepare 2-3 STAR stories about teamwork, problem-solving, ownership',
      'The online assessment (OA) is often the first step - practice on HackerRank',
      'Focus on clear communication - explain your approach before coding',
      'Amazon intern interviews rarely include hard problems',
    ],
    typicalQuestions: [
      'Two Sum',
      'Merge Two Sorted Lists',
      'Valid Parentheses',
      'Number of Islands (BFS approach)',
      'Binary Tree Level Order Traversal',
    ],
    whatTheyLookFor: [
      'Clear problem-solving approach',
      'Ability to break down problems',
      'Code that works (correctness > optimization)',
      'Communication throughout the process',
      'Ownership mindset (LP: Ownership)',
    ],
    redFlags: [
      "Jumping into code without clarifying requirements",
      'Not testing with examples',
      'Unable to explain thought process',
      'Giving up when stuck instead of asking clarifying questions',
    ],
  },

  google: {
    companyId: 'google',
    typicalPatterns: ['arrays-hashing', 'binary-search', 'trees', 'string', 'two-pointers'],
    difficultyExpectation: 'medium',
    behavioralWeight: 'medium',
    internTips: [
      'Google intern interviews focus heavily on algorithmic thinking',
      'Practice coding in Google Docs - no IDE features!',
      'They value your thought process more than the final answer',
      'Interviewers are usually friendly and will give hints',
      'Expect questions about time/space complexity',
    ],
    typicalQuestions: [
      'Two Sum',
      'Valid Palindrome',
      'Binary Search variants',
      'Tree traversals',
      'String manipulation',
    ],
    whatTheyLookFor: [
      'Clean, readable code',
      'Strong algorithmic fundamentals',
      'Ability to think through edge cases',
      'Communication and collaboration',
      'Intellectual curiosity',
    ],
    redFlags: [
      'Messy, unreadable code',
      'Not discussing complexity',
      'Silent coding without explanation',
      'Not asking clarifying questions',
    ],
  },

  meta: {
    companyId: 'meta',
    typicalPatterns: ['arrays-hashing', 'trees', 'string', 'two-pointers', 'sliding-window'],
    difficultyExpectation: 'medium',
    behavioralWeight: 'medium',
    internTips: [
      'Meta expects faster problem-solving - practice timed coding',
      'They use CoderPad with syntax highlighting (easier than Google Docs)',
      'Focus on getting a working solution first, then optimize',
      'Be ready to trace through your code with examples',
      'Meta values practical problem-solving ability',
    ],
    typicalQuestions: [
      'Valid Palindrome II',
      'Binary Tree traversals',
      'String manipulation',
      'Array problems',
      'Two pointers problems',
    ],
    whatTheyLookFor: [
      'Speed and efficiency',
      'Working code that handles edge cases',
      'Clear communication',
      'Practical problem-solving',
      'Ability to work under time pressure',
    ],
    redFlags: [
      'Taking too long to start coding',
      'Not finishing the problem',
      'Code that doesn\'t run',
      'Unable to trace through examples',
    ],
  },

  microsoft: {
    companyId: 'microsoft',
    typicalPatterns: ['arrays-hashing', 'trees', 'linked-list', 'string', 'sorting'],
    difficultyExpectation: 'easy-medium',
    behavioralWeight: 'medium',
    internTips: [
      'Microsoft values Growth Mindset - show you love learning',
      'They appreciate clean, well-structured code',
      'Intern interviews are generally more relaxed than other FAANG',
      'Be ready to discuss past projects and what you learned',
      'They may use whiteboard, IDE, or paper',
    ],
    typicalQuestions: [
      'Reverse Linked List',
      'Two Sum',
      'Valid Parentheses',
      'Tree traversals',
      'String problems',
    ],
    whatTheyLookFor: [
      'Growth mindset and love of learning',
      'Clean, readable code',
      'Problem-solving approach',
      'Collaboration and teamwork',
      'Curiosity and passion for technology',
    ],
    redFlags: [
      'Fixed mindset - not open to feedback',
      'Arrogance or dismissiveness',
      'Sloppy code',
      'Not asking questions',
    ],
  },

  apple: {
    companyId: 'apple',
    typicalPatterns: ['arrays-hashing', 'linked-list', 'trees', 'string', 'sorting'],
    difficultyExpectation: 'easy-medium',
    behavioralWeight: 'medium',
    internTips: [
      'Apple is secretive - you may not know the team until late in process',
      'They value attention to detail and code quality',
      'Be prepared to discuss Apple products you use',
      'Process is slower than other companies',
      'Domain fit matters more than pure algorithm skills',
    ],
    typicalQuestions: [
      'Linked List problems',
      'Tree problems',
      'String manipulation',
      'Basic array problems',
      'Sorting-related problems',
    ],
    whatTheyLookFor: [
      'Attention to detail',
      'Code quality over speed',
      'Genuine interest in Apple products',
      'Problem-solving approach',
      'Communication skills',
    ],
    redFlags: [
      'Sloppy code',
      'Not asking about edge cases',
      "No genuine interest in Apple's mission",
      'Rushing through problems',
    ],
  },
};

/**
 * Check if user can access hard problems
 */
export function canAccessHardProblems(
  experienceLevel: ExperienceLevel,
  patternsMastered: number,
  problemsSolved: number,
  mediumSuccessRate: number,
  daysRemaining: number
): { allowed: boolean; reason: string; criteria: string[] } {
  const config = ROLE_CONFIGS[experienceLevel];
  const gates = config.hardProblemGates;

  const criteria: string[] = [];
  const failedCriteria: string[] = [];

  // Check each gate
  if (daysRemaining >= gates.minDaysRemaining) {
    criteria.push(`${gates.minDaysRemaining}+ days remaining`);
  } else {
    failedCriteria.push(`Need ${gates.minDaysRemaining}+ days remaining (you have ${daysRemaining})`);
  }

  if (patternsMastered >= gates.minPatternsMastered) {
    criteria.push(`${gates.minPatternsMastered}+ patterns mastered`);
  } else {
    failedCriteria.push(`Master ${gates.minPatternsMastered}+ patterns (you have ${patternsMastered})`);
  }

  if (problemsSolved >= gates.minProblemsSolved) {
    criteria.push(`${gates.minProblemsSolved}+ problems solved`);
  } else {
    failedCriteria.push(`Solve ${gates.minProblemsSolved}+ problems (you have ${problemsSolved})`);
  }

  if (mediumSuccessRate >= gates.minMediumSuccessRate) {
    criteria.push(`${Math.round(gates.minMediumSuccessRate * 100)}%+ success on Medium`);
  } else {
    failedCriteria.push(`${Math.round(gates.minMediumSuccessRate * 100)}%+ Medium success rate (you have ${Math.round(mediumSuccessRate * 100)}%)`);
  }

  const allowed = failedCriteria.length === 0;

  return {
    allowed,
    reason: allowed
      ? 'You have unlocked hard problems!'
      : `Focus on fundamentals first. ${failedCriteria[0]}`,
    criteria: allowed ? criteria : failedCriteria,
  };
}

/**
 * Get patterns to prioritize for a role
 */
export function getPriorityPatterns(
  experienceLevel: ExperienceLevel,
  companyId?: string
): DSAPattern[] {
  if (experienceLevel === 'intern') {
    // Combine intern priority patterns with company-specific if available
    if (companyId && INTERN_COMPANY_DATA[companyId]) {
      const companyPatterns = INTERN_COMPANY_DATA[companyId].typicalPatterns;
      const combined = new Set([...INTERN_PRIORITY_PATTERNS, ...companyPatterns]);
      return Array.from(combined);
    }
    return INTERN_PRIORITY_PATTERNS;
  }

  // For other levels, return all patterns (no restriction)
  return [];
}

/**
 * Get patterns to deprioritize for a role
 */
export function getDeprioritizedPatterns(experienceLevel: ExperienceLevel): DSAPattern[] {
  if (experienceLevel === 'intern') {
    return INTERN_AVOID_PATTERNS;
  }
  if (experienceLevel === 'beginner') {
    return ['dijkstra', 'topological-sort', 'segment-tree', 'bit-manipulation'];
  }
  return [];
}

/**
 * Get interview tips for a role at a company
 */
export function getInternTips(companyId: string): string[] {
  const data = INTERN_COMPANY_DATA[companyId];
  if (data) {
    return data.internTips;
  }

  // Generic intern tips
  return [
    'Focus on fundamentals - arrays, strings, trees, basic recursion',
    'Communicate your thought process clearly',
    'Don\'t worry about optimal solutions - correct is more important',
    'Practice explaining your code out loud',
    'Ask clarifying questions before coding',
  ];
}

/**
 * Get what interviewers look for based on role
 */
export function getInterviewExpectations(
  experienceLevel: ExperienceLevel,
  companyId?: string
): {
  mustHave: string[];
  niceToHave: string[];
  notExpected: string[];
} {
  if (experienceLevel === 'intern') {
    const companyData = companyId ? INTERN_COMPANY_DATA[companyId] : null;

    return {
      mustHave: [
        'Clear problem-solving approach',
        'Working code that handles basic cases',
        'Communication throughout the process',
        'Ability to trace through examples',
        ...(companyData?.whatTheyLookFor || []),
      ],
      niceToHave: [
        'Handle edge cases',
        'Discuss time complexity',
        'Clean code style',
        'Quick debugging',
      ],
      notExpected: [
        'Optimal solutions for hard problems',
        'System design knowledge',
        'Advanced data structures (tries, segment trees)',
        'Complex DP problems',
      ],
    };
  }

  if (experienceLevel === 'beginner') {
    return {
      mustHave: [
        'Working solutions to medium problems',
        'Understanding of common patterns',
        'Time complexity analysis',
        'Clear communication',
      ],
      niceToHave: [
        'Optimal solutions',
        'Edge case handling',
        'Clean, production-ready code',
      ],
      notExpected: [
        'Advanced system design',
        'Complex optimization',
        'Esoteric algorithms',
      ],
    };
  }

  if (experienceLevel === 'intermediate') {
    return {
      mustHave: [
        'Optimal solutions to medium problems',
        'Working solutions to hard problems',
        'System design basics',
        'Code quality and testing mindset',
      ],
      niceToHave: [
        'Optimal solutions to hard problems',
        'Trade-off discussions',
        'Scalability considerations',
      ],
      notExpected: [
        'Distributed systems expertise',
        'ML/AI specialization',
      ],
    };
  }

  // Advanced
  return {
    mustHave: [
      'Optimal solutions to hard problems',
      'System design expertise',
      'Trade-off analysis',
      'Leadership and mentoring ability',
    ],
    niceToHave: [
      'Domain expertise',
      'Architectural vision',
      'Cross-team influence',
    ],
    notExpected: [],
  };
}

/**
 * Get recommended daily practice based on role
 */
export function getDailyPracticeRecommendation(
  experienceLevel: ExperienceLevel,
  daysRemaining: number,
  hoursAvailable: number
): {
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  focusAdvice: string;
} {
  const config = ROLE_CONFIGS[experienceLevel];
  const { distribution } = config;

  // Base problem count on hours available
  // Assume ~30 min per easy, ~45 min per medium, ~60 min per hard
  const totalMinutes = hoursAvailable * 60;

  // Calculate based on distribution
  const weightedAvgMinutes =
    (distribution.easy * 25 +
      distribution.medium * 40 +
      distribution.hard * 60) / 100;

  const totalProblems = Math.floor(totalMinutes / weightedAvgMinutes);

  let easyCount = Math.round((distribution.easy / 100) * totalProblems);
  let mediumCount = Math.round((distribution.medium / 100) * totalProblems);
  let hardCount = Math.round((distribution.hard / 100) * totalProblems);

  // Adjust for interns - minimize hard
  if (experienceLevel === 'intern') {
    hardCount = Math.min(hardCount, daysRemaining >= 30 ? 1 : 0);
    mediumCount = totalProblems - easyCount - hardCount;
  }

  // Focus advice based on days remaining
  let focusAdvice: string;
  if (daysRemaining <= 3) {
    focusAdvice = 'Review mode: Focus on problems you know, build confidence';
  } else if (daysRemaining <= 7) {
    focusAdvice = 'Polish mode: Review weak areas, practice under time pressure';
  } else if (daysRemaining <= 14) {
    focusAdvice = 'Intensify: Mix review with targeted practice on gaps';
  } else if (daysRemaining <= 30) {
    focusAdvice = 'Build mode: Focus on pattern mastery, one cluster at a time';
  } else {
    focusAdvice = 'Foundation mode: Learn new patterns, no rush';
  }

  return {
    easyCount: Math.max(0, easyCount),
    mediumCount: Math.max(1, mediumCount), // At least 1 medium
    hardCount: Math.max(0, hardCount),
    focusAdvice,
  };
}

/**
 * Calculate adjusted time estimate for a problem
 */
export function getAdjustedTimeEstimate(
  baseMins: number,
  difficulty: 'easy' | 'medium' | 'hard',
  experienceLevel: ExperienceLevel
): number {
  const config = ROLE_CONFIGS[experienceLevel];
  return Math.round(baseMins * config.timeMultiplier);
}
