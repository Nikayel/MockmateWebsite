/**
 * RAG System Configuration
 *
 * Centralizes all configurable values for the RAG system.
 * These can be overridden via environment variables for different environments.
 *
 * Industry Standard: Configuration should be externalized and environment-specific.
 */

// =============================================================================
// EMBEDDING CONFIGURATION
// =============================================================================

export const EMBEDDING_CONFIG = {
  /**
   * Cache configuration for embedding results
   */
  cache: {
    /** Time-to-live for cached embeddings (default: 24 hours) */
    ttlMs: parseInt(process.env.RAG_CACHE_TTL_MS || String(24 * 60 * 60 * 1000), 10),
    /** Maximum number of embeddings to cache (default: 1000) */
    maxSize: parseInt(process.env.RAG_CACHE_MAX_SIZE || "1000", 10),
    /** Cleanup interval for expired cache entries (default: 5 minutes) */
    cleanupIntervalMs: parseInt(
      process.env.RAG_CACHE_CLEANUP_INTERVAL_MS || String(5 * 60 * 1000),
      10
    ),
  },

  /**
   * Gemini embedding provider configuration
   */
  gemini: {
    /** Default model for Gemini embeddings */
    model: process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004",
    /** Maximum retries for failed requests */
    maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || "3", 10),
    /** Request timeout in milliseconds */
    timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS || "30000", 10),
    /** Batch size for multiple embeddings */
    batchSize: parseInt(process.env.GEMINI_BATCH_SIZE || "100", 10),
    /** Default task type for embeddings */
    taskType: process.env.GEMINI_TASK_TYPE || "RETRIEVAL_DOCUMENT",
    /** Rate limit: requests per minute */
    rateLimitRequestsPerMinute: parseInt(process.env.GEMINI_RATE_LIMIT || "1500", 10),
    /** Minimum delay between requests in ms */
    minRequestDelayMs: parseInt(process.env.GEMINI_MIN_REQUEST_DELAY_MS || "100", 10),
  },

  /**
   * OpenAI embedding provider configuration
   */
  openai: {
    /** Default model for OpenAI embeddings */
    model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    /** Default dimensions for embeddings */
    dimensions: parseInt(process.env.OPENAI_EMBEDDING_DIMENSIONS || "1536", 10),
    /** Maximum retries for failed requests */
    maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || "3", 10),
    /** Request timeout in milliseconds */
    timeoutMs: parseInt(process.env.OPENAI_TIMEOUT_MS || "30000", 10),
    /** Batch size for multiple embeddings */
    batchSize: parseInt(process.env.OPENAI_BATCH_SIZE || "100", 10),
  },

  /**
   * Hybrid provider configuration
   */
  hybrid: {
    /** Default mode for hybrid embeddings */
    mode: process.env.RAG_HYBRID_MODE || "gemini-with-fallback",
    /** Combined weights for multi-provider mode */
    combinedWeights: {
      openai: parseFloat(process.env.RAG_WEIGHT_OPENAI || "0.7"),
      tfidf: parseFloat(process.env.RAG_WEIGHT_TFIDF || "0.3"),
    },
  },
} as const

// =============================================================================
// VECTOR DATABASE CONFIGURATION
// =============================================================================

export const VECTOR_DB_CONFIG = {
  /**
   * Pinecone configuration
   */
  pinecone: {
    /** Index name for Pinecone */
    indexName: process.env.PINECONE_INDEX_NAME || "codesparring-rag",
    /** Namespace prefix for organizing vectors */
    namespacePrefix: process.env.PINECONE_NAMESPACE_PREFIX || "mockmate_",
    /** Batch size for upsert operations */
    batchSize: parseInt(process.env.PINECONE_BATCH_SIZE || "100", 10),
    /** Supported vector dimensions */
    supportedDimensions: [256, 768, 1536],
  },

  /**
   * Firestore configuration
   */
  firestore: {
    /** Collection name for text embeddings */
    collectionName: process.env.FIRESTORE_EMBEDDINGS_COLLECTION || "text_embeddings",
    /** Maximum documents to fetch for similarity search */
    maxFetchSize: parseInt(process.env.FIRESTORE_MAX_FETCH_SIZE || "200", 10),
  },
} as const

// =============================================================================
// RETRIEVAL CONFIGURATION
// =============================================================================

