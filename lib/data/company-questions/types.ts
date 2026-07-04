/**
 * Types for company-specific interview question data
 */

import { DSAPattern } from "@/lib/types/dsa-patterns"

export type CompanyId =
  | "google"
  | "meta"
  | "amazon"
  | "apple"
  | "netflix"
  | "microsoft"
  | "stripe"
  | "uber"
  | "lyft"
  | "airbnb"
  | "linkedin"
  | "twitter"
  | "shopify"
  | "coinbase"
  | "databricks"
  | "snowflake"
  | "palantir"
  | "goldman-sachs"
  | "jane-street"
  | "bloomberg"
  | "veeva"
  | "doordash"
  | "instacart"
  | "robinhood"
  | "square"
  | "figma"
  // Popular tech companies for interns and new grads
  | "roblox"
  | "tiktok"
  | "nvidia"
  | "salesforce"
  | "snap"
  | "pinterest"
  | "reddit"
  | "atlassian"
  | "oracle"
  | "spotify"
  | "twitch"
  | "ziprecruiter"

export type QuestionFrequency = "very_common" | "common" | "occasional" | "rare"

export type InterviewRoundType =
  | "phone_screen"
  | "coding"
  | "system_design"
  | "behavioral"
  | "team_match"

export interface PatternFrequency {
  pattern: DSAPattern
  frequency: number // 1-100: how often this pattern appears
  priority: number // 1-10: importance for passing interviews
  typicalDifficulty: "easy" | "medium" | "hard"
}

export interface MustKnowQuestion {
  scenarioId: string
  title: string
  frequency: QuestionFrequency
  lastReported?: string // e.g., "2024 Q4"
  variants?: string[] // Common variations of this question
}

export interface InterviewRound {
  type: InterviewRoundType
  duration: number // minutes
  description: string
  focusAreas: string[]
}

export interface CompanyQuestionData {
  id: CompanyId
  name: string
  logo: string // Path to logo asset
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
    timeline: string // e.g., "2-4 weeks"
    tips: string[]
  }

  // Company-specific interview traits
  interviewStyle: {
    pace: "fast" | "moderate" | "relaxed"
    communicationEmphasis: number // 1-10
    codeQualityEmphasis: number // 1-10
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

  // Core values and leadership principles (for RAG context during interviews)
  coreValues?: {
    principles: string[] // Key leadership principles or cultural values
    behavioralExpectations: string[] // What they look for in behavioral interviews
    valueKeywords: string[] // Keywords that resonate with the company
  }

  // Engineering culture and technical philosophy
  engineeringCulture?: {
    philosophy: string[] // How they approach engineering
    techStack: string[] // Primary technologies
    codeReviewStyle: string // e.g., "thorough", "async", "pair programming"
    deploymentPhilosophy: string // e.g., "continuous deployment", "weekly releases"
    documentationExpectations: string // e.g., "design docs required", "minimal"
  }
}

/**
 * Engineering track the user is targeting. Affects which role-tagged questions
 * are prioritized (e.g. Palantir FDSE leans on parsing/data-modeling while core
 * SWE leans on harder graph/algorithm work). Undefined = no track preference.
 */
export type CompanyTrack = "swe" | "fdse"

/**
 * Interview content categories a roadmap can schedule. "decomposition" is the
 * learner-facing name for the add-functionality / feature-building scenario
 * type. This axis sits alongside the DSA pattern axis so a roadmap can blend
 * algorithms with debugging, feature building, and (future) system design.
 */
export type RoadmapCategory = "dsa" | "bugfix" | "decomposition" | "system-design"

/** How the user chose to compose their roadmap during creation. */
export type RoadmapMixMode = "full" | "dsa-only" | "custom"

/**
 * Resolved category composition for a roadmap. `weights` are percentages that
 * sum to ~100 across the categories that are actually used.
 */
export interface RoadmapCategoryMix {
  mode: RoadmapMixMode
  weights: Record<RoadmapCategory, number>
  selectedCategories?: RoadmapCategory[]
  source: "research-default" | "user-custom"
}

