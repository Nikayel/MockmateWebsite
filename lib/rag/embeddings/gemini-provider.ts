/**
 * Gemini Embedding Provider
 *
 * High-quality neural embeddings using Google's text-embedding-004 model
 * 768 dimensions, optimized for semantic search and RAG applications
 */

import type { EmbeddingProvider } from '../types'

// Gemini embedding model configurations
export type GeminiEmbeddingModel = 'text-embedding-004' // Latest Gemini embedding model

interface GeminiProviderConfig {
  apiKey?: string
  model?: GeminiEmbeddingModel
  maxRetries?: number
  timeout?: number
  batchSize?: number
  taskType?: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING'
}

interface GeminiEmbeddingResponse {
  embedding: {
    values: number[]
  }
}

interface GeminiBatchEmbeddingResponse {
  embeddings: Array<{
    values: number[]
  }>
}

// Model dimension defaults - Gemini text-embedding-004 uses 768 dimensions
const MODEL_DIMENSIONS: Record<GeminiEmbeddingModel, number> = {
  'text-embedding-004': 768,
}

// Rate limiting tracking
interface RateLimitState {
  requestsRemaining: number
  resetTime: number
  lastRequestTime: number
}

/**
 * Gemini Embedding Provider
 *
 * Features:
 * - Google's latest text-embedding-004 model
 * - 768 dimensions (efficient and high-quality)
 * - Task-specific embeddings (retrieval, similarity, etc.)
 * - Automatic retry with exponential backoff
 * - Rate limit handling
 * - Batch processing for multiple texts
 */
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string
  private model: GeminiEmbeddingModel
  private dimensions: number
  private maxRetries: number
  private timeout: number
  private batchSize: number
  private taskType: string
  private rateLimitState: RateLimitState

  constructor(config: GeminiProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || ''
    this.model = config.model || 'text-embedding-004'
    this.dimensions = MODEL_DIMENSIONS[this.model]
    this.maxRetries = config.maxRetries || 3
    this.timeout = config.timeout || 30000
    this.batchSize = config.batchSize || 100 // Gemini supports batch requests
    this.taskType = config.taskType || 'RETRIEVAL_DOCUMENT'
    this.rateLimitState = {
      requestsRemaining: 1500, // Gemini default rate limit
      resetTime: 0,
      lastRequestTime: 0,
    }
  }

  /**
   * Check if the provider is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0
  }

  /**
   * Get the embedding dimensions for this provider
   */
  getDimensions(): number {
    return this.dimensions
  }

  /**
   * Get the current model
   */
  getModel(): GeminiEmbeddingModel {
    return this.model
  }

  /**
   * Set task type for embeddings
   * - RETRIEVAL_DOCUMENT: For documents to be searched
   * - RETRIEVAL_QUERY: For search queries
   * - SEMANTIC_SIMILARITY: For comparing text similarity
   * - CLASSIFICATION: For text classification
   * - CLUSTERING: For clustering texts
   */
  setTaskType(taskType: GeminiProviderConfig['taskType']): void {
    this.taskType = taskType || 'RETRIEVAL_DOCUMENT'
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isConfigured()) {
      throw new Error('[Gemini] API key not configured. Set GEMINI_API_KEY environment variable.')
    }

    const cleanedText = this.cleanText(text)
    return this.callGeminiSingle(cleanedText)
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.isConfigured()) {
      throw new Error('[Gemini] API key not configured. Set GEMINI_API_KEY environment variable.')
    }

    if (texts.length === 0) {
      return []
    }

    // Clean and validate texts
    const cleanedTexts = texts.map(text => this.cleanText(text))

    // Process in batches if needed
    if (cleanedTexts.length > this.batchSize) {
      const results: number[][] = []
      for (let i = 0; i < cleanedTexts.length; i += this.batchSize) {
        const batch = cleanedTexts.slice(i, i + this.batchSize)
        const batchResults = await this.callGeminiBatch(batch)
        results.push(...batchResults)
      }
      return results
    }

    return this.callGeminiBatch(cleanedTexts)
  }

  /**
   * Clean text for embedding
   */
  private cleanText(text: string): string {
    // Remove excessive whitespace
    let cleaned = text.replace(/\s+/g, ' ').trim()

    // Truncate if too long (Gemini has a token limit)
    // Rough estimate: 4 characters per token, max ~8000 tokens
    const maxChars = 8000 * 4
    if (cleaned.length > maxChars) {
      cleaned = cleaned.substring(0, maxChars)
      console.warn(`[Gemini] Text truncated from ${text.length} to ${maxChars} characters`)
    }

    // Handle empty text
    if (cleaned.length === 0) {
      cleaned = ' ' // Gemini doesn't accept empty strings
    }

    return cleaned
  }

  /**
   * Call Gemini Embeddings API for a single text with retry logic
   */
  private async callGeminiSingle(text: string): Promise<number[]> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Check rate limits
        await this.checkRateLimits()

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent?key=${this.apiKey}`

        const body = {
          model: `models/${this.model}`,
          content: {
            parts: [{ text }]
          },
          taskType: this.taskType,
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeout),
        })

        this.updateRateLimits()

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = (errorData as { error?: { message?: string } })?.error?.message || response.statusText

          if (response.status === 429) {
            // Rate limited - wait and retry
            const retryAfter = 5
            console.warn(`[Gemini] Rate limited, waiting ${retryAfter}s before retry...`)
            await this.sleep(retryAfter * 1000)
            continue
          }

          if (response.status >= 500) {
            // Server error - retry with backoff
            const backoff = Math.pow(2, attempt) * 1000
            console.warn(`[Gemini] Server error (${response.status}), retrying in ${backoff}ms...`)
            await this.sleep(backoff)
            continue
          }

          throw new Error(`Gemini API error: ${response.status} - ${errorMessage}`)
        }

        const data: GeminiEmbeddingResponse = await response.json()

        if (!data.embedding?.values) {
          throw new Error('Gemini API returned invalid response: missing embedding values')
        }

        console.log(`[Gemini] Generated embedding with ${data.embedding.values.length} dimensions`)

        return data.embedding.values

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`[Gemini] Request timed out (attempt ${attempt + 1}/${this.maxRetries})`)
        } else {
          console.error(`[Gemini] Error on attempt ${attempt + 1}:`, error)
        }

        if (attempt < this.maxRetries - 1) {
          const backoff = Math.pow(2, attempt) * 1000
          await this.sleep(backoff)
        }
      }
    }

    throw lastError || new Error('Gemini embedding generation failed after all retries')
  }

  /**
   * Call Gemini Embeddings API for batch texts with retry logic
   */
  private async callGeminiBatch(texts: string[]): Promise<number[][]> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Check rate limits
        await this.checkRateLimits()

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:batchEmbedContents?key=${this.apiKey}`

        const requests = texts.map(text => ({
          model: `models/${this.model}`,
          content: {
            parts: [{ text }]
          },
          taskType: this.taskType,
        }))

        const body = { requests }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeout),
        })

        this.updateRateLimits()

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = (errorData as { error?: { message?: string } })?.error?.message || response.statusText

          if (response.status === 429) {
            // Rate limited - wait and retry
            const retryAfter = 5
            console.warn(`[Gemini] Rate limited, waiting ${retryAfter}s before retry...`)
            await this.sleep(retryAfter * 1000)
            continue
          }

          if (response.status >= 500) {
            // Server error - retry with backoff
            const backoff = Math.pow(2, attempt) * 1000
            console.warn(`[Gemini] Server error (${response.status}), retrying in ${backoff}ms...`)
            await this.sleep(backoff)
            continue
          }

          throw new Error(`Gemini API error: ${response.status} - ${errorMessage}`)
        }

        const data: GeminiBatchEmbeddingResponse = await response.json()

        if (!data.embeddings || !Array.isArray(data.embeddings)) {
          throw new Error('Gemini API returned invalid batch response: missing embeddings')
        }

        console.log(`[Gemini] Generated ${data.embeddings.length} embeddings with ${data.embeddings[0]?.values?.length || 0} dimensions each`)

        return data.embeddings.map(e => e.values)

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`[Gemini] Batch request timed out (attempt ${attempt + 1}/${this.maxRetries})`)
        } else {
          console.error(`[Gemini] Batch error on attempt ${attempt + 1}:`, error)
        }

        if (attempt < this.maxRetries - 1) {
          const backoff = Math.pow(2, attempt) * 1000
          await this.sleep(backoff)
        }
      }
    }

    throw lastError || new Error('Gemini batch embedding generation failed after all retries')
  }

  /**
   * Check and wait for rate limits if needed
   */
  private async checkRateLimits(): Promise<void> {
    const now = Date.now()

    if (this.rateLimitState.requestsRemaining <= 0 && now < this.rateLimitState.resetTime) {
      const waitTime = this.rateLimitState.resetTime - now
      console.log(`[Gemini] Waiting ${waitTime}ms for rate limit reset...`)
      await this.sleep(waitTime)
    }

    // Implement basic rate limiting - max 60 requests per minute
    const timeSinceLastRequest = now - this.rateLimitState.lastRequestTime
    if (timeSinceLastRequest < 100) { // Min 100ms between requests
      await this.sleep(100 - timeSinceLastRequest)
    }
  }

  /**
   * Update rate limit state after a request
   */
  private updateRateLimits(): void {
    this.rateLimitState.lastRequestTime = Date.now()
    this.rateLimitState.requestsRemaining--

    // Reset every minute
    const now = Date.now()
    if (now > this.rateLimitState.resetTime) {
      this.rateLimitState.requestsRemaining = 1500
      this.rateLimitState.resetTime = now + 60000
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get usage statistics
   */
  getRateLimitState(): RateLimitState {
    return { ...this.rateLimitState }
  }
}

/**
 * Default Gemini embedding provider instance
 */
let defaultGeminiProvider: GeminiEmbeddingProvider | null = null

export function getGeminiProvider(config?: GeminiProviderConfig): GeminiEmbeddingProvider {
  if (!defaultGeminiProvider) {
    defaultGeminiProvider = new GeminiEmbeddingProvider(config)
  }
  return defaultGeminiProvider
}

/**
 * Reset the default provider (useful for testing or reconfiguration)
 */
export function resetGeminiProvider(): void {
  defaultGeminiProvider = null
}

/**
 * Check if Gemini embeddings are available
 */
export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY
}