export const RETRIEVAL_CONFIG = {
  /**
   * Default retrieval parameters
   */
  defaults: {
    /** Default number of results to return */
    limit: parseInt(process.env.RAG_DEFAULT_LIMIT || "5", 10),
    /** Maximum number of results allowed */
    maxLimit: parseInt(process.env.RAG_MAX_LIMIT || "50", 10),
    /** Default minimum similarity threshold */
    minSimilarity: parseFloat(process.env.RAG_MIN_SIMILARITY || "0.3"),
    /** Timeout for retrieval operations in ms */
    timeoutMs: parseInt(process.env.RAG_RETRIEVAL_TIMEOUT_MS || "30000", 10),
  },

  /**
   * Reranking weights (must sum to ~1.0)
   */
  rerankingWeights: {
    similarity: parseFloat(process.env.RAG_RERANK_SIMILARITY || "0.5"),
    recency: parseFloat(process.env.RAG_RERANK_RECENCY || "0.1"),
    relevance: parseFloat(process.env.RAG_RERANK_RELEVANCE || "0.2"),
    popularity: parseFloat(process.env.RAG_RERANK_POPULARITY || "0.1"),
    userHistory: parseFloat(process.env.RAG_RERANK_USER_HISTORY || "0.1"),
  },

  /**
   * Universal hybrid search settings.
   * Semantic and BM25 retrieval run as parallel candidate generators, then rerank once.
   */
  hybridSearch: {
    enabledByDefault: process.env.RAG_HYBRID_SEARCH_ENABLED !== "false",
    semanticCandidateMultiplier: parseInt(process.env.RAG_SEMANTIC_CANDIDATE_MULTIPLIER || "4", 10),
    bm25CandidateMultiplier: parseInt(process.env.RAG_BM25_CANDIDATE_MULTIPLIER || "4", 10),
    maxSemanticCandidates: parseInt(process.env.RAG_MAX_SEMANTIC_CANDIDATES || "100", 10),
    maxBM25Candidates: parseInt(process.env.RAG_MAX_BM25_CANDIDATES || "100", 10),
    corpusFetchLimit: parseInt(process.env.RAG_BM25_CORPUS_FETCH_LIMIT || "500", 10),
    weights: {
      semantic: parseFloat(process.env.RAG_WEIGHT_SEMANTIC || "0.6"),
      bm25: parseFloat(process.env.RAG_WEIGHT_BM25 || "0.25"),
      boosts: parseFloat(process.env.RAG_WEIGHT_BOOSTS || "0.15"),
    },
  },

  /**
   * Query expansion settings
   */
  queryExpansion: {
    /** Maximum number of expanded queries */
    maxQueries: parseInt(process.env.RAG_MAX_EXPANDED_QUERIES || "5", 10),
    /** Enable query expansion by default */
    enabledByDefault: process.env.RAG_QUERY_EXPANSION_ENABLED !== "false",
  },

  /**
   * Similarity thresholds for different content types
   */
  similarityThresholds: {
    problem: parseFloat(process.env.RAG_SIMILARITY_PROBLEM || "0.3"),
    hint: parseFloat(process.env.RAG_SIMILARITY_HINT || "0.35"),
    solution: parseFloat(process.env.RAG_SIMILARITY_SOLUTION || "0.4"),
    knowledge: parseFloat(process.env.RAG_SIMILARITY_KNOWLEDGE || "0.3"),
  },
} as const

// =============================================================================
// INPUT VALIDATION CONFIGURATION
// =============================================================================

export const VALIDATION_CONFIG = {
  /** Maximum length for query text */
  maxQueryLength: parseInt(process.env.RAG_MAX_QUERY_LENGTH || "5000", 10),
  /** Maximum length for code input */
  maxCodeLength: parseInt(process.env.RAG_MAX_CODE_LENGTH || "50000", 10),
  /** Maximum length for problem text */
  maxProblemTextLength: parseInt(process.env.RAG_MAX_PROBLEM_TEXT_LENGTH || "10000", 10),
  /** Minimum length for text to be embedded */
  minTextLength: parseInt(process.env.RAG_MIN_TEXT_LENGTH || "3", 10),
  /** Maximum length for text to be embedded */
  maxEmbeddingTextLength: parseInt(process.env.RAG_MAX_EMBEDDING_TEXT_LENGTH || "10000", 10),
} as const

// =============================================================================
// CIRCUIT BREAKER CONFIGURATION
// =============================================================================

export const CIRCUIT_BREAKER_CONFIG = {
  /** Number of failures before opening the circuit */
  threshold: parseInt(process.env.RAG_CIRCUIT_THRESHOLD || "5", 10),
  /** Time to wait before attempting to close circuit (ms) */
  timeoutMs: parseInt(process.env.RAG_CIRCUIT_TIMEOUT_MS || "60000", 10),
} as const

// =============================================================================
// RATE LIMITING CONFIGURATION
// =============================================================================

