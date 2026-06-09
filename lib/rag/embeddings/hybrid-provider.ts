/**
 * Hybrid Embedding Provider
 *
 * Combines multiple embedding providers for maximum reliability and quality:
 * - Gemini for high-quality semantic embeddings (primary - 768D, most cost effective)
 * - OpenAI as secondary option (1536D)
 * - TF-IDF for domain-specific keyword matching (fallback + augmentation)
 *
 * Features:
 * - Automatic fallback when primary provider is unavailable
 * - Optional hybrid mode combining embeddings
 * - Caching layer integration
 * - Quality metrics tracking
 */

import type { EmbeddingProvider } from "../types"
import { TFIDFEmbeddingProvider } from "./provider"
import { OpenAIEmbeddingProvider, isOpenAIAvailable, OpenAIEmbeddingModel } from "./openai-provider"
import { GeminiEmbeddingProvider, isGeminiAvailable, GeminiEmbeddingModel } from "./gemini-provider"
import { embeddingCache } from "./cache"
import { getRequiredEmbeddingDimension } from "../vectordb"

export type HybridMode =
  | "gemini-only" // Only Gemini (768D)
  | "gemini-with-fallback" // Gemini first, then TF-IDF
  | "openai-only"
  | "tfidf-only"
  | "openai-with-fallback"
  | "combined"

interface HybridProviderConfig {
  mode?: HybridMode
  // Gemini config (primary)
  geminiModel?: GeminiEmbeddingModel
  // OpenAI config (secondary)
  openaiModel?: OpenAIEmbeddingModel
  openaiDimensions?: number
  combinedWeights?: {
    openai: number // Weight for OpenAI embeddings (0-1)
    tfidf: number // Weight for TF-IDF embeddings (0-1)
  }
  cacheEnabled?: boolean
  cacheTTL?: number // Cache TTL in milliseconds
}

interface EmbeddingMetrics {
  provider: "gemini" | "openai" | "tfidf" | "combined"
  dimensions: number
  latencyMs: number
  cached: boolean
}

/**
 * Hybrid Embedding Provider
 *
 * Provides flexible embedding generation with multiple strategies:
 *
 * 1. gemini-only: Only use Gemini embeddings (768D, most cost-effective)
 * 2. gemini-with-fallback: Try Gemini first, fall back to TF-IDF (recommended)
 * 3. openai-only: Only use OpenAI embeddings (fails if unavailable)
 * 4. tfidf-only: Only use TF-IDF embeddings (always available)
 * 5. openai-with-fallback: Try OpenAI first, fall back to TF-IDF
 * 6. combined: Concatenate embeddings for hybrid search
 */
export class HybridEmbeddingProvider implements EmbeddingProvider {
  private mode: HybridMode
  private geminiProvider: GeminiEmbeddingProvider | null
  private openaiProvider: OpenAIEmbeddingProvider | null
  private tfidfProvider: TFIDFEmbeddingProvider
  private combinedWeights: { openai: number; tfidf: number }
  private cacheEnabled: boolean
  private metrics: EmbeddingMetrics[] = []

  constructor(config: HybridProviderConfig = {}) {
    this.mode = config.mode || "gemini-with-fallback"
    this.cacheEnabled = config.cacheEnabled !== false
    this.combinedWeights = config.combinedWeights || { openai: 0.7, tfidf: 0.3 }

    // Initialize providers
    this.tfidfProvider = new TFIDFEmbeddingProvider()

    // Initialize Gemini provider if available (primary choice)
    if (isGeminiAvailable()) {
      this.geminiProvider = new GeminiEmbeddingProvider({
        model: config.geminiModel || "text-embedding-004",
      })
    } else {
      this.geminiProvider = null
      if (this.mode === "gemini-only") {
        throw new Error("[HybridProvider] gemini-only mode requires GEMINI_API_KEY")
      }
    }

    // Initialize OpenAI provider if available (secondary choice)
    if (isOpenAIAvailable()) {
      this.openaiProvider = new OpenAIEmbeddingProvider({
        model: config.openaiModel,
        dimensions: config.openaiDimensions,
      })
    } else {
      this.openaiProvider = null
      if (this.mode === "openai-only") {
        throw new Error("[HybridProvider] openai-only mode requires OPENAI_API_KEY")
      }
    }

    console.log(
      `[HybridProvider] Initialized with mode: ${this.mode}, Gemini available: ${!!this.geminiProvider}, OpenAI available: ${!!this.openaiProvider}`
    )
  }

