/**
 * Knowledge Base Types
 */

import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type { CompanyId } from "@/lib/data/company-questions/types"

/**
 * Types of knowledge documents in the RAG system
 */
export type KnowledgeType =
  | "dsa-pattern" // DSA pattern explanation and approach
  | "algorithm" // Specific algorithm details
  | "company-info" // Company interview info
  | "company-pattern" // Company-specific pattern frequency
  | "interview-tip" // Interview tips and strategies
  | "problem-template" // Problem-solving templates
  | "concept" // General CS concepts
  | "time-complexity" // Time/space complexity guides
  | "code-pattern" // Common code patterns
  | "notification" // Notification triggers and strategies
  | "spaced-repetition" // Spaced repetition schedules
  | "learning-science" // Learning principles and research
  | "pattern-review" // Pattern-specific review strategies
  | "debugging" // Debugging strategies and bug types
  | "system-design" // System design concepts and patterns
  | "interview-behavior" // Interview communication best practices by level

/**
 * Base knowledge document
 */
export interface KnowledgeDocument {
  id: string
  type: KnowledgeType
  title: string
  content: string
  metadata: KnowledgeMetadata
  vector?: number[]
  createdAt: Date
  updatedAt: Date
}

/**
 * Knowledge document metadata
 */
export interface KnowledgeMetadata {
  // Pattern-related
  pattern?: DSAPattern
  patterns?: DSAPattern[]
  difficulty?: "easy" | "medium" | "hard"

  // Company-related
  companyId?: CompanyId
  companyIds?: CompanyId[]

  // Content categorization
  tags?: string[]
  category?: string
  subcategory?: string

  // Relationships
  relatedDocIds?: string[]
  prerequisiteDocIds?: string[]

  // Quality/ranking
  importance?: number // 1-10
  frequency?: number // How often this appears in interviews
  verified?: boolean

  // Source tracking
  source?: string
  lastVerified?: Date
}

/**
 * DSA Pattern Knowledge
 */
export interface DSAPatternKnowledge {
  pattern: DSAPattern
  displayName: string
  description: string
  whenToUse: string[]
  keyInsights: string[]
  commonMistakes: string[]
  timeComplexity: {
    typical: string
    best: string
    worst: string
  }
  spaceComplexity: {
    typical: string
    notes: string
  }
  relatedPatterns: DSAPattern[]
  prerequisites: DSAPattern[]
  codeTemplate?: string
  examples?: string[]
  interviewTips: string[]
}

/**
 * Company Interview Knowledge
 */
export interface CompanyInterviewKnowledge {
  companyId: CompanyId
  companyName: string
  interviewStyle: {
    description: string
    pace: string
    expectations: string[]
  }
  topPatterns: {
    pattern: DSAPattern
    frequency: number
    tips: string[]
  }[]
  interviewProcess: string[]
  cultureTips: string[]
  commonQuestionTypes: string[]
  dosDonts: {
    dos: string[]
    donts: string[]
  }
}

/**
 * Seeding progress tracking
 */
export interface SeedingProgress {
  totalDocuments: number
  processedDocuments: number
  successfulDocuments: number
  failedDocuments: number
  errors: Array<{
    documentId: string
    error: string
  }>
  startedAt: Date
  completedAt?: Date
  status: "pending" | "in_progress" | "completed" | "failed"
}

/**
 * Knowledge query options
 */
export interface KnowledgeQueryOptions {
  types?: KnowledgeType[]
  patterns?: DSAPattern[]
  companies?: CompanyId[]
  difficulty?: ("easy" | "medium" | "hard")[]
  tags?: string[]
  minImportance?: number
  limit?: number
  includeRelated?: boolean
}

/**
 * Knowledge query result
 */
export interface KnowledgeQueryResult {
  documents: KnowledgeDocument[]
  totalCount: number
  queryTimeMs: number
}

/**
 * Bug Type Category for debugging knowledge
 */
export type BugCategory =
  | "off-by-one"
  | "null-pointer"
  | "type-error"
  | "logic-error"
  | "boundary-error"
  | "race-condition"
  | "memory-leak"
  | "infinite-loop"
  | "wrong-operator"
  | "scope-error"
  | "initialization-error"
  | "comparison-error"
  | "exception-handling"
  | "async-error"

/**
 * Debugging Knowledge Base Entry
 */
