/**
 * AI Provider Abstraction Layer
 *
 * Implements multi-provider support with intelligent fallback:
 * - Gemini 2.5 Flash: Primary provider (current)
 * - Deepseek: Cost-effective fallback for routine tasks
 * - Claude: Premium fallback for complex reasoning
 *
 * Cost optimization strategy:
 * - Use Deepseek for simple chat interactions (cheapest)
 * - Use Gemini for standard interviews (balanced)
 * - Use Claude for complex feedback generation (highest quality)
 *
 * Includes:
 * - Response caching to reduce API costs
 * - Usage tracking for billing and analytics
 * - Rate limiting per user
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import { generateCacheKey, getCachedResponse, setCachedResponse } from './ai-cache'
import { trackUsageEvent, calculateCost, PROVIDER_COSTS } from './usage-tracking'
import { checkRateLimit, recordRequestStart, recordRequestEnd, updateTokenCount, RateLimitTier } from './rate-limiter'

// Provider types
export type AIProvider = 'gemini' | 'deepseek' | 'claude'
export type TaskComplexity = 'simple' | 'standard' | 'complex'

// Response structure
export interface AIResponse {
  text: string
  provider: AIProvider
  tokensUsed?: number
  latencyMs: number
}

// Provider configuration
interface ProviderConfig {
  name: AIProvider
  enabled: boolean
  apiKey: string | undefined
  baseUrl?: string
  model: string
  maxTokens: number
  temperature: number
  costPer1kTokens: number // For cost tracking
}

// Provider configurations - Updated Dec 2025 pricing
// Strategy: Gemini Flash primary (cheapest + good), Deepseek fallback, Claude premium
const PROVIDERS: Record<AIProvider, ProviderConfig> = {
  gemini: {
    name: 'gemini',
    enabled: true,
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.5-flash', // Best value: $0.075/1M input, $0.30/1M output
    maxTokens: 1024,
    temperature: 0.7,
    costPer1kTokens: 0.000188, // Averaged (input + output) / 2
  },
  deepseek: {
    name: 'deepseek',
    enabled: !!process.env.DEEPSEEK_API_KEY,
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat', // $0.14/1M input, $0.28/1M output - excellent fallback
    maxTokens: 1024,
    temperature: 0.7,
    costPer1kTokens: 0.00021, // Averaged
  },
  claude: {
    name: 'claude',
    enabled: !!process.env.ANTHROPIC_API_KEY,
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-5-haiku-latest', // $0.80/1M input, $4.00/1M output - quality fallback
    maxTokens: 1024,
    temperature: 0.7,
    costPer1kTokens: 0.0024, // Averaged - more expensive but best quality
  },
}

// Fallback order based on task complexity
// Cost-optimized: Gemini first (best value), Deepseek second (cheap), Claude last (quality)
const FALLBACK_ORDER: Record<TaskComplexity, AIProvider[]> = {
  simple: ['gemini', 'deepseek', 'claude'],   // Chat, hints - cheapest path
  standard: ['gemini', 'deepseek', 'claude'], // Interview interactions
  complex: ['gemini', 'claude', 'deepseek'],  // Feedback generation - quality matters
}

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 2000, 4000] // Exponential backoff

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any): boolean {
  const status = error?.status || error?.response?.status
  const message = error?.message || ''

  return (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    message.includes('503') ||
    message.includes('Service Unavailable') ||
    message.includes('overloaded') ||
    message.includes('rate limit') ||
    message.includes('timeout')
  )
}

/**
 * Call Gemini API
 */
async function callGemini(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'model'; content: string }>,
  config: ProviderConfig
): Promise<string> {
  const genAI = new GoogleGenerativeAI(config.apiKey || '')
  const model = genAI.getGenerativeModel({
    model: config.model,
    systemInstruction: systemPrompt,
  })

  const geminiHistory = history.map(msg => ({
    role: msg.role as 'user' | 'model',
    parts: [{ text: msg.content }],
  }))

  const chat = model.startChat({
    history: geminiHistory,
    generationConfig: {
      maxOutputTokens: config.maxTokens,
      temperature: config.temperature,
    },
  })

  const result = await chat.sendMessage(userMessage)
  const response = await result.response
  return response.text()
}

/**
 * Call Deepseek API (OpenAI-compatible)
 */
async function callDeepseek(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'model'; content: string }>,
  config: ProviderConfig
): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ]

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw { status: response.status, message: error.error?.message || response.statusText }
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

/**
 * Call Claude API
 */