  /**
   * Get the active provider name
   */
  getActiveProvider(): string {
    if (this.mode === "combined") return "combined"
    if (this.mode === "tfidf-only") return "tfidf"
    if (this.mode === "gemini-only" || this.mode === "gemini-with-fallback") {
      if (this.geminiProvider?.isConfigured()) return "gemini"
    }
    if (this.mode === "openai-only" || this.mode === "openai-with-fallback") {
      if (this.openaiProvider?.isConfigured()) return "openai"
    }
    // Fallback chain: Gemini -> OpenAI -> TF-IDF
    if (this.geminiProvider?.isConfigured()) return "gemini"
    if (this.openaiProvider?.isConfigured()) return "openai"
    return "tfidf"
  }

  /**
   * Get embedding dimensions based on mode
   */
  getDimensions(): number {
    switch (this.mode) {
      case "gemini-only":
        return this.geminiProvider?.getDimensions() || 768
      case "gemini-with-fallback":
        return this.geminiProvider?.getDimensions() || 768
      case "openai-only":
        return this.openaiProvider?.getDimensions() || 1536
      case "tfidf-only":
        return 256
      case "combined":
        return (this.openaiProvider?.getDimensions() || 0) + 256
      case "openai-with-fallback":
        return this.openaiProvider?.getDimensions() || 256
      default:
        return 768 // Default to Gemini dimensions
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const startTime = Date.now()
    let embedding: number[]
    let provider: "gemini" | "openai" | "tfidf" | "combined" = "tfidf"
    const cached = false

    // Check cache first
    if (this.cacheEnabled) {
      const cacheKey = `${this.mode}:${text}`
      const cachedEmbedding = embeddingCache.get(cacheKey)
      if (cachedEmbedding) {
        this.recordMetrics("combined", cachedEmbedding.length, Date.now() - startTime, true)
        return cachedEmbedding
      }
    }

    try {
      switch (this.mode) {
        case "gemini-only":
          if (!this.geminiProvider) {
            throw new Error("Gemini provider not available")
          }
          embedding = await this.geminiProvider.generateEmbedding(text)
          provider = "gemini"
          break

        case "gemini-with-fallback":
          if (this.geminiProvider?.isConfigured()) {
            try {
              embedding = await this.geminiProvider.generateEmbedding(text)
              provider = "gemini"
            } catch (error) {
              console.warn("[HybridProvider] Gemini failed, falling back to TF-IDF:", error)
              embedding = await this.tfidfProvider.generateEmbedding(text)
              provider = "tfidf"
            }
          } else {
            embedding = await this.tfidfProvider.generateEmbedding(text)
            provider = "tfidf"
          }
          break

        case "openai-only":
          if (!this.openaiProvider) {
            throw new Error("OpenAI provider not available")
          }
          embedding = await this.openaiProvider.generateEmbedding(text)
          provider = "openai"
          break

        case "tfidf-only":
          embedding = await this.tfidfProvider.generateEmbedding(text)
          provider = "tfidf"
          break

        case "combined":
          embedding = await this.generateCombinedEmbedding(text)
          provider = "combined"
          break

        case "openai-with-fallback":
        default:
          // Default fallback chain: Gemini -> OpenAI -> TF-IDF
          if (this.geminiProvider?.isConfigured()) {
            try {
              embedding = await this.geminiProvider.generateEmbedding(text)
              provider = "gemini"
            } catch (error) {
              console.warn("[HybridProvider] Gemini failed, trying OpenAI:", error)
              if (this.openaiProvider?.isConfigured()) {
                try {
                  embedding = await this.openaiProvider.generateEmbedding(text)
                  provider = "openai"
                } catch (openaiError) {
                  console.warn(
                    "[HybridProvider] OpenAI also failed, falling back to TF-IDF:",
                    openaiError
                  )
                  embedding = await this.tfidfProvider.generateEmbedding(text)
                  provider = "tfidf"
                }
              } else {
                embedding = await this.tfidfProvider.generateEmbedding(text)
                provider = "tfidf"
              }
            }
          } else if (this.openaiProvider?.isConfigured()) {
            try {
              embedding = await this.openaiProvider.generateEmbedding(text)
              provider = "openai"
            } catch (error) {
              console.warn("[HybridProvider] OpenAI failed, falling back to TF-IDF:", error)
              embedding = await this.tfidfProvider.generateEmbedding(text)
              provider = "tfidf"
            }
          } else {
            embedding = await this.tfidfProvider.generateEmbedding(text)
            provider = "tfidf"
          }
          break
      }

      await this.validateRequiredDimension(embedding)

      // Cache the result
      if (this.cacheEnabled) {
        const cacheKey = `${this.mode}:${text}`
        embeddingCache.set(cacheKey, embedding)
      }

      this.recordMetrics(provider, embedding.length, Date.now() - startTime, cached)
      return embedding
    } catch (error) {
      console.error("[HybridProvider] Embedding generation failed:", error)
      throw error
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // For efficiency, batch process when possible
    // Try Gemini first (primary), then OpenAI (secondary)
    if (this.mode === "gemini-only" || this.mode === "gemini-with-fallback") {
      if (this.geminiProvider?.isConfigured()) {
        let embeddings: number[][]
        try {
          embeddings = await this.geminiProvider.generateEmbeddings(texts)
        } catch (error) {
          if (this.mode === "gemini-only") throw error
          console.warn("[HybridProvider] Batch Gemini failed, trying OpenAI:", error)
          embeddings = []
        }

        if (embeddings.length > 0) {
          return this.validateBatchDimensions(embeddings)
        }
      }
    }

    if (
      this.mode === "openai-only" ||
      this.mode === "openai-with-fallback" ||
      (this.mode === "gemini-with-fallback" && this.openaiProvider?.isConfigured())
    ) {
      let embeddings: number[][] = []
      try {
        if (this.openaiProvider) {
          embeddings = await this.openaiProvider.generateEmbeddings(texts)
        }
      } catch (error) {
        if (this.mode === "openai-only") throw error
        console.warn(
          "[HybridProvider] Batch OpenAI failed, falling back to individual TF-IDF:",
          error
        )
      }

      if (embeddings.length > 0) {
        return this.validateBatchDimensions(embeddings)
      }
    }

    // Fall back to individual processing
    return Promise.all(texts.map((text) => this.generateEmbedding(text)))
  }

  private async validateRequiredDimension(embedding: number[]): Promise<void> {
    // When using Pinecone, never return 256D if the index expects 768D (avoids dimension mismatch)
    const requiredDim = await getRequiredEmbeddingDimension()
    if (requiredDim != null && embedding.length !== requiredDim) {
      const msg =
        embedding.length === 256 && requiredDim === 768
          ? "Gemini embedding failed and TF-IDF fallback (256D) cannot be used with your Pinecone index (768D). Ensure GEMINI_API_KEY is set and Gemini is available."
          : `Embedding dimension ${embedding.length} does not match Pinecone index dimension ${requiredDim}.`
      throw new Error(`[HybridProvider] ${msg}`)
    }
  }

  private async validateBatchDimensions(embeddings: number[][]): Promise<number[][]> {
    for (const embedding of embeddings) {
      await this.validateRequiredDimension(embedding)
    }
    return embeddings
  }

  /**
   * Generate combined embedding (OpenAI + TF-IDF)
   */
  private async generateCombinedEmbedding(text: string): Promise<number[]> {
    const [openaiEmbedding, tfidfEmbedding] = await Promise.all([
      this.openaiProvider?.isConfigured() ? this.openaiProvider.generateEmbedding(text) : null,
      this.tfidfProvider.generateEmbedding(text),
    ])

    if (!openaiEmbedding) {
      // If OpenAI not available, pad with zeros to maintain dimension consistency
      const paddedTfidf = [...tfidfEmbedding]
      while (paddedTfidf.length < this.getDimensions()) {
        paddedTfidf.push(0)
      }
      return paddedTfidf
    }

    // Weight and combine embeddings
    const weightedOpenAI = openaiEmbedding.map((v) => v * this.combinedWeights.openai)
    const weightedTFIDF = tfidfEmbedding.map((v) => v * this.combinedWeights.tfidf)

    // Concatenate: [openai..., tfidf...]
    return [...weightedOpenAI, ...weightedTFIDF]
  }

  /**
   * Record metrics for monitoring
   */
  private recordMetrics(
    provider: "gemini" | "openai" | "tfidf" | "combined",
    dimensions: number,
    latencyMs: number,
    cached: boolean
  ): void {
    this.metrics.push({ provider, dimensions, latencyMs, cached })

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  /**
   * Get embedding metrics
   */
  getMetrics(): {
    total: number
    byProvider: Record<string, number>
    avgLatencyMs: number
    cacheHitRate: number
  } {
    const total = this.metrics.length
    const byProvider: Record<string, number> = {}
    let totalLatency = 0
    let cacheHits = 0

    for (const m of this.metrics) {
      byProvider[m.provider] = (byProvider[m.provider] || 0) + 1
      totalLatency += m.latencyMs
      if (m.cached) cacheHits++
    }

    return {
      total,
      byProvider,
      avgLatencyMs: total > 0 ? totalLatency / total : 0,
      cacheHitRate: total > 0 ? cacheHits / total : 0,
    }
  }

  /**
   * Switch embedding mode at runtime
   */
  setMode(mode: HybridMode): void {
    if (mode === "gemini-only" && !this.geminiProvider?.isConfigured()) {
      throw new Error("Cannot switch to gemini-only mode: Gemini not configured")
    }
    if (mode === "openai-only" && !this.openaiProvider?.isConfigured()) {
      throw new Error("Cannot switch to openai-only mode: OpenAI not configured")
    }
    this.mode = mode
    console.log(`[HybridProvider] Mode switched to: ${mode}`)
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean
    mode: HybridMode
    geminiAvailable: boolean
    openaiAvailable: boolean
    tfidfAvailable: boolean
  }> {
    let geminiAvailable = false
    let openaiAvailable = false

    if (this.geminiProvider?.isConfigured()) {
      try {
        await this.geminiProvider.generateEmbedding("health check")
        geminiAvailable = true
      } catch {
        geminiAvailable = false
      }
    }

    if (this.openaiProvider?.isConfigured()) {
      try {
        await this.openaiProvider.generateEmbedding("health check")
        openaiAvailable = true
      } catch {
        openaiAvailable = false
      }
    }

    const tfidfAvailable = true // TF-IDF is always available

    // Determine health based on mode
    let healthy: boolean
    switch (this.mode) {
      case "gemini-only":
        healthy = geminiAvailable
        break
      case "openai-only":
        healthy = openaiAvailable
        break
      case "tfidf-only":
        healthy = tfidfAvailable
        break
      case "gemini-with-fallback":
        healthy = geminiAvailable || tfidfAvailable
        break
      case "openai-with-fallback":
        healthy = openaiAvailable || tfidfAvailable
        break
      case "combined":
        healthy = (geminiAvailable || openaiAvailable) && tfidfAvailable
        break
      default:
        healthy = geminiAvailable || openaiAvailable || tfidfAvailable
    }

    return {
      healthy,
      mode: this.mode,
      geminiAvailable,
      openaiAvailable,
      tfidfAvailable,
    }
  }
}

/**
 * Default hybrid provider instance (singleton)
 */
let defaultHybridProvider: HybridEmbeddingProvider | null = null

export function getHybridProvider(config?: HybridProviderConfig): HybridEmbeddingProvider {
  if (!defaultHybridProvider) {
    defaultHybridProvider = new HybridEmbeddingProvider(config)
  }
  return defaultHybridProvider
}

/**
 * Create a fresh hybrid provider instance (for testing or custom configuration)
 */
export function createHybridProvider(config?: HybridProviderConfig): HybridEmbeddingProvider {
  return new HybridEmbeddingProvider(config)
}

/**
 * Utility: Generate embedding using the default hybrid provider
 */
export async function generateHybridEmbedding(text: string): Promise<number[]> {
  return getHybridProvider().generateEmbedding(text)
}

/**
 * Utility: Generate embeddings using the default hybrid provider
 */
export async function generateHybridEmbeddings(texts: string[]): Promise<number[][]> {
  return getHybridProvider().generateEmbeddings(texts)
}
