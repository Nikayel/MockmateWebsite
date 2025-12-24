/**
 * OpenAI Embedding Provider
 *
 * High-quality neural embeddings using OpenAI's text-embedding models
 * Supports text-embedding-3-small (default), text-embedding-3-large, and text-embedding-ada-002
 */

import type { EmbeddingProvider } from '../types'

// OpenAI embedding model configurations
export type OpenAIEmbeddingModel =
  | 'text-embedding-3-small'  // 1536 dimensions, fastest, cheapest
  | 'text-embedding-3-large'  // 3072 dimensions, highest quality
  | 'text-embedding-ada-002'  // 1536 dimensions, legacy

interface OpenAIProviderConfig {
  apiKey?: string
  model?: OpenAIEmbeddingModel
  dimensions?: number  // Only for text-embedding-3-* models
  maxRetries?: number
  timeout?: number
  batchSize?: number
}

interface OpenAIEmbeddingResponse {
  object: string
  data: Array<{
    object: string
    embedding: number[]
    index: number
  }>
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

// Model dimension defaults
const MODEL_DIMENSIONS: Record<OpenAIEmbeddingModel, number> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
}

// Rate limiting tracking
interface RateLimitState {
  requestsRemaining: number
  tokensRemaining: number
  resetTime: number
}

/**
 * OpenAI Embedding Provider
 *
 * Features:
 * - Multiple model support (small, large, ada)
 * - Dimension reduction for text-embedding-3 models
 * - Automatic retry with exponential backoff
 * - Rate limit handling
 * - Batch processing for multiple texts
 * - Caching integration ready
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string
  private model: OpenAIEmbeddingModel
  private dimensions: number
  private maxRetries: number
  private timeout: number
  private batchSize: number
  private rateLimitState: RateLimitState

  constructor(config: OpenAIProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || ''
    this.model = config.model || 'text-embedding-3-small'
    this.dimensions = config.dimensions || MODEL_DIMENSIONS[this.model]
    this.maxRetries = config.maxRetries || 3
    this.timeout = config.timeout || 30000
    this.batchSize = config.batchSize || 100  // OpenAI supports up to 2048 inputs
    this.rateLimitState = {
      requestsRemaining: 10000,
      tokensRemaining: 1000000,
      resetTime: 0,
    }

    // Validate dimension reduction
    if (config.dimensions && this.model === 'text-embedding-ada-002') {
      console.warn('[OpenAI] text-embedding-ada-002 does not support dimension reduction, ignoring dimensions param')
      this.dimensions = 1536
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
  getModel(): OpenAIEmbeddingModel {
    return this.model
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text])
    return embeddings[0]
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.isConfigured()) {
      throw new Error('[OpenAI] API key not configured. Set OPENAI_API_KEY environment variable.')
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
        const batchResults = await this.callOpenAI(batch)
        results.push(...batchResults)
      }
      return results
    }

    return this.callOpenAI(cleanedTexts)
  }

  /**
   * Clean text for embedding
   */
  private cleanText(text: string): string {
    // Remove excessive whitespace
    let cleaned = text.replace(/\s+/g, ' ').trim()

    // Truncate if too long (OpenAI has an 8191 token limit)
    // Rough estimate: 4 characters per token
    const maxChars = 8000 * 4
    if (cleaned.length > maxChars) {
      cleaned = cleaned.substring(0, maxChars)
      console.warn(`[OpenAI] Text truncated from ${text.length} to ${maxChars} characters`)
    }

    // Handle empty text
    if (cleaned.length === 0) {
      cleaned = ' '  // OpenAI doesn't accept empty strings
    }

    return cleaned
  }

  /**
   * Call OpenAI Embeddings API with retry logic
   */
  private async callOpenAI(texts: string[]): Promise<number[][]> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Check rate limits
        await this.checkRateLimits()

        const body: Record<string, unknown> = {
          input: texts,
          model: this.model,
        }

        // Add dimensions for text-embedding-3 models
        if (this.model.startsWith('text-embedding-3') && this.dimensions !== MODEL_DIMENSIONS[this.model]) {
          body.dimensions = this.dimensions
        }

        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeout),
        })

        // Update rate limit state from headers
        this.updateRateLimits(response.headers)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = (errorData as { error?: { message?: string } })?.error?.message || response.statusText

          if (response.status === 429) {
            // Rate limited - wait and retry
            const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10)
            console.warn(`[OpenAI] Rate limited, waiting ${retryAfter}s before retry...`)
            await this.sleep(retryAfter * 1000)
            continue
          }

          if (response.status >= 500) {
            // Server error - retry with backoff
            const backoff = Math.pow(2, attempt) * 1000
            console.warn(`[OpenAI] Server error (${response.status}), retrying in ${backoff}ms...`)
            await this.sleep(backoff)
            continue
          }

          throw new Error(`OpenAI API error: ${response.status} - ${errorMessage}`)
        }

        const data: OpenAIEmbeddingResponse = await response.json()

        // Sort by index to ensure correct order
        const sortedData = [...data.data].sort((a, b) => a.index - b.index)

        console.log(`[OpenAI] Generated ${sortedData.length} embeddings, used ${data.usage.total_tokens} tokens`)

        return sortedData.map(d => d.embedding)

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`[OpenAI] Request timed out (attempt ${attempt + 1}/${this.maxRetries})`)
        } else {
          console.error(`[OpenAI] Error on attempt ${attempt + 1}:`, error)
        }

        if (attempt < this.maxRetries - 1) {
          const backoff = Math.pow(2, attempt) * 1000
          await this.sleep(backoff)
        }
      }
    }

    throw lastError || new Error('OpenAI embedding generation failed after all retries')
  }

  /**
   * Check and wait for rate limits if needed
   */
  private async checkRateLimits(): Promise<void> {
    const now = Date.now()

    if (this.rateLimitState.requestsRemaining <= 0 && now < this.rateLimitState.resetTime) {
      const waitTime = this.rateLimitState.resetTime - now
      console.log(`[OpenAI] Waiting ${waitTime}ms for rate limit reset...`)
      await this.sleep(waitTime)
    }
  }

  /**
   * Update rate limit state from response headers
   */
  private updateRateLimits(headers: Headers): void {
    const requestsRemaining = headers.get('x-ratelimit-remaining-requests')
    const tokensRemaining = headers.get('x-ratelimit-remaining-tokens')
    const resetRequests = headers.get('x-ratelimit-reset-requests')

    if (requestsRemaining) {
      this.rateLimitState.requestsRemaining = parseInt(requestsRemaining, 10)
    }
    if (tokensRemaining) {
      this.rateLimitState.tokensRemaining = parseInt(tokensRemaining, 10)
    }
    if (resetRequests) {
      // Parse duration like "6m0s" or "5s"
      const match = resetRequests.match(/(\d+)m?(\d+)?s?/)
      if (match) {
        const minutes = parseInt(match[1] || '0', 10)
        const seconds = parseInt(match[2] || '0', 10)
        this.rateLimitState.resetTime = Date.now() + (minutes * 60 + seconds) * 1000
      }
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
 * Default OpenAI embedding provider instance
 */
let defaultOpenAIProvider: OpenAIEmbeddingProvider | null = null

export function getOpenAIProvider(config?: OpenAIProviderConfig): OpenAIEmbeddingProvider {
  if (!defaultOpenAIProvider) {
    defaultOpenAIProvider = new OpenAIEmbeddingProvider(config)
  }
  return defaultOpenAIProvider
}

/**
 * Check if OpenAI embeddings are available
 */
export function isOpenAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY
}