export interface UserRoadmapAssessment {
  targetCompany: CompanyId
  interviewDate: Date
  daysRemaining: number

  // User's current level (including intern for internship candidates)
  experienceLevel: "intern" | "beginner" | "intermediate" | "advanced"
  // Optional engineering track (core SWE vs forward-deployed). Affects role-aware
  // question prioritization; undefined means no track preference.
  targetTrack?: CompanyTrack
  problemsSolvedEstimate: number

  // Pattern familiarity (from self-assessment)
  patternFamiliarity: {
    pattern: DSAPattern
    level: "unknown" | "seen" | "practiced" | "confident"
  }[]

  // Study capacity
  hoursPerDay: number
  preferredDifficulty: "easy" | "medium" | "hard" | "mixed"

  // Goals
  targetScore: number // 0-100, what they want to achieve

  // Optional category composition chosen at creation (full mix / DSA only /
  // custom subset). Absent = legacy DSA-only roadmap.
  categoryMix?: RoadmapCategoryMix
}

export interface PrioritizedQuestion {
  scenarioId: string
  title: string
  pattern: DSAPattern
  difficulty: "easy" | "medium" | "hard"
  priorityScore: number // 0-100
  estimatedMinutes: number
  reasons: string[] // Why this is prioritized
  isRequired: boolean // Must-do for this company
  dependencies: string[] // Prerequisite scenario IDs
  // Category axis (defaults to "dsa"); non-DSA prioritized questions are
  // modelled separately in the mix builder.
  category?: RoadmapCategory
  scenarioType?: "dsa" | "bugfix" | "system-design" | "add-functionality"
  topic?: string // human label (pattern name for DSA, category label otherwise)
}

export interface DailyPlan {
  date: Date
  dayNumber: number
  targetMinutes: number
  theme: string // e.g., "Binary Search Day"
  focusPatterns: DSAPattern[]
  focusCategories?: RoadmapCategory[]
  questions: {
    scenarioId: string
    title: string
    // Optional: DSA nodes carry a pattern; bugfix/decomposition/system-design
    // nodes do not. Legacy nodes always have it.
    pattern?: DSAPattern
    difficulty: "easy" | "medium" | "hard"
    estimatedMinutes: number
    status: "pending" | "in_progress" | "completed" | "skipped" | "evaluating"
    completedAt?: Date
    score?: number
    // Category axis; absent on legacy nodes (defaulted to "dsa" at read time).
    category?: RoadmapCategory
    scenarioType?: "dsa" | "bugfix" | "system-design" | "add-functionality"
    topic?: string
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

  // Category coverage (DSA / debugging / feature-building), parallel to
  // patternCoverage. Optional so legacy roadmaps stay valid.
  categoryCoverage?: {
    category: RoadmapCategory
    total: number
    completed: number
    percentage: number
  }[]

  // The resolved category composition (for display and recalculation).
  categoryMix?: RoadmapCategoryMix

  // The actual plan
  dailyPlans: DailyPlan[]
  milestones: Milestone[]

  // Status
  status: "active" | "completed" | "abandoned" | "archived"
  isOnTrack: boolean
  daysAhead: number // Positive = ahead, negative = behind

  // Optional RAG enhancements
  ragEnhancements?: {
    enabled: boolean
    patternInsights: Array<{
      pattern: DSAPattern
      importance: number
      companyFrequency: number
      suggestedApproach: string
      tips: string[]
      estimatedPracticeTime: number
      prerequisitesMet: boolean
    }>
    companyTips: string[]
    personalizedAdvice: string[]
    adaptiveAdjustments: Array<{
      type: "difficulty" | "pattern-focus" | "time-allocation" | "review-schedule"
      description: string
      reason: string
      impact: "high" | "medium" | "low"
    }>
    studyStrategies: Array<{
      name: string
      description: string
      applicablePatterns: DSAPattern[]
      estimatedBenefit: string
      priority: number
    }>
  }
}