export interface DebuggingKnowledge {
  bugCategory: BugCategory
  displayName: string
  description: string
  commonCauses: string[]
  symptoms: string[]
  debuggingApproach: string[]
  redFlags: string[]
  fixStrategies: string[]
  preventionTips: string[]
  codeExamples: {
    buggy: string
    fixed: string
    explanation: string
  }[]
  relatedBugs: BugCategory[]
  difficulty: "easy" | "medium" | "hard"
  frequency: number // 1-10 how common this bug is
}

/**
 * System Design Component Type
 */
export type SystemDesignComponent =
  | "load-balancer"
  | "api-gateway"
  | "cache"
  | "database"
  | "message-queue"
  | "cdn"
  | "search"
  | "storage"
  | "monitoring"
  | "authentication"

/**
 * System Design Knowledge Base Entry
 */
export interface SystemDesignKnowledge {
  concept: string
  displayName: string
  category: "scalability" | "reliability" | "data" | "networking" | "security" | "components"
  description: string
  whenToUse: string[]
  keyPrinciples: string[]
  tradeoffs: {
    pros: string[]
    cons: string[]
  }
  realWorldExamples: string[]
  interviewTips: string[]
  commonMistakes: string[]
  relatedConcepts: string[]
  estimations?: {
    metric: string
    typical: string
    formula?: string
  }[]
}

/**
 * Problem Complexity Knowledge - Multiple approaches with trade-offs
 * Data sourced from LeetCode editorials and verified algorithm knowledge
 */
export interface ProblemComplexityKnowledge {
  /** Internal scenario ID (e.g., "dsa-two-sum") */
  problemId: string
  /** LeetCode problem number */
  leetcodeNumber: number
  /** LeetCode URL slug */
  slug: string
  /** Problem title */
  problemTitle: string
  /** Source URL for verification */
  sourceUrl: string
  /** LeetCode difficulty */
  difficulty: "Easy" | "Medium" | "Hard"
  /** LeetCode topic tags */
  tags: string[]

  /**
   * Multiple valid approaches with trade-offs
   * From LeetCode editorial or verified algorithm knowledge
   */
  approaches: ProblemApproach[]

  /**
   * Common mistakes when analyzing complexity
   * Helps interviewer identify and correct misconceptions
   */
  commonMistakes: string[]

  /**
   * Key operations and their complexities
   * Helps user understand why the overall complexity is what it is
   */
  keyOperations: {
    operation: string
    complexity: string
    note?: string
  }[]

  /** Verification metadata */
  verified: boolean
  verifiedAt?: string
  verificationSource: "leetcode-editorial" | "neetcode" | "algorithm-textbook" | "manual"
}

/**
 * A single approach to solving a problem
 */
export interface ProblemApproach {
  /** Approach name (e.g., "Hash Map", "Two Pointers", "Brute Force") */
  name: string
  /** Time complexity (e.g., "O(n)", "O(n^2)") */
  timeComplexity: string
  /** Space complexity (e.g., "O(1)", "O(n)") */
  spaceComplexity: string
  /** Trade-off explanation */
  tradeOff: string
  /** When to use this approach */
  whenToUse: string
  /** Brief code pattern description */
  codePattern?: string
  /** Is this the optimal time complexity? */
  isOptimalTime: boolean
  /** Is this the optimal space complexity? */
  isOptimalSpace: boolean
  /** Source of this data */
  source: "leetcode-editorial" | "neetcode" | "algorithm-textbook" | "manual"
}

/**
 * Pattern-level complexity rules based on CS fundamentals
 * These are general rules that apply to algorithm patterns
 */
export interface PatternComplexityRules {
  pattern: DSAPattern
  typicalTimeComplexity: string
  typicalSpaceComplexity: string
  keyInsight: string
  /** Textbook or fundamental reference */
  source: string
  /** Common variations and their complexities */
  variations?: {
    name: string
    time: string
    space: string
    note: string
  }[]
}

/**
 * Complexity analysis for a user's session
 * Stores both what user claimed and what code analysis detected
 */
export interface SessionComplexityAnalysis {
  /** What the code analysis heuristics detected */
  codeAnalyzed: {
    timeComplexity: string
    spaceComplexity: string
    confidence: "low" | "medium" | "high"
    detectedPatterns: string[]
  }
  /** What the user stated during the interview */
  userStated: {
    timeComplexity: string | null
    spaceComplexity: string | null
    timestamp: number
  } | null
  /** Which approach from knowledge base they likely used */
  approachUsed: string | null
  /** Was their stated complexity accurate? */
  isAccurate: boolean | null
  /** Feedback for the user */
  feedback?: string
}
