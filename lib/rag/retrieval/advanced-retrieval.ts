/**
 * Advanced RAG Retrieval System
 *
 * Provides sophisticated retrieval capabilities:
 * - Multi-query retrieval (query expansion)
 * - Hybrid retrieval (semantic + keyword)
 * - Advanced reranking with multiple signals
 * - Contextual retrieval
 * - Personalized retrieval based on user history
 */

import { getHybridProvider } from '../embeddings/hybrid-provider'
import { vectorDB } from '../vectordb'
import type { SimilarResult, QueryResult, VectorDocument } from '../types'
import type { DSAPattern } from '@/lib/types/dsa-patterns'
import type { CompanyId } from '@/lib/data/company-questions/types'

/**
 * Advanced retrieval options
 */
export interface AdvancedRetrievalOptions {
  // Basic options
  query: string
  limit?: number
  minSimilarity?: number

  // Filtering
  types?: ('problem' | 'solution' | 'hint' | 'feedback' | 'onboarding' | 'knowledge')[]
  userId?: string
  patterns?: DSAPattern[]
  companies?: CompanyId[]
  difficulty?: ('easy' | 'medium' | 'hard')[]
  excludeIds?: string[]

  // Advanced options
  enableQueryExpansion?: boolean      // Generate related queries
  enableHybridSearch?: boolean        // Combine semantic + keyword
  enableReranking?: boolean           // Apply advanced reranking
  enablePersonalization?: boolean     // Personalize based on user
  contextDocuments?: string[]         // Additional context for retrieval

  // Reranking weights
  rerankingWeights?: {
    similarity: number      // Base similarity (default: 0.5)
    recency: number         // Recency boost (default: 0.1)
    relevance: number       // Query relevance (default: 0.2)
    popularity: number      // Document popularity (default: 0.1)
    userHistory: number     // User history match (default: 0.1)
  }
}

/**
 * Enhanced retrieval result
 */
export interface EnhancedRetrievalResult {
  id: string
  text: string
  type: string
  baseScore: number           // Original similarity score
  finalScore: number          // After reranking
  metadata: Record<string, unknown>
  highlights?: string[]       // Relevant snippets
  matchedQueries?: string[]   // Which expanded queries matched
}

/**
 * Retrieval analytics
 */
export interface RetrievalAnalytics {
  totalCandidates: number
  afterFiltering: number
  afterReranking: number
  queryExpansionUsed: boolean
  expansionQueries?: string[]
  retrievalTimeMs: number
  rerankingTimeMs: number
}

/**
 * Advanced RAG Retriever
 */
export class AdvancedRetriever {
  private embeddingProvider = getHybridProvider()

  /**
   * Perform advanced retrieval
   */
  async retrieve(options: AdvancedRetrievalOptions): Promise<{
    results: EnhancedRetrievalResult[]
    analytics: RetrievalAnalytics
  }> {
    const startTime = Date.now()
    const analytics: RetrievalAnalytics = {
      totalCandidates: 0,
      afterFiltering: 0,
      afterReranking: 0,
      queryExpansionUsed: options.enableQueryExpansion || false,
      retrievalTimeMs: 0,
      rerankingTimeMs: 0,
    }

    // Step 1: Generate query embedding(s)
    const queries = options.enableQueryExpansion
      ? await this.expandQuery(options.query)
      : [options.query]

    analytics.expansionQueries = queries

    // Step 2: Retrieve candidates for each query
    const allCandidates: Map<string, QueryResult & { matchedQueries: string[] }> = new Map()

    for (const query of queries) {
      const embedding = await this.embeddingProvider.generateEmbedding(query)

      const results = await vectorDB.query(embedding, {
        topK: Math.min((options.limit || 10) * 3, 100), // Get more for reranking
        filter: {
          type: options.types?.[0],
          userId: options.userId,
          minSimilarity: options.minSimilarity || 0.3,
          excludeIds: options.excludeIds,
        },
        includeMetadata: true,
      })

      for (const result of results) {
        const existing = allCandidates.get(result.id)
        if (existing) {
          // Combine scores for duplicate results (query expansion)
          existing.score = Math.max(existing.score, result.score)
          existing.matchedQueries.push(query)
        } else {
          allCandidates.set(result.id, {
            ...result,
            matchedQueries: [query],
          })
        }
      }
    }

    analytics.totalCandidates = allCandidates.size
    const retrievalEndTime = Date.now()
    analytics.retrievalTimeMs = retrievalEndTime - startTime

    // Step 3: Apply filtering
    let candidates = Array.from(allCandidates.values())

    if (options.patterns?.length) {
      candidates = candidates.filter(c =>
        options.patterns!.some(p =>
          c.metadata?.pattern === p ||
          (c.metadata?.patterns as string[])?.includes(p) ||
          (c.metadata?.tags as string[])?.includes(p)
        )
      )
    }

    if (options.companies?.length) {
      candidates = candidates.filter(c =>
        options.companies!.some(cid =>
          c.metadata?.companyId === cid ||
          (c.metadata?.companyIds as string[])?.includes(cid)
        )
      )
    }

    if (options.difficulty?.length) {
      candidates = candidates.filter(c =>
        options.difficulty!.includes(c.metadata?.difficulty as 'easy' | 'medium' | 'hard')
      )
    }

    if (options.types && options.types.length > 1) {
      candidates = candidates.filter(c =>
        options.types!.includes(c.metadata?.type as typeof options.types extends (infer T)[] ? T : never)
      )
    }

    analytics.afterFiltering = candidates.length

    // Step 4: Apply reranking
    const rerankStartTime = Date.now()
    let enhancedResults: EnhancedRetrievalResult[]

    if (options.enableReranking !== false) {
      enhancedResults = await this.rerank(candidates, options)
    } else {
      enhancedResults = candidates.map(c => ({
        id: c.id,
        text: (c.metadata?.text as string) || '',
        type: (c.metadata?.type as string) || '',
        baseScore: c.score,
        finalScore: c.score,
        metadata: c.metadata || {},
        matchedQueries: c.matchedQueries,
      }))
    }

    analytics.rerankingTimeMs = Date.now() - rerankStartTime
    analytics.afterReranking = enhancedResults.length

    // Step 5: Limit results
    const finalResults = enhancedResults.slice(0, options.limit || 10)

    return {
      results: finalResults,
      analytics,
    }
  }