async function callClaude(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'model'; content: string }>,
  config: ProviderConfig
): Promise<string> {
  const messages = [
    ...history.map(msg => ({
      role: msg.role === 'model' ? 'assistant' as const : 'user' as const,
      content: msg.content,
    })),
    { role: 'user' as const, content: userMessage },
  ]

  const response = await fetch(`${config.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      system: systemPrompt,
      messages,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw { status: response.status, message: error.error?.message || response.statusText }
  }

  const data = await response.json()
  return data.content[0]?.text || ''
}

/**
 * Call a specific provider
 */
async function callProvider(
  provider: AIProvider,
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'model'; content: string }>,
  temperatureOverride?: number
): Promise<string> {
  const config = { ...PROVIDERS[provider] }

  // Apply temperature override if provided
  if (temperatureOverride !== undefined) {
    config.temperature = temperatureOverride
  }

  if (!config.enabled || !config.apiKey) {
    throw new Error(`Provider ${provider} is not configured`)
  }

  switch (provider) {
    case 'gemini':
      return callGemini(systemPrompt, userMessage, history, config)
    case 'deepseek':
      return callDeepseek(systemPrompt, userMessage, history, config)
    case 'claude':
      return callClaude(systemPrompt, userMessage, history, config)
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

/**
 * Main function: Generate AI response with fallback
 * Now includes caching, rate limiting, and usage tracking
 */
export async function generateAIResponse(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'model'; content: string }> = [],
  options: {
    complexity?: TaskComplexity
    preferredProvider?: AIProvider
    maxRetries?: number
    temperature?: number // Override default temperature (0.0-1.0)
    // New options for tracking and caching
    userId?: string
    userTier?: RateLimitTier
    sessionId?: string
    scenarioId?: string
    eventType?: 'chat_message' | 'feedback_generation' | 'hint_request'
    skipCache?: boolean
    skipRateLimit?: boolean
  } = {}
): Promise<AIResponse> {
  const {
    complexity = 'standard',
    preferredProvider,
    maxRetries = MAX_RETRIES,
    temperature,
    userId,
    userTier = 'free',
    sessionId,
    scenarioId,
    eventType = 'chat_message',
    skipCache = false,
    skipRateLimit = false,
  } = options

  const startTime = Date.now()

  // 1. Check rate limit if userId provided
  if (userId && !skipRateLimit) {
    const rateLimitCheck = await checkRateLimit(userId, userTier)
    if (!rateLimitCheck.allowed) {
      throw new Error(rateLimitCheck.message || 'Rate limit exceeded')
    }
  }

  // 2. Check cache if not skipped
  if (!skipCache) {
    const cacheKey = generateCacheKey({
      type: eventType,
      systemPrompt,
      userMessage,
      context: history.map(h => h.content).join('|'),
      scenarioId,
    })

    const cached = await getCachedResponse(cacheKey)
    if (cached.hit && cached.response) {
      console.log(`[AI Provider] Cache hit (${cached.source})`)

      // Track cached usage (no cost)
      if (userId) {
        trackUsageEvent({
          userId,
          eventType,
          cached: true,
          sessionId,
          scenarioId,
          latencyMs: Date.now() - startTime,
        }).catch(() => {})
      }

      return {
        text: cached.response,
        provider: 'gemini', // Indicate it was from cache
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
      }
    }
  }

  // 3. Record request start for rate limiting
  if (userId) {
    recordRequestStart(userId, 500) // Estimate 500 tokens
  }

  // Determine provider order
  let providerOrder: AIProvider[]
  if (preferredProvider) {
    providerOrder = [preferredProvider, ...FALLBACK_ORDER[complexity].filter(p => p !== preferredProvider)]
  } else {
    providerOrder = FALLBACK_ORDER[complexity]
  }

  // Filter to only enabled providers
  providerOrder = providerOrder.filter(p => PROVIDERS[p].enabled)

  if (providerOrder.length === 0) {
    if (userId) recordRequestEnd(userId)
    throw new Error('No AI providers are configured. Please set API keys.')
  }

  let lastError: any = null

  // Try each provider in order
  for (const provider of providerOrder) {
    // Retry loop for each provider
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[AI Provider] Trying ${provider} (attempt ${attempt + 1}/${maxRetries})`)

        const text = await callProvider(provider, systemPrompt, userMessage, history, temperature)

        const latencyMs = Date.now() - startTime
        console.log(`[AI Provider] Success with ${provider} in ${latencyMs}ms`)

        // Estimate tokens (rough estimate: 4 chars per token)
        const inputTokens = Math.ceil((systemPrompt.length + userMessage.length + history.reduce((sum, h) => sum + h.content.length, 0)) / 4)
        const outputTokens = Math.ceil(text.length / 4)
        const totalTokens = inputTokens + outputTokens
        const cost = calculateCost(inputTokens, outputTokens, provider)

        // 4. Track usage
        if (userId) {
          updateTokenCount(userId, totalTokens)
          recordRequestEnd(userId)

          trackUsageEvent({
            userId,
            eventType,
            provider,
            model: PROVIDERS[provider].model,
            inputTokens,
            outputTokens,
            totalTokens,
            cost,
            latencyMs,
            cached: false,
            sessionId,
            scenarioId,
          }).catch(() => {})
        }

        // 5. Cache the response
        if (!skipCache) {
          const cacheKey = generateCacheKey({
            type: eventType,
            systemPrompt,
            userMessage,
            context: history.map(h => h.content).join('|'),
            scenarioId,
          })
          setCachedResponse(cacheKey, text, eventType).catch(() => {})
        }

        return {
          text,
          provider,
          latencyMs,
          tokensUsed: totalTokens,
        }
      } catch (error: any) {
        lastError = error
        console.error(`[AI Provider] ${provider} failed:`, error?.message || error)

        // Only retry if it's a retryable error
        if (isRetryableError(error) && attempt < maxRetries - 1) {
          const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
          console.log(`[AI Provider] Retrying ${provider} in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        } else {
          // Move to next provider
          break
        }
      }
    }
  }

  // All providers failed
  if (userId) recordRequestEnd(userId)
  throw new Error(
    `All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`
  )
}

/**
 * Convenience function for chat messages (simple complexity)
 */
export async function generateChatResponse(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'model'; content: string }> = []
): Promise<AIResponse> {
  return generateAIResponse(systemPrompt, userMessage, history, { complexity: 'simple' })
}

/**
 * Convenience function for interview interactions (standard complexity)
 */
export async function generateInterviewResponse(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'model'; content: string }> = []
): Promise<AIResponse> {
  return generateAIResponse(systemPrompt, userMessage, history, { complexity: 'standard' })
}

/**
 * Convenience function for feedback generation (complex - needs quality)
 * Uses lower temperature (0.3) for more consistent, deterministic feedback
 */
export async function generateFeedbackResponse(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'model'; content: string }> = []
): Promise<AIResponse> {
  return generateAIResponse(systemPrompt, userMessage, history, {
    complexity: 'complex',
    temperature: 0.3, // Lower temperature for consistent, data-driven feedback
  })
}

/**
 * Get available providers status
 */
export function getProviderStatus(): Record<AIProvider, { enabled: boolean; model: string }> {
  return {
    gemini: { enabled: PROVIDERS.gemini.enabled, model: PROVIDERS.gemini.model },
    deepseek: { enabled: PROVIDERS.deepseek.enabled, model: PROVIDERS.deepseek.model },
    claude: { enabled: PROVIDERS.claude.enabled, model: PROVIDERS.claude.model },
  }
}

/**
 * Validate response relevance to the problem context
 */
export function validateResponseRelevance(
  response: string,
  problemContext: {
    title?: string
    type?: string
    keywords?: string[]
  }
): { valid: boolean; confidence: number; issues: string[] } {
  const issues: string[] = []
  let relevanceScore = 100

  // Check if response is too short (likely an error or non-answer)
  if (response.length < 20) {
    issues.push('Response too short')
    relevanceScore -= 50
  }

  // Check if response mentions the problem title (if provided)
  if (problemContext.title) {
    const titleWords = problemContext.title.toLowerCase().split(/\s+/)
    const responseWords = response.toLowerCase()
    const titleMatches = titleWords.filter(word =>
      word.length > 3 && responseWords.includes(word)
    ).length

    if (titleMatches === 0 && titleWords.length > 0) {
      // Only flag if we have a meaningful title to check
      const meaningfulWords = titleWords.filter(w => w.length > 3)
      if (meaningfulWords.length > 0) {
        issues.push('Response may not be relevant to the problem')
        relevanceScore -= 20
      }
    }
  }

  // Check for common hallucination patterns
  const hallucinations = [
    /I don't have access to/i,
    /I cannot see your/i,
    /as an AI language model/i,
    /I'm sorry, but I/i,
    /I apologize, but/i,
  ]

  for (const pattern of hallucinations) {
    if (pattern.test(response)) {
      issues.push('Response contains potential refusal/hallucination pattern')
      relevanceScore -= 30
      break
    }
  }

  // Check for code-related keywords if it's a coding problem
  if (problemContext.type === 'dsa' || problemContext.type === 'bugfix') {
    const codeKeywords = ['function', 'return', 'algorithm', 'complexity', 'approach', 'solution']
    const hasCodeContext = codeKeywords.some(keyword =>
      response.toLowerCase().includes(keyword)
    )

    // If no code-related keywords in a long response, might be off-topic
    if (!hasCodeContext && response.length > 200) {
      issues.push('Response lacks code/algorithm context for technical problem')
      relevanceScore -= 15
    }
  }

  return {
    valid: relevanceScore >= 50,
    confidence: Math.max(0, relevanceScore),
    issues,
  }
}
