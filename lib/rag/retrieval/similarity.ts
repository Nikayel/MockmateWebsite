/**
 * Similarity Search
 * 
 * Provides cosine similarity calculation and search functionality
 */

import { cosineSimilarity } from '../utils'
import type { SimilarResult, SimilaritySearchOptions } from '../types'

/**
 * Calculate cosine similarity between two vectors
 */
export function calculateSimilarity(a: number[], b: number[]): number {
  return cosineSimilarity(a, b)
}

/**
 * Find similar vectors using cosine similarity
 */
export function findSimilarVectors(
  queryVector: number[],
  candidates: Array<{ id: string; vector: number[]; text: string; type: string; metadata: any }>,
  options: SimilaritySearchOptions = {}
): SimilarResult[] {
  const {
    limit = 5,
    minSimilarity = 0.3,
    excludeIds = [],
    userId,
    problemType,
    type
  } = options

  const results: SimilarResult[] = []

  for (const candidate of candidates) {
    // Apply filters
    if (excludeIds.includes(candidate.id)) continue
    if (type && candidate.type !== type) continue
    if (userId && candidate.metadata?.userId !== userId && candidate.metadata?.user_id !== userId) continue
    if (problemType) {
      const tags = candidate.metadata?.tags || []
      if (!tags.includes(problemType)) continue
    }

    // Calculate similarity
    const similarity = calculateSimilarity(queryVector, candidate.vector)

    if (similarity >= minSimilarity) {
      results.push({
        id: candidate.id,
        text: candidate.text,
        type: candidate.type,
        similarity,
        metadata: candidate.metadata,
      })
    }
  }

  // Sort by similarity and limit
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
}