  /**
   * Expand query into related queries for better recall
   */
  private async expandQuery(query: string): Promise<string[]> {
    const queries = [query]

    // Add pattern-based expansions
    const patternKeywords = {
      'two pointers': ['two pointer', 'dual pointer', 'opposite ends'],
      'sliding window': ['window', 'substring', 'subarray', 'contiguous'],
      'binary search': ['search', 'sorted', 'log n', 'logarithmic'],
      'dynamic programming': ['dp', 'memoization', 'tabulation', 'optimal substructure'],
      'dfs': ['depth first', 'recursion', 'backtracking'],
      'bfs': ['breadth first', 'level order', 'shortest path'],
      'graph': ['node', 'edge', 'vertex', 'connected'],
      'tree': ['binary tree', 'bst', 'node', 'traversal'],
      'hash': ['hashmap', 'dictionary', 'map', 'set'],
    }

    const lowerQuery = query.toLowerCase()

    for (const [pattern, variations] of Object.entries(patternKeywords)) {
      if (lowerQuery.includes(pattern) || variations.some(v => lowerQuery.includes(v))) {
        // Add related terms as separate queries
        for (const variation of variations.slice(0, 2)) {
          if (!lowerQuery.includes(variation)) {
            queries.push(query + ' ' + variation)
          }
        }
        break
      }
    }

    // Add difficulty variations if mentioned
    if (lowerQuery.includes('easy')) {
      queries.push(query.replace(/easy/gi, 'beginner friendly'))
    } else if (lowerQuery.includes('hard')) {
      queries.push(query.replace(/hard/gi, 'challenging advanced'))
    }

    return queries.slice(0, 5) // Max 5 query variations
  }

  /**
   * Advanced reranking with multiple signals
   */
  private async rerank(
    candidates: (QueryResult & { matchedQueries: string[] })[],
    options: AdvancedRetrievalOptions
  ): Promise<EnhancedRetrievalResult[]> {
    const weights = {
      similarity: 0.5,
      recency: 0.1,
      relevance: 0.2,
      popularity: 0.1,
      userHistory: 0.1,
      ...options.rerankingWeights,
    }

    const now = Date.now()
    const maxAge = 365 * 24 * 60 * 60 * 1000 // 1 year

    return candidates.map(candidate => {
      let finalScore = 0

      // 1. Base similarity score
      finalScore += candidate.score * weights.similarity

      // 2. Recency boost
      const timestamp = candidate.metadata?.timestamp || candidate.metadata?.createdAt
      if (timestamp) {
        const age = now - new Date(timestamp as string).getTime()
        const recencyScore = Math.max(0, 1 - (age / maxAge))
        finalScore += recencyScore * weights.recency
      }

      // 3. Relevance boost (based on matched queries)
      const queryMatchBoost = Math.min(1, candidate.matchedQueries.length / 3)
      finalScore += queryMatchBoost * weights.relevance

      // 4. Popularity/importance boost
      const importance = (candidate.metadata?.importance as number) || 5
      const popularityScore = importance / 10
      finalScore += popularityScore * weights.popularity

      // 5. User history match (if enabled)
      if (options.enablePersonalization && options.userId) {
        const isUserContent = candidate.metadata?.userId === options.userId ||
                              candidate.metadata?.user_id === options.userId
        if (isUserContent) {
          finalScore += weights.userHistory
        }
      }

      // 6. Pattern match boost
      if (options.patterns?.length) {
        const matchedPatterns = options.patterns.filter(p =>
          candidate.metadata?.pattern === p ||
          (candidate.metadata?.patterns as string[])?.includes(p)
        )
        if (matchedPatterns.length > 0) {
          finalScore += 0.1 * (matchedPatterns.length / options.patterns.length)
        }
      }

      // 7. Company match boost
      if (options.companies?.length) {
        const matchedCompanies = options.companies.filter(c =>
          candidate.metadata?.companyId === c ||
          (candidate.metadata?.companyIds as string[])?.includes(c)
        )
        if (matchedCompanies.length > 0) {
          finalScore += 0.1 * (matchedCompanies.length / options.companies.length)
        }
      }

      return {
        id: candidate.id,
        text: (candidate.metadata?.text as string) || (candidate.metadata?.content as string) || '',
        type: (candidate.metadata?.type as string) || (candidate.metadata?.knowledgeType as string) || '',
        baseScore: candidate.score,
        finalScore: Math.min(1, finalScore), // Cap at 1.0
        metadata: candidate.metadata || {},
        matchedQueries: candidate.matchedQueries,
      }
    }).sort((a, b) => b.finalScore - a.finalScore)
  }

