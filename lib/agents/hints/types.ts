/**
 * Hint type definitions
 */

import type { DSAPattern } from "@/lib/types/dsa-patterns"

export type HintLevel = 1 | 2 | 3 | 4

export type HintCategory =
  | "conceptual"
  | "approach"
  | "implementation"
  | "optimization"
  | "debugging"

export type HintTrigger =
  | "initial"
  | "test_failed"
  | "test_passed"
  | "stuck"
  | "manual"
  | "code_change"

export interface GeneratedHint {
  id: string
  level: HintLevel
  category: HintCategory
  title: string
  content: string
  isBlurred: boolean
  source: "ai" | "rag" | "pattern-knowledge" | "user-history"
  relevanceScore: number
  metadata?: {
    pattern?: DSAPattern
    relatedConcepts?: string[]
    codeSnippet?: string
  }
}

export interface StruggleMetrics {
  timeSpentMinutes: number
  codeChanges: number
  testsRun: number
  testsFailed: number
  hintsRevealed: number
  lastCodeChangeMinutesAgo: number
  errorCount: number
}

export interface HintGenerationRequest {
  userId: string
  problemId: string
  problemTitle: string
  problemText: string
  problemPattern?: DSAPattern
  difficulty: "easy" | "medium" | "hard"
  userCode: string
  language: string
  struggleMetrics: StruggleMetrics
  existingHints?: string[]
  testResults?: {
    passed: number
    total: number
    failingTests?: string[]
  }
  trigger?: HintTrigger
  // Problem-specific context for better hint tailoring
  optimalComplexity?: {
    time: string
    space: string
  }
  constraints?: string[]
}

export interface HintGenerationResponse {
  hints: GeneratedHint[]
  struggleLevel: "none" | "mild" | "moderate" | "high"
  recommendedRevealLevel: HintLevel
  personalizationApplied: boolean
  metadata: {
    generationTimeMs: number
    ragContextUsed: boolean
    userHistoryUsed: boolean
    patternKnowledgeUsed: boolean
  }
}
