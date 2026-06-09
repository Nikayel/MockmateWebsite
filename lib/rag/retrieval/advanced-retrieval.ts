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

import { getHybridProvider } from "../embeddings/hybrid-provider"
import { vectorDB } from "../vectordb"
import type { QueryResult, VectorContentType } from "../types"
import { RETRIEVAL_CONFIG } from "../config"
import { rankBM25 } from "./bm25"
import { fetchLexicalCorpus } from "./lexical-corpus"
import { getRAGMonitor } from "../monitoring"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type { CompanyId } from "@/lib/data/company-questions/types"

export type RetrievalStrategy = "semantic" | "bm25" | "hybrid"

/**
 * Advanced retrieval options
 */
export interface AdvancedRetrievalOptions {
  // Basic options
  query: string
  limit?: number
  minSimilarity?: number

  // Filtering
  types?: VectorContentType[]
  userId?: string
  patterns?: DSAPattern[]
  companies?: CompanyId[]
  difficulty?: ("easy" | "medium" | "hard")[]
  excludeIds?: string[]

  // Advanced options
  strategy?: RetrievalStrategy // Retrieval candidate strategy (default: config-driven hybrid)
  enableQueryExpansion?: boolean // Generate related queries
  enableHybridSearch?: boolean // Combine semantic + keyword
  enableReranking?: boolean // Apply advanced reranking
  enablePersonalization?: boolean // Personalize based on user
  contextDocuments?: string[] // Additional context for retrieval
  feature?: "chat" | "hints" | "recommendations" | "roadmap" | "feedback" | "similarity" | "other"

  // Reranking weights
  rerankingWeights?: {
    similarity: number // Base similarity (default: 0.5)
    recency: number // Recency boost (default: 0.1)
    relevance: number // Query relevance (default: 0.2)
    popularity: number // Document popularity (default: 0.1)
    userHistory: number // User history match (default: 0.1)
  }
}

/**
 * Enhanced retrieval result
 */
export interface EnhancedRetrievalResult {
  id: string
  text: string
  type: string
  baseScore: number // Original similarity score
  finalScore: number // After reranking
  semanticScore?: number
  bm25Score?: number
  matchedSources?: Array<"semantic" | "bm25">
  matchedTerms?: string[]
  metadata: Record<string, unknown>
  highlights?: string[] // Relevant snippets
  matchedQueries?: string[] // Which expanded queries matched
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
  strategy: RetrievalStrategy
  semanticCandidateCount: number
  bm25CandidateCount: number
  overlapCount: number
  emptyResult: boolean
  topScore?: number
  retrievalTimeMs: number
  rerankingTimeMs: number
}

