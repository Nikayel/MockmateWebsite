/**
 * Types for company-specific interview question data
 */

import { DSAPattern } from '@/lib/types/dsa-patterns'

export type CompanyId =
  | 'google' | 'meta' | 'amazon' | 'apple' | 'netflix' | 'microsoft'
  | 'stripe' | 'uber' | 'lyft' | 'airbnb' | 'linkedin' | 'twitter'
  | 'shopify' | 'coinbase' | 'databricks' | 'snowflake' | 'palantir'
  | 'goldman-sachs' | 'jane-street' | 'bloomberg'

export type QuestionFrequency = 'very_common' | 'common' | 'occasional' | 'rare'

export type InterviewRoundType =
  | 'phone_screen'
  | 'coding'
  | 'system_design'
  | 'behavioral'
  | 'team_match'

export interface PatternFrequency {
  pattern: DSAPattern
  frequency: number      // 1-100: how often this pattern appears
  priority: number       // 1-10: importance for passing interviews
  typicalDifficulty: 'easy' | 'medium' | 'hard'
}

export interface MustKnowQuestion {
  scenarioId: string
  title: string
  frequency: QuestionFrequency
  lastReported?: string  // e.g., "2024 Q4"
  variants?: string[]    // Common variations of this question
}

export interface InterviewRound {
  type: InterviewRoundType
  duration: number       // minutes
  description: string
  focusAreas: string[]
}

export interface CompanyQuestionData {
  id: CompanyId
  name: string
  logo: string           // Path to logo asset
  careers_url: string

  // Difficulty distribution (should sum to 100)
  difficultyDistribution: {
    easy: number
    medium: number
    hard: number
  }

  // Top patterns for this company (ordered by frequency)
  topPatterns: PatternFrequency[]

  // Specific must-know questions
  mustKnowQuestions: MustKnowQuestion[]

  // Interview process structure
  interviewProcess: {
    totalRounds: number
    rounds: InterviewRound[]
    timeline: string     // e.g., "2-4 weeks"
    tips: string[]
  }

  // Company-specific interview traits
  interviewStyle: {
    pace: 'fast' | 'moderate' | 'relaxed'
    communicationEmphasis: number  // 1-10
    codeQualityEmphasis: number    // 1-10
    optimalSolutionRequired: boolean
    allowsPseudocode: boolean
    providesHints: boolean
    uniqueTraits: string[]
  }

  // Salary and level info (optional)
  compensation?: {
    entryLevel: string
    midLevel: string
    seniorLevel: string
  }
}

export interface UserRoadmapAssessment {
  targetCompany: CompanyId
  interviewDate: Date
  daysRemaining: number

  // User's current level
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  problemsSolvedEstimate: number

  // Pattern familiarity (from self-assessment)
  patternFamiliarity: {
    pattern: DSAPattern
    level: 'unknown' | 'seen' | 'practiced' | 'confident'
  }[]

  // Study capacity
  hoursPerDay: number
  preferredDifficulty: 'easy' | 'medium' | 'hard' | 'mixed'

  // Goals
  targetScore: number   // 0-100, what they want to achieve
}

export interface PrioritizedQuestion {
  scenarioId: string
  title: string
  pattern: DSAPattern
  difficulty: 'easy' | 'medium' | 'hard'
  priorityScore: number       // 0-100
  estimatedMinutes: number
  reasons: string[]           // Why this is prioritized
  isRequired: boolean         // Must-do for this company
  dependencies: string[]      // Prerequisite scenario IDs
}

export interface DailyPlan {
  date: Date
  dayNumber: number
  targetMinutes: number
  theme: string               // e.g., "Binary Search Day"
  focusPatterns: DSAPattern[]
  questions: {
    scenarioId: string
    title: string
    pattern: DSAPattern
    difficulty: 'easy' | 'medium' | 'hard'
    estimatedMinutes: number
    status: 'pending' | 'in_progress' | 'completed' | 'skipped'
    completedAt?: Date
    score?: number
  }[]
  notes?: string
}

export interface Milestone {
  id: string
  name: string
  description: string
  targetDate: Date
  requiredScenarios: string[]
  bonusScenarios: string[]
  isCompleted: boolean
  completedAt?: Date
}

export interface PersonalizedRoadmap {
  id: string
  userId: string

  // Target info
  targetCompany: CompanyId
  companyName: string
  interviewDate: Date
  createdAt: Date
  updatedAt: Date

  // Assessment snapshot
  assessment: UserRoadmapAssessment

  // Stats
  totalQuestions: number
  totalEstimatedHours: number
  questionsCompleted: number
  questionsSkipped: number
  actualHoursSpent: number

  // Coverage tracking
  patternCoverage: {
    pattern: DSAPattern
    total: number
    completed: number
    percentage: number
  }[]

  // The actual plan
  dailyPlans: DailyPlan[]
  milestones: Milestone[]

  // Status
  status: 'active' | 'completed' | 'abandoned'
  isOnTrack: boolean
  daysAhead: number  // Positive = ahead, negative = behind
}
