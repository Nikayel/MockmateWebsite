/**
 * Metadata Filters
 * 
 * Provides filtering utilities for RAG queries
 */

import type { SimilaritySearchOptions } from '../types'

export interface FilterCriteria {
  type?: 'problem' | 'solution' | 'hint' | 'feedback' | 'onboarding'
  userId?: string
  problemId?: string
  problemType?: string
  difficulty?: string
  excludeIds?: string[]
  tags?: string[]
}

/**
 * Check if a document matches the filter criteria
 */
export function matchesFilter(
  document: {
    id: string
    type?: string
    metadata?: {
      userId?: string
      user_id?: string
      problemId?: string
      difficulty?: string
      tags?: string[]
    }
  },
  criteria: FilterCriteria
): boolean {
  // Exclude IDs
  if (criteria.excludeIds?.includes(document.id)) {
    return false
  }

  // Type filter
  if (criteria.type && document.type !== criteria.type) {
    return false
  }

  // User ID filter
  if (criteria.userId) {
    const docUserId = document.metadata?.userId || document.metadata?.user_id
    if (docUserId !== criteria.userId) {
      return false
    }
  }

  // Problem ID filter
  if (criteria.problemId && document.metadata?.problemId !== criteria.problemId) {
    return false
  }

  // Problem type filter (check tags)
  if (criteria.problemType) {
    const tags = document.metadata?.tags || []
    if (!tags.includes(criteria.problemType)) {
      return false
    }
  }

  // Difficulty filter
  if (criteria.difficulty && document.metadata?.difficulty !== criteria.difficulty) {
    return false
  }

  // Tags filter (all tags must be present)
  if (criteria.tags && criteria.tags.length > 0) {
    const docTags = document.metadata?.tags || []
    const hasAllTags = criteria.tags.every(tag => docTags.includes(tag))
    if (!hasAllTags) {
      return false
    }
  }

  return true
}

/**
 * Convert SimilaritySearchOptions to FilterCriteria
 */
export function optionsToFilterCriteria(options: SimilaritySearchOptions): FilterCriteria {
  return {
    type: options.type,
    userId: options.userId,
    problemType: options.problemType,
    excludeIds: options.excludeIds,
  }
}