  /**
   * Retrieve knowledge for a specific pattern
   */
  async retrievePatternKnowledge(
    pattern: DSAPattern,
    options: {
      limit?: number
      includeRelated?: boolean
      company?: CompanyId
    } = {}
  ): Promise<EnhancedRetrievalResult[]> {
    const query = `${pattern} algorithm data structure pattern`

    const { results } = await this.retrieve({
      query,
      limit: options.limit || 5,
      types: ['knowledge'],
      patterns: [pattern],
      companies: options.company ? [options.company] : undefined,
      enableQueryExpansion: true,
      enableReranking: true,
    })

    return results
  }

  /**
   * Retrieve company-specific interview knowledge
   */
  async retrieveCompanyKnowledge(
    company: CompanyId,
    options: {
      limit?: number
      patterns?: DSAPattern[]
    } = {}
  ): Promise<EnhancedRetrievalResult[]> {
    const query = `${company} interview tips patterns`

    const { results } = await this.retrieve({
      query,
      limit: options.limit || 5,
      types: ['knowledge'],
      companies: [company],
      patterns: options.patterns,
      enableQueryExpansion: true,
      enableReranking: true,
    })

    return results
  }

  /**
   * Retrieve similar problems for recommendations
   */
  async retrieveSimilarProblems(
    problemText: string,
    options: {
      limit?: number
      excludeProblemId?: string
      userId?: string
      excludeSolved?: boolean
    } = {}
  ): Promise<EnhancedRetrievalResult[]> {
    const { results } = await this.retrieve({
      query: problemText,
      limit: options.limit || 10,
      types: ['problem'],
      excludeIds: options.excludeProblemId ? [options.excludeProblemId] : undefined,
      enableReranking: true,
    })

    return results
  }

  /**
   * Retrieve context-aware hints
   */
  async retrieveContextualHints(
    problemText: string,
    userCode: string,
    options: {
      limit?: number
      pattern?: DSAPattern
    } = {}
  ): Promise<EnhancedRetrievalResult[]> {
    const combinedQuery = `${problemText}\n\nUser approach:\n${userCode}`

    const { results } = await this.retrieve({
      query: combinedQuery,
      limit: options.limit || 3,
      types: ['hint', 'knowledge'],
      patterns: options.pattern ? [options.pattern] : undefined,
      enableQueryExpansion: true,
      enableReranking: true,
    })

    return results
  }

  /**
   * Retrieve user's past solutions for reference
   */
  async retrieveUserSolutions(
    userId: string,
    currentProblem: string,
    options: {
      limit?: number
      onlyPassed?: boolean
    } = {}
  ): Promise<EnhancedRetrievalResult[]> {
    const { results } = await this.retrieve({
      query: currentProblem,
      limit: options.limit || 5,
      types: ['solution'],
      userId,
      enablePersonalization: true,
      enableReranking: true,
    })

    if (options.onlyPassed) {
      return results.filter(r =>
        (r.metadata?.tags as string[])?.includes('passed')
      )
    }

    return results
  }
}

/**
 * Singleton instance
 */
let retrieverInstance: AdvancedRetriever | null = null

export function getAdvancedRetriever(): AdvancedRetriever {
  if (!retrieverInstance) {
    retrieverInstance = new AdvancedRetriever()
  }
  return retrieverInstance
}

/**
 * Convenience function for quick retrieval
 */
export async function advancedRetrieve(
  options: AdvancedRetrievalOptions
): Promise<EnhancedRetrievalResult[]> {
  const { results } = await getAdvancedRetriever().retrieve(options)
  return results
}