export const RATE_LIMIT_CONFIG = {
  /** RAG API rate limit - requests per minute */
  ragApi: {
    maxRequests: parseInt(process.env.RAG_RATE_LIMIT_REQUESTS || "30", 10),
    intervalMs: parseInt(process.env.RAG_RATE_LIMIT_INTERVAL_MS || "60000", 10),
  },
  /** Storage operations rate limit - requests per minute */
  storage: {
    maxRequests: parseInt(process.env.RAG_STORAGE_RATE_LIMIT_REQUESTS || "50", 10),
    intervalMs: parseInt(process.env.RAG_STORAGE_RATE_LIMIT_INTERVAL_MS || "60000", 10),
  },
  /** Embedding generation rate limit - requests per minute */
  embedding: {
    maxRequests: parseInt(process.env.RAG_EMBEDDING_RATE_LIMIT_REQUESTS || "20", 10),
    intervalMs: parseInt(process.env.RAG_EMBEDDING_RATE_LIMIT_INTERVAL_MS || "60000", 10),
  },
} as const

// =============================================================================
// MONITORING CONFIGURATION
// =============================================================================

export const MONITORING_CONFIG = {
  /** Maximum number of embedding metrics to keep in memory */
  maxEmbeddingMetrics: parseInt(process.env.RAG_MAX_EMBEDDING_METRICS || "1000", 10),
  /** Maximum number of retrieval metrics to keep in memory */
  maxRetrievalMetrics: parseInt(process.env.RAG_MAX_RETRIEVAL_METRICS || "1000", 10),
  /** Maximum number of errors to keep in memory */
  maxErrors: parseInt(process.env.RAG_MAX_ERRORS || "100", 10),
  /** Default period for metrics queries (hours) */
  defaultMetricsPeriodHours: parseInt(process.env.RAG_METRICS_PERIOD_HOURS || "24", 10),
} as const

// =============================================================================
// COST ESTIMATION CONFIGURATION
// =============================================================================

export const COST_CONFIG = {
  /** OpenAI embedding cost per 1K tokens */
  openaiCostPer1kTokens: parseFloat(process.env.RAG_OPENAI_COST_PER_1K || "0.00002"),
  /** Estimated tokens per embedding */
  estimatedTokensPerEmbedding: parseInt(process.env.RAG_EST_TOKENS_PER_EMBEDDING || "250", 10),
  /** Firestore read cost per 100K operations */
  firestoreReadCostPer100k: parseFloat(process.env.RAG_FIRESTORE_READ_COST || "0.036"),
} as const

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all RAG configuration as a single object
 * Useful for debugging and logging
 */
export function getAllConfig() {
  return {
    embedding: EMBEDDING_CONFIG,
    vectorDb: VECTOR_DB_CONFIG,
    retrieval: RETRIEVAL_CONFIG,
    validation: VALIDATION_CONFIG,
    circuitBreaker: CIRCUIT_BREAKER_CONFIG,
    rateLimit: RATE_LIMIT_CONFIG,
    monitoring: MONITORING_CONFIG,
    cost: COST_CONFIG,
  }
}

/**
 * Validate configuration values
 * Returns array of validation errors (empty if valid)
 */
export function validateConfig(): string[] {
  const errors: string[] = []

  // Validate reranking weights sum to approximately 1.0
  const weightsSum = Object.values(RETRIEVAL_CONFIG.rerankingWeights).reduce((a, b) => a + b, 0)
  if (weightsSum < 0.9 || weightsSum > 1.1) {
    errors.push(`Reranking weights sum to ${weightsSum}, expected ~1.0`)
  }

  const hybridWeightsSum = Object.values(RETRIEVAL_CONFIG.hybridSearch.weights).reduce(
    (a, b) => a + b,
    0
  )
  if (hybridWeightsSum < 0.9 || hybridWeightsSum > 1.1) {
    errors.push(`Hybrid search weights sum to ${hybridWeightsSum}, expected ~1.0`)
  }

  // Validate similarity thresholds are in valid range
  for (const [key, value] of Object.entries(RETRIEVAL_CONFIG.similarityThresholds)) {
    if (value < 0 || value > 1) {
      errors.push(`Similarity threshold for ${key} (${value}) must be between 0 and 1`)
    }
  }

  // Validate cache configuration
  if (EMBEDDING_CONFIG.cache.maxSize <= 0) {
    errors.push(`Cache max size must be positive, got ${EMBEDDING_CONFIG.cache.maxSize}`)
  }

  // Validate rate limits
  if (RATE_LIMIT_CONFIG.ragApi.maxRequests <= 0) {
    errors.push(`RAG API rate limit must be positive, got ${RATE_LIMIT_CONFIG.ragApi.maxRequests}`)
  }

  return errors
}

// Log configuration validation on module load (in development)
if (process.env.NODE_ENV === "development") {
  const errors = validateConfig()
  if (errors.length > 0) {
    console.warn("[RAG Config] Validation warnings:", errors)
  }
}
