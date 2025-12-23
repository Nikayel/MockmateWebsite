/**
 * Result Reranking
 * 
 * Provides reranking strategies to improve retrieval quality
 */

import type { SimilarResult, RerankerOptions } from '../types'

/**
 * Simple reranker that sorts by similarity score
 */
export function rerankBySimilarity(
  results: SimilarResult[],
  options: RerankerOptions = {}
): SimilarResult[] {
  const { topK = results.length } = options

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
}

/**
 * Rerank by recency (newer documents get slight boost)
 */
export function rerankByRecency(
  results: SimilarResult[],
  options: RerankerOptions = {}
): SimilarResult[] {
  const { topK = results.length } = options

  const now = Date.now()
  const maxAge = 365 * 24 * 60 * 60 * 1000 // 1 year

  return results
    .map(result => {
      const timestamp = result.metadata?.timestamp
      if (!timestamp) return { ...result, adjustedScore: result.similarity }

      const age = now - new Date(timestamp).getTime()
      const recencyBoost = Math.max(0, 1 - (age / maxAge)) * 0.1 // Max 10% boost
      const adjustedScore = result.similarity + recencyBoost

      return {
        ...result,
        adjustedScore: Math.min(1, adjustedScore), // Cap at 1.0
      }
    })
    .sort((a, b) => (b.adjustedScore || b.similarity) - (a.adjustedScore || a.similarity))
    .slice(0, topK)
    .map(({ adjustedScore, ...rest }) => rest) // Remove adjustedScore from output
}

/**
 * Hybrid reranker combining similarity and recency
 */
export function hybridRerank(
  results: SimilarResult[],
  options: RerankerOptions = {}
): SimilarResult[] {
  const { topK = results.length } = options

  // First filter by similarity threshold
  const highQualityResults = results.filter(r => r.similarity >= 0.3)

  // Then rerank by recency
  return rerankByRecency(highQualityResults, { topK })
}

