import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type { BugfixSkillCategory } from "@/lib/bugfix/types"

export type RecommendationPriority = "critical" | "high" | "medium" | "low"
export type RecommendationSkill = DSAPattern | BugfixSkillCategory

export type RecommendationReason =
  | "weakness-practice"
  | "strength-challenge"
  | "new-pattern"
  | "spaced-repetition"
  | "difficulty-progression"
  | "similar-to-solved"
  | "interview-prep"
  | "daily-goal"

export interface ProblemScore {
  overall: number
  relevance: number
  lexicalRelevance: number
  difficulty: number
  freshness: number
  patternValue: number
  progression: number
}

export interface RecommendedProblem {
  id: string
  title: string
  pattern: DSAPattern
  skill?: RecommendationSkill
  activityType?: "dsa" | "bugfix" | "system-design" | "add-functionality"
  difficulty: "easy" | "medium" | "hard"
  score: ProblemScore
  priority: RecommendationPriority
  reason: RecommendationReason
  reasonText: string
  estimatedTimeMinutes: number
  prerequisites: DSAPattern[]
  skillPrerequisites?: RecommendationSkill[]
  userReadiness: number
  metadata?: {
    tags?: string[]
    company?: string
    frequency?: number
  }
}

export interface RecommendationRequest {
  userId: string
  targetCompany?: string
  targetPatterns?: DSAPattern[]
  preferredDifficulty?: "easy" | "medium" | "hard" | "adaptive"
  sessionGoal?: "practice" | "learn-new" | "review" | "challenge"
  availableTimeMinutes?: number
  excludeProblemIds?: string[]
  limit?: number
}

export interface CatalogProblem {
  id: string
  title: string
  pattern: DSAPattern
  skill?: RecommendationSkill
  activityType?: "dsa" | "bugfix" | "system-design" | "add-functionality"
  difficulty: "easy" | "medium" | "hard"
  description?: string
  estimatedTimeMinutes?: number
  tags?: string[]
  company?: string
  frequency?: number
}

export interface RecommendationResponse {
  recommendations: RecommendedProblem[]
  userProfile: {
    level: "beginner" | "intermediate" | "advanced"
    strengths: DSAPattern[]
    weaknesses: DSAPattern[]
    recentTrend: "improving" | "stable" | "declining"
  }
  sessionPlan?: {
    warmup?: RecommendedProblem
    main: RecommendedProblem[]
    challenge?: RecommendedProblem
    estimatedTotalMinutes: number
  }
  metadata: {
    generationTimeMs: number
    totalProblemsScored: number
    personalizationLevel: "full" | "partial" | "none"
  }
}
