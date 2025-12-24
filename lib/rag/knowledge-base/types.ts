/**
 * Knowledge Base Types
 */

import type { DSAPattern } from '@/lib/types/dsa-patterns'
import type { CompanyId } from '@/lib/data/company-questions/types'

/**
 * Types of knowledge documents in the RAG system
 */
export type KnowledgeType =
  | 'dsa-pattern'           // DSA pattern explanation and approach
  | 'algorithm'             // Specific algorithm details
  | 'company-info'          // Company interview info
  | 'company-pattern'       // Company-specific pattern frequency
  | 'interview-tip'         // Interview tips and strategies
  | 'problem-template'      // Problem-solving templates
  | 'concept'               // General CS concepts
  | 'time-complexity'       // Time/space complexity guides
  | 'code-pattern'          // Common code patterns

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
  difficulty?: 'easy' | 'medium' | 'hard'

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
  importance?: number  // 1-10
  frequency?: number   // How often this appears in interviews
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
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
}

/**
 * Knowledge query options
 */
export interface KnowledgeQueryOptions {
  types?: KnowledgeType[]
  patterns?: DSAPattern[]
  companies?: CompanyId[]
  difficulty?: ('easy' | 'medium' | 'hard')[]
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
