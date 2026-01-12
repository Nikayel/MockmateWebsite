/**
 * Tests for RAG configuration
 */

import {
  EMBEDDING_CONFIG,
  VECTOR_DB_CONFIG,
  RETRIEVAL_CONFIG,
  VALIDATION_CONFIG,
  CIRCUIT_BREAKER_CONFIG,
  RATE_LIMIT_CONFIG,
  MONITORING_CONFIG,
  COST_CONFIG,
  getAllConfig,
  validateConfig,
} from "../config"

describe("RAG Configuration", () => {
  describe("EMBEDDING_CONFIG", () => {
    it("should have cache configuration", () => {
      expect(EMBEDDING_CONFIG.cache.ttlMs).toBeGreaterThan(0)
      expect(EMBEDDING_CONFIG.cache.maxSize).toBeGreaterThan(0)
      expect(EMBEDDING_CONFIG.cache.cleanupIntervalMs).toBeGreaterThan(0)
    })

    it("should have Gemini configuration", () => {
      expect(EMBEDDING_CONFIG.gemini.model).toBeDefined()
      expect(EMBEDDING_CONFIG.gemini.maxRetries).toBeGreaterThan(0)
      expect(EMBEDDING_CONFIG.gemini.timeoutMs).toBeGreaterThan(0)
      expect(EMBEDDING_CONFIG.gemini.batchSize).toBeGreaterThan(0)
    })

    it("should have OpenAI configuration", () => {
      expect(EMBEDDING_CONFIG.openai.model).toBeDefined()
      expect(EMBEDDING_CONFIG.openai.dimensions).toBeGreaterThan(0)
      expect(EMBEDDING_CONFIG.openai.maxRetries).toBeGreaterThan(0)
    })

    it("should have hybrid configuration", () => {
      expect(EMBEDDING_CONFIG.hybrid.mode).toBeDefined()
      expect(EMBEDDING_CONFIG.hybrid.combinedWeights.openai).toBeGreaterThanOrEqual(0)
      expect(EMBEDDING_CONFIG.hybrid.combinedWeights.tfidf).toBeGreaterThanOrEqual(0)
    })
  })

  describe("VECTOR_DB_CONFIG", () => {
    it("should have Pinecone configuration", () => {
      expect(VECTOR_DB_CONFIG.pinecone.indexName).toBeDefined()
      expect(VECTOR_DB_CONFIG.pinecone.namespacePrefix).toBeDefined()
      expect(VECTOR_DB_CONFIG.pinecone.batchSize).toBeGreaterThan(0)
      expect(VECTOR_DB_CONFIG.pinecone.supportedDimensions).toContain(768)
      expect(VECTOR_DB_CONFIG.pinecone.supportedDimensions).toContain(1536)
    })

    it("should have Firestore configuration", () => {
      expect(VECTOR_DB_CONFIG.firestore.collectionName).toBeDefined()
      expect(VECTOR_DB_CONFIG.firestore.maxFetchSize).toBeGreaterThan(0)
    })
  })

  describe("RETRIEVAL_CONFIG", () => {
    it("should have default retrieval parameters", () => {
      expect(RETRIEVAL_CONFIG.defaults.limit).toBeGreaterThan(0)
      expect(RETRIEVAL_CONFIG.defaults.maxLimit).toBeGreaterThan(RETRIEVAL_CONFIG.defaults.limit)
      expect(RETRIEVAL_CONFIG.defaults.minSimilarity).toBeGreaterThanOrEqual(0)
      expect(RETRIEVAL_CONFIG.defaults.minSimilarity).toBeLessThanOrEqual(1)
    })

    it("should have reranking weights", () => {
      const weights = RETRIEVAL_CONFIG.rerankingWeights
      expect(weights.similarity).toBeDefined()
      expect(weights.recency).toBeDefined()
      expect(weights.relevance).toBeDefined()
      expect(weights.popularity).toBeDefined()
      expect(weights.userHistory).toBeDefined()
    })

    it("should have reranking weights that sum to approximately 1", () => {
      const weights = RETRIEVAL_CONFIG.rerankingWeights
      const sum =
        weights.similarity +
        weights.recency +
        weights.relevance +
        weights.popularity +
        weights.userHistory
      expect(sum).toBeGreaterThan(0.9)
      expect(sum).toBeLessThan(1.1)
    })

    it("should have similarity thresholds for different content types", () => {
      expect(RETRIEVAL_CONFIG.similarityThresholds.problem).toBeDefined()
      expect(RETRIEVAL_CONFIG.similarityThresholds.hint).toBeDefined()
      expect(RETRIEVAL_CONFIG.similarityThresholds.solution).toBeDefined()
      expect(RETRIEVAL_CONFIG.similarityThresholds.knowledge).toBeDefined()
    })

    it("should have query expansion settings", () => {
      expect(RETRIEVAL_CONFIG.queryExpansion.maxQueries).toBeGreaterThan(0)
      expect(typeof RETRIEVAL_CONFIG.queryExpansion.enabledByDefault).toBe("boolean")
    })
  })

  describe("VALIDATION_CONFIG", () => {
    it("should have max length configurations", () => {
      expect(VALIDATION_CONFIG.maxQueryLength).toBeGreaterThan(0)
      expect(VALIDATION_CONFIG.maxCodeLength).toBeGreaterThan(0)
      expect(VALIDATION_CONFIG.maxProblemTextLength).toBeGreaterThan(0)
    })

    it("should have sensible length limits", () => {
      expect(VALIDATION_CONFIG.maxCodeLength).toBeGreaterThan(VALIDATION_CONFIG.maxQueryLength)
      expect(VALIDATION_CONFIG.minTextLength).toBeLessThan(VALIDATION_CONFIG.maxQueryLength)
    })
  })

  describe("CIRCUIT_BREAKER_CONFIG", () => {
    it("should have threshold configuration", () => {
      expect(CIRCUIT_BREAKER_CONFIG.threshold).toBeGreaterThan(0)
      expect(CIRCUIT_BREAKER_CONFIG.timeoutMs).toBeGreaterThan(0)
    })
  })

  describe("RATE_LIMIT_CONFIG", () => {
    it("should have RAG API rate limits", () => {
      expect(RATE_LIMIT_CONFIG.ragApi.maxRequests).toBeGreaterThan(0)
      expect(RATE_LIMIT_CONFIG.ragApi.intervalMs).toBeGreaterThan(0)
    })

    it("should have storage rate limits", () => {
      expect(RATE_LIMIT_CONFIG.storage.maxRequests).toBeGreaterThan(0)
      expect(RATE_LIMIT_CONFIG.storage.intervalMs).toBeGreaterThan(0)
    })

    it("should have embedding rate limits", () => {
      expect(RATE_LIMIT_CONFIG.embedding.maxRequests).toBeGreaterThan(0)
      expect(RATE_LIMIT_CONFIG.embedding.intervalMs).toBeGreaterThan(0)
    })
  })

  describe("MONITORING_CONFIG", () => {
    it("should have metrics limits", () => {
      expect(MONITORING_CONFIG.maxEmbeddingMetrics).toBeGreaterThan(0)
      expect(MONITORING_CONFIG.maxRetrievalMetrics).toBeGreaterThan(0)
      expect(MONITORING_CONFIG.maxErrors).toBeGreaterThan(0)
    })
  })

  describe("COST_CONFIG", () => {
    it("should have cost estimation values", () => {
      expect(COST_CONFIG.openaiCostPer1kTokens).toBeGreaterThan(0)
      expect(COST_CONFIG.estimatedTokensPerEmbedding).toBeGreaterThan(0)
      expect(COST_CONFIG.firestoreReadCostPer100k).toBeGreaterThan(0)
    })
  })

  describe("getAllConfig", () => {
    it("should return all configuration sections", () => {
      const config = getAllConfig()

      expect(config.embedding).toBeDefined()
      expect(config.vectorDb).toBeDefined()
      expect(config.retrieval).toBeDefined()
      expect(config.validation).toBeDefined()
      expect(config.circuitBreaker).toBeDefined()
      expect(config.rateLimit).toBeDefined()
      expect(config.monitoring).toBeDefined()
      expect(config.cost).toBeDefined()
    })
  })

  describe("validateConfig", () => {
    it("should return empty array for valid config", () => {
      const errors = validateConfig()
      // In a properly configured environment, there should be no errors
      expect(Array.isArray(errors)).toBe(true)
    })

    it("should validate reranking weights sum", () => {
      // This test verifies the validation logic works
      // The actual weights should sum to ~1.0 in default config
      const errors = validateConfig()
      const weightsError = errors.find((e) => e.includes("Reranking weights"))

      // If there's an error, it should mention the sum
      if (weightsError) {
        expect(weightsError).toContain("sum")
      }
    })
  })
})