type RetrievalCandidate = QueryResult & {
  matchedQueries: string[]
  semanticScore: number
  bm25Score: number
  matchedSources: Array<"semantic" | "bm25">
  matchedTerms: string[]
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
    const strategy = this.resolveStrategy(options)
    const analytics: RetrievalAnalytics = {
      totalCandidates: 0,
      afterFiltering: 0,
      afterReranking: 0,
      queryExpansionUsed: options.enableQueryExpansion || false,
      strategy,
      semanticCandidateCount: 0,
      bm25CandidateCount: 0,
      overlapCount: 0,
      emptyResult: false,
      retrievalTimeMs: 0,
      rerankingTimeMs: 0,
    }

    // Step 1: Generate query embedding(s)
    const queries = options.enableQueryExpansion
      ? await this.expandQuery(options.query)
      : [options.query]

    analytics.expansionQueries = queries

    // Step 2: Retrieve candidates for each query
    const allCandidates: Map<string, RetrievalCandidate> = new Map()

    if (strategy === "semantic" || strategy === "hybrid") {
      const semanticCount = await this.retrieveSemanticCandidates(queries, options, allCandidates)
      analytics.semanticCandidateCount = semanticCount
    }

    if (strategy === "bm25" || strategy === "hybrid") {
      const bm25Count = await this.retrieveBM25Candidates(queries, options, allCandidates)
      analytics.bm25CandidateCount = bm25Count
    }

    analytics.overlapCount = Array.from(allCandidates.values()).filter(
      (candidate) => candidate.matchedSources.length > 1
    ).length

    analytics.totalCandidates = allCandidates.size
    const retrievalEndTime = Date.now()
    analytics.retrievalTimeMs = retrievalEndTime - startTime

    // Step 3: Apply filtering
    let candidates = Array.from(allCandidates.values())

    if (options.patterns?.length) {
      candidates = candidates.filter((c) =>
        options.patterns!.some(
          (p) =>
            c.metadata?.pattern === p ||
            (c.metadata?.patterns as string[])?.includes(p) ||
            (c.metadata?.tags as string[])?.includes(p)
        )
      )
    }

    if (options.companies?.length) {
      candidates = candidates.filter((c) =>
        options.companies!.some(
          (cid) =>
            c.metadata?.companyId === cid || (c.metadata?.companyIds as string[])?.includes(cid)
        )
      )
    }

    if (options.difficulty?.length) {
      candidates = candidates.filter((c) =>
        options.difficulty!.includes(c.metadata?.difficulty as "easy" | "medium" | "hard")
      )
    }

    if (options.types && options.types.length > 1) {
      candidates = candidates.filter((c) =>
        options.types!.includes(c.metadata?.type as VectorContentType)
      )
    }

    analytics.afterFiltering = candidates.length

    // Step 4: Apply reranking
    const rerankStartTime = Date.now()
    let enhancedResults: EnhancedRetrievalResult[]

    if (options.enableReranking !== false) {
      enhancedResults = await this.rerank(candidates, options)
    } else {
      enhancedResults = candidates.map((c) => ({
        id: c.id,
        text: (c.metadata?.text as string) || "",
        type: (c.metadata?.type as string) || "",
        baseScore: c.score,
        finalScore: c.score,
        semanticScore: c.semanticScore,
        bm25Score: c.bm25Score,
        matchedSources: c.matchedSources,
        matchedTerms: c.matchedTerms,
        metadata: c.metadata || {},
        matchedQueries: c.matchedQueries,
      }))
    }

    analytics.rerankingTimeMs = Date.now() - rerankStartTime
    analytics.afterReranking = enhancedResults.length

    // Step 5: Limit results
    const finalResults = enhancedResults.slice(0, options.limit || 10)
    analytics.emptyResult = finalResults.length === 0
    analytics.topScore = finalResults[0]?.finalScore

    getRAGMonitor().recordRetrieval(
      finalResults.length,
      analytics.retrievalTimeMs,
      analytics.rerankingTimeMs,
      {
        strategy,
        semanticCandidateCount: analytics.semanticCandidateCount,
        bm25CandidateCount: analytics.bm25CandidateCount,
        overlapCount: analytics.overlapCount,
        emptyResult: analytics.emptyResult,
        topScore: analytics.topScore,
        feature: options.feature || "other",
      }
    )

    return {
      results: finalResults,
      analytics,
    }
  }

  private resolveStrategy(options: AdvancedRetrievalOptions): RetrievalStrategy {
    if (options.strategy) return options.strategy
    if (options.enableHybridSearch === false) return "semantic"
    return RETRIEVAL_CONFIG.hybridSearch.enabledByDefault ? "hybrid" : "semantic"
  }

  private getSemanticTopK(options: AdvancedRetrievalOptions): number {
    const limit = options.limit || RETRIEVAL_CONFIG.defaults.limit
    return Math.min(
      limit * RETRIEVAL_CONFIG.hybridSearch.semanticCandidateMultiplier,
      RETRIEVAL_CONFIG.hybridSearch.maxSemanticCandidates
    )
  }

  private getBM25TopK(options: AdvancedRetrievalOptions): number {
    const limit = options.limit || RETRIEVAL_CONFIG.defaults.limit
    return Math.min(
      limit * RETRIEVAL_CONFIG.hybridSearch.bm25CandidateMultiplier,
      RETRIEVAL_CONFIG.hybridSearch.maxBM25Candidates
    )
  }

  private mergeCandidate(
    allCandidates: Map<string, RetrievalCandidate>,
    result: QueryResult,
    query: string,
    source: "semantic" | "bm25",
    matchedTerms: string[] = []
  ): void {
    const existing = allCandidates.get(result.id)
    const score = result.score || 0

    if (existing) {
      existing.score = Math.max(existing.score, score)
      existing.matchedQueries.push(query)
      if (!existing.matchedSources.includes(source)) existing.matchedSources.push(source)
      if (source === "semantic") existing.semanticScore = Math.max(existing.semanticScore, score)
      if (source === "bm25") existing.bm25Score = Math.max(existing.bm25Score, score)
      existing.matchedTerms = Array.from(new Set([...existing.matchedTerms, ...matchedTerms]))
      existing.metadata = { ...existing.metadata, ...(result.metadata || {}) }
      return
    }

    allCandidates.set(result.id, {
      ...result,
      score,
      matchedQueries: [query],
      semanticScore: source === "semantic" ? score : 0,
      bm25Score: source === "bm25" ? score : 0,
      matchedSources: [source],
      matchedTerms,
    })
  }

  private async retrieveSemanticCandidates(
    queries: string[],
    options: AdvancedRetrievalOptions,
    allCandidates: Map<string, RetrievalCandidate>
  ): Promise<number> {
    let count = 0

    for (const query of queries) {
      const embedding = await this.embeddingProvider.generateEmbedding(query)
      const typesToQuery = options.types?.length ? options.types : [undefined]

      for (const type of typesToQuery) {
        const results = await vectorDB.query(embedding, {
          topK: this.getSemanticTopK(options),
          filter: {
            type,
            userId: options.userId,
            minSimilarity: options.minSimilarity || RETRIEVAL_CONFIG.defaults.minSimilarity,
            excludeIds: options.excludeIds,
          },
          includeMetadata: true,
        })

        count += results.length
        for (const result of results) {
          this.mergeCandidate(allCandidates, result, query, "semantic")
        }
      }
    }

    return count
  }

  private async retrieveBM25Candidates(
    queries: string[],
    options: AdvancedRetrievalOptions,
    allCandidates: Map<string, RetrievalCandidate>
  ): Promise<number> {
    const documents = await fetchLexicalCorpus({
      types: options.types,
      userId: options.userId,
      excludeIds: options.excludeIds,
    })

    let count = 0
    for (const query of queries) {
      const results = rankBM25(query, documents, {
        limit: this.getBM25TopK(options),
      })

      count += results.length
      for (const result of results) {
        this.mergeCandidate(
          allCandidates,
          {
            id: result.document.id,
            score: result.normalizedScore,
            metadata: {
              ...(result.document.metadata || {}),
              text: result.document.text,
              type: result.document.type || result.document.metadata?.type,
            },
          },
          query,
          "bm25",
          result.matchedTerms
        )
      }
    }

    return count
  }

  /**
   * Expand query into related queries for better recall
   */
  private async expandQuery(query: string): Promise<string[]> {
    const queries = [query]

    // Add pattern-based expansions
    const patternKeywords = {
      "two pointers": ["two pointer", "dual pointer", "opposite ends"],
      "sliding window": ["window", "substring", "subarray", "contiguous"],
      "binary search": ["search", "sorted", "log n", "logarithmic"],
      "dynamic programming": ["dp", "memoization", "tabulation", "optimal substructure"],
      dfs: ["depth first", "recursion", "backtracking"],
      bfs: ["breadth first", "level order", "shortest path"],
      graph: ["node", "edge", "vertex", "connected"],
      tree: ["binary tree", "bst", "node", "traversal"],
      hash: ["hashmap", "dictionary", "map", "set"],
    }

    const lowerQuery = query.toLowerCase()

    for (const [pattern, variations] of Object.entries(patternKeywords)) {
      if (lowerQuery.includes(pattern) || variations.some((v) => lowerQuery.includes(v))) {
        // Add related terms as separate queries
        for (const variation of variations.slice(0, 2)) {
          if (!lowerQuery.includes(variation)) {
            queries.push(query + " " + variation)
          }
        }
        break
      }
    }

    // Add difficulty variations if mentioned
    if (lowerQuery.includes("easy")) {
      queries.push(query.replace(/easy/gi, "beginner friendly"))
    } else if (lowerQuery.includes("hard")) {
      queries.push(query.replace(/hard/gi, "challenging advanced"))
    }

    return queries.slice(0, 5) // Max 5 query variations
  }

  /**
   * Advanced reranking with multiple signals
   */
  private async rerank(
    candidates: RetrievalCandidate[],
    options: AdvancedRetrievalOptions
  ): Promise<EnhancedRetrievalResult[]> {
    const strategy = this.resolveStrategy(options)
    const weights = {
      similarity: 0.5,
      recency: 0.1,
      relevance: 0.2,
      popularity: 0.1,
      userHistory: 0.1,
      ...options.rerankingWeights,
    }
    const hybridWeights = RETRIEVAL_CONFIG.hybridSearch.weights

    const now = Date.now()
    const maxAge = 365 * 24 * 60 * 60 * 1000 // 1 year

    return candidates
      .map((candidate) => {
        let legacyScore = 0
        let boostScore = 0

        // 1. Base similarity score
        legacyScore += candidate.semanticScore * weights.similarity

        // 2. Recency boost
        const timestamp = candidate.metadata?.timestamp || candidate.metadata?.createdAt
        if (timestamp) {
          const age = now - new Date(timestamp as string).getTime()
          const recencyScore = Math.max(0, 1 - age / maxAge)
          legacyScore += recencyScore * weights.recency
          boostScore += recencyScore * weights.recency
        }

        // 3. Relevance boost (based on matched queries)
        const queryMatchBoost = Math.min(1, candidate.matchedQueries.length / 3)
        legacyScore += queryMatchBoost * weights.relevance
        boostScore += queryMatchBoost * weights.relevance

        // 4. Popularity/importance boost
        const importance = (candidate.metadata?.importance as number) || 5
        const popularityScore = importance / 10
        legacyScore += popularityScore * weights.popularity
        boostScore += popularityScore * weights.popularity

        // 5. User history match (if enabled)
        if (options.enablePersonalization && options.userId) {
          const isUserContent =
            candidate.metadata?.userId === options.userId ||
            candidate.metadata?.user_id === options.userId
          if (isUserContent) {
            legacyScore += weights.userHistory
            boostScore += weights.userHistory
          }
        }

        // 6. Pattern match boost
        if (options.patterns?.length) {
          const matchedPatterns = options.patterns.filter(
            (p) =>
              candidate.metadata?.pattern === p ||
              (candidate.metadata?.patterns as string[])?.includes(p)
          )
          if (matchedPatterns.length > 0) {
            const patternBoost = 0.1 * (matchedPatterns.length / options.patterns.length)
            legacyScore += patternBoost
            boostScore += patternBoost
          }
        }

        // 7. Company match boost
        if (options.companies?.length) {
          const matchedCompanies = options.companies.filter(
            (c) =>
              candidate.metadata?.companyId === c ||
              (candidate.metadata?.companyIds as string[])?.includes(c)
          )
          if (matchedCompanies.length > 0) {
            const companyBoost = 0.1 * (matchedCompanies.length / options.companies.length)
            legacyScore += companyBoost
            boostScore += companyBoost
          }
        }

        let finalScore: number
        if (strategy === "hybrid") {
          finalScore =
            candidate.semanticScore * hybridWeights.semantic +
            candidate.bm25Score * hybridWeights.bm25 +
            Math.min(1, boostScore) * hybridWeights.boosts
        } else if (strategy === "bm25") {
          finalScore =
            candidate.bm25Score * (hybridWeights.semantic + hybridWeights.bm25) +
            Math.min(1, boostScore) * hybridWeights.boosts
        } else {
          finalScore = legacyScore
        }

        return {
          id: candidate.id,
          text:
            (candidate.metadata?.text as string) || (candidate.metadata?.content as string) || "",
          type:
            (candidate.metadata?.type as string) ||
            (candidate.metadata?.knowledgeType as string) ||
            "",
          baseScore: candidate.score,
          finalScore: Math.min(1, finalScore), // Cap at 1.0
          semanticScore: candidate.semanticScore,
          bm25Score: candidate.bm25Score,
          matchedSources: candidate.matchedSources,
          matchedTerms: candidate.matchedTerms,
          metadata: candidate.metadata || {},
          matchedQueries: candidate.matchedQueries,
        }
      })
      .sort((a, b) => b.finalScore - a.finalScore)
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
      types: ["knowledge"],
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
      types: ["knowledge"],
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
      types: ["problem"],
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
      types: ["hint", "knowledge"],
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
      types: ["solution"],
      userId,
      enablePersonalization: true,
      enableReranking: true,
    })

    if (options.onlyPassed) {
      return results.filter((r) => (r.metadata?.tags as string[])?.includes("passed"))
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
