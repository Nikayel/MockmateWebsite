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
import { generateCacheKey, getCachedResponse, setCachedResponse } from "./ai-cache"
import { calculateCost } from "./usage-tracking-client"
import {
  checkRateLimit,
  recordRequestStart,
  recordRequestEnd,
  updateTokenCount,
  RateLimitTier,
} from "./rate-limiter"
import { logger } from "./logger"
import type { UsageEvent } from "./usage-tracking"

// Lazy wrapper for trackUsageEvent to avoid bundling firebase-admin in client
async function trackUsageEventSafe(event: Omit<UsageEvent, "id" | "createdAt">): Promise<void> {
  // Only track on server-side
  if (typeof window === "undefined") {
    try {
      const { trackUsageEvent } = await import("./usage-tracking")
      await trackUsageEvent(event)
    } catch (error) {
      // Usage tracking failure is non-critical - silent fail
      logger.debug("[Usage Tracking] Failed to track event", { error })
    }
  }
}

// Provider types
export type AIProvider = "gemini" | "gemini-lite" | "deepseek" | "deepseek-chat" | "claude"
export type TaskComplexity = "simple" | "standard" | "complex" | "dialogue" | "code" | "critique"

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
  thinkingLevel?: "minimal" | "low" | "medium" | "high" // For Gemini 3.0 thinking mode
}

// Provider configurations - Updated Jan 2025 pricing
// Strategy: Gemini 3.0 Flash for dialogue/complex, 2.5 Flash-Lite for simple, DeepSeek for critique
const PROVIDERS: Record<AIProvider, ProviderConfig> = {
  gemini: {
    name: "gemini",
    enabled: true,
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-3-flash-preview", // Upgraded: $0.50/1M input, $3/1M output - better reasoning
    maxTokens: 1024,
    temperature: 0.7,
    costPer1kTokens: 0.00175, // Averaged (input + output) / 2
    thinkingLevel: "low", // minimal/low/medium/high - low for balanced speed/quality
  },
  "gemini-lite": {
    name: "gemini-lite",
    enabled: true,
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-2.5-flash-lite", // Actually use Flash-Lite now: $0.10/1M input, $0.40/1M output
    maxTokens: 1024,
    temperature: 0.7,
    costPer1kTokens: 0.00025, // Averaged - very cheap
  },
  deepseek: {
    name: "deepseek",
    enabled: !!process.env.DEEPSEEK_API_KEY,
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-reasoner", // R1 model - $0.55/1M input, $2.19/1M output - best for critique/reasoning
    maxTokens: 1024,
    temperature: 0.7,
    costPer1kTokens: 0.00137, // Averaged - only used for Constitutional AI critique (~$0.003/critique)
  },
  "deepseek-chat": {
    name: "deepseek-chat",
    enabled: !!process.env.DEEPSEEK_API_KEY,
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat", // V3 model - $0.27/1M input, $1.10/1M output - fast chat fallback
    maxTokens: 1024,
    temperature: 0.7,
    costPer1kTokens: 0.000685, // Averaged - cheaper than reasoner, good for chat
  },
  claude: {
    name: "claude",
    enabled: !!process.env.ANTHROPIC_API_KEY,
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-haiku-4-5-20251001", // $1/1M input, $5/1M output - quality fallback
    maxTokens: 1024,
    temperature: 0.7,
    costPer1kTokens: 0.0024, // Averaged - more expensive but best quality
  },
}

// Fallback order based on task complexity
// Cost-optimized: Flash Lite for simple (cheapest), Flash for standard, Claude for complex quality
const FALLBACK_ORDER: Record<TaskComplexity, AIProvider[]> = {
  simple: ["gemini-lite", "gemini", "deepseek-chat", "claude"], // Chat, hints - cheapest path (Flash Lite -> deepseek-chat)
  standard: ["gemini", "gemini-lite", "deepseek-chat", "claude"], // Interview interactions - balanced
  complex: ["gemini", "claude", "deepseek"], // Feedback generation - quality matters (uses reasoner)
  dialogue: ["claude", "gemini", "deepseek-chat"], // for the conversation in the chat
  code: ["deepseek-chat", "gemini", "claude"],
  critique: ["deepseek", "claude", "gemini"],
}

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 2000, 4000] // Exponential backoff

/**
 * Check if an error is retryable
 * Quota errors should NOT be retried - they should immediately fallback to next provider
 */
function isRetryableError(error: any): boolean {
  const status = error?.status || error?.response?.status
  const message = (error?.message || "").toLowerCase()
  const errorString = JSON.stringify(error || {}).toLowerCase()

  // Quota errors should NOT be retried - fallback immediately
  if (
    message.includes("quota exceeded") ||
    message.includes("quota") ||
    errorString.includes("quota exceeded") ||
    errorString.includes("quota") ||
    message.includes("limit: 20") // Gemini free tier limit
  ) {
    return false
  }

  return (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    message.includes("503") ||
    message.includes("service unavailable") ||
    message.includes("overloaded") ||
    message.includes("rate limit") ||
    message.includes("timeout")
  )
}

/**
 * Call Gemini API
 */
async function callGemini(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: "user" | "model"; content: string }>,
  config: ProviderConfig
): Promise<string> {
  try {
    const genAI = new GoogleGenerativeAI(config.apiKey || "")

    // Build generation config - add thinkingLevel for Gemini 3.0 models
    const generationConfig: Record<string, unknown> = {
      maxOutputTokens: config.maxTokens,
      temperature: config.temperature,
    }

    // Add thinking config for Gemini 3.0 Flash
    if (config.thinkingLevel && config.model.includes("gemini-3")) {
      generationConfig.thinkingConfig = {
        thinkingLevel: config.thinkingLevel.toUpperCase(), // API expects MINIMAL, LOW, MEDIUM, HIGH
      }
    }

    const model = genAI.getGenerativeModel({
      model: config.model,
      systemInstruction: systemPrompt,
      generationConfig,
    })

    const geminiHistory = history.map((msg) => ({
      role: msg.role as "user" | "model",
      parts: [{ text: msg.content }],
    }))

    const chat = model.startChat({
      history: geminiHistory,
    })

    const result = await chat.sendMessage(userMessage)
    const response = await result.response
    return response.text()
  } catch (error: any) {
    // Extract error message from Gemini SDK error structure
    const errorMessage = error?.message || error?.toString() || "Unknown error"
    const errorDetails = error?.cause || error
    const errorString = JSON.stringify(errorDetails || {}).toLowerCase()

    // Check if it's a quota error (comprehensive detection)
    const isQuotaError =
      errorMessage.toLowerCase().includes("quota exceeded") ||
      errorMessage.toLowerCase().includes("quota") ||
      errorMessage.toLowerCase().includes("limit: 20") ||
      errorMessage.toLowerCase().includes("free_tier_requests") ||
      errorString.includes("quota") ||
      errorString.includes("limit: 20") ||
      errorString.includes("free_tier_requests") ||
      errorString.includes("quotafailure")

    if (isQuotaError) {
      logger.warn("[Gemini] Quota error detected", { message: errorMessage.substring(0, 200) })
      throw {
        status: 429,
        message: errorMessage,
        quotaExceeded: true,
        originalError: error,
      }
    }

    // Re-throw with consistent structure
    throw {
      status: error?.status || error?.response?.status || 500,
      message: errorMessage,
      originalError: error,
    }
  }
}

/**
 * Call Deepseek API (OpenAI-compatible)
 */
async function callDeepseek(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: "user" | "model"; content: string }>,
  config: ProviderConfig
): Promise<string> {
  try {
    if (!config.apiKey) {
      throw new Error("DeepSeek API key is not configured")
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((msg) => ({
        role: msg.role === "model" ? "assistant" : "user",
        content: msg.content,
      })),
      { role: "user", content: userMessage },
    ]

    logger.debug("[DeepSeek] Calling API", { model: config.model, messageCount: messages.length })

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: any = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: { message: errorText } }
      }

      const errorMessage = errorData.error?.message || errorData.message || response.statusText
      logger.error("[DeepSeek] API error", {
        status: response.status,
        message: errorMessage,
        fullResponse: errorText,
      })

      throw {
        status: response.status,
        message: `DeepSeek API error: ${errorMessage}`,
        originalError: errorData,
      }
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || ""

    if (!content) {
      logger.error("[DeepSeek] Empty response", { data })
      throw {
        status: 500,
        message: "DeepSeek returned empty response",
        originalResponse: data,
      }
    }

    logger.debug("[DeepSeek] Success", { responseLength: content.length })
    return content
  } catch (error: any) {
    // Re-throw with better context
    if (error.status) {
      throw error
    }
    throw {
      status: 500,
      message: `DeepSeek API call failed: ${error?.message || "Unknown error"}`,
      originalError: error,
    }
  }
}

/**
 * Call Claude API
 */
async function callClaude(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: "user" | "model"; content: string }>,
  config: ProviderConfig
): Promise<string> {
  const messages = [
    ...history.map((msg) => ({
      role: msg.role === "model" ? ("assistant" as const) : ("user" as const),
      content: msg.content,
    })),
    { role: "user" as const, content: userMessage },
  ]

  const response = await fetch(`${config.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey || "",
      "anthropic-version": "2023-06-01",
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
  return data.content[0]?.text || ""
}

/**
 * Call a specific provider
 */
async function callProvider(
  provider: AIProvider,
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: "user" | "model"; content: string }>,
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
    case "gemini":
    case "gemini-lite":
      return callGemini(systemPrompt, userMessage, history, config)
    case "deepseek":
    case "deepseek-chat":
      return callDeepseek(systemPrompt, userMessage, history, config)
    case "claude":
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
  history: Array<{ role: "user" | "model"; content: string }> = [],
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
    eventType?: "chat_message" | "feedback_generation" | "hint_request"
    skipCache?: boolean
    skipRateLimit?: boolean
  } = {}
): Promise<AIResponse> {
  const {
    complexity = "standard",
    preferredProvider,
    maxRetries = MAX_RETRIES,
    temperature,
    userId,
    userTier = "free",
    sessionId,
    scenarioId,
    eventType = "chat_message",
    skipCache = false,
    skipRateLimit = false,
  } = options

  const startTime = Date.now()

  // 1. Check rate limit if userId provided
  if (userId && !skipRateLimit) {
    const rateLimitCheck = await checkRateLimit(userId, userTier)
    if (!rateLimitCheck.allowed) {
      throw new Error(rateLimitCheck.message || "Rate limit exceeded")
    }
  }

  // 2. Check cache if not skipped
  if (!skipCache) {
    const cacheKey = generateCacheKey({
      type: eventType,
      systemPrompt,
      userMessage,
      context: history.map((h) => h.content).join("|"),
      scenarioId,
    })

    const cached = await getCachedResponse(cacheKey)
    if (cached.hit && cached.response) {
      // Track cached usage (no cost) - fire-and-forget
      if (userId) {
        trackUsageEventSafe({
          userId,
          eventType,
          cached: true,
          sessionId,
          scenarioId,
          latencyMs: Date.now() - startTime,
        }).catch(() => {
          // Usage tracking failure is non-critical - silent fail
        })
      }

      return {
        text: cached.response,
        provider: "gemini", // Indicate it was from cache
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
    providerOrder = [
      preferredProvider,
      ...FALLBACK_ORDER[complexity].filter((p) => p !== preferredProvider),
    ]
  } else {
    providerOrder = FALLBACK_ORDER[complexity]
  }

  // Filter to only enabled providers
  const enabledProviders = providerOrder.filter((p) => PROVIDERS[p].enabled)
  const disabledProviders = providerOrder.filter((p) => !PROVIDERS[p].enabled)

  // Log provider status for debugging (only in development)
  const providerStatuses = Object.fromEntries(
    providerOrder.map((p) => [p, PROVIDERS[p].enabled ? "enabled" : "disabled"])
  )
  logger.debug("[AI Provider] Provider status check", { providers: providerStatuses })

  if (disabledProviders.length > 0) {
    logger.debug("[AI Provider] Disabled providers will be skipped", {
      providers: disabledProviders,
    })
  }
  logger.debug("[AI Provider] Provider order", { order: enabledProviders })

  providerOrder = enabledProviders

  if (providerOrder.length === 0) {
    if (userId) recordRequestEnd(userId)
    const missingKeys = disabledProviders
      .map((p) => {
        const keyName =
          p === "gemini" || p === "gemini-lite"
            ? "GEMINI_API_KEY"
            : p === "deepseek"
              ? "DEEPSEEK_API_KEY"
              : "ANTHROPIC_API_KEY"
        return `${keyName} (for ${p})`
      })
      .join(", ")
    throw new Error(
      `No AI providers are configured. Please set at least one API key: ${missingKeys}`
    )
  }

  let lastError: any = null

  // Try each provider in order
  for (const provider of providerOrder) {
    logger.debug("[AI Provider] Attempting provider", {
      provider,
      model: PROVIDERS[provider].model,
    })
    // Retry loop for each provider
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          logger.debug("[AI Provider] Retry attempt", {
            attempt: attempt + 1,
            maxRetries,
            provider,
          })
        }

        const text = await callProvider(provider, systemPrompt, userMessage, history, temperature)

        const latencyMs = Date.now() - startTime

        // Estimate tokens (rough estimate: 4 chars per token)
        const inputTokens = Math.ceil(
          (systemPrompt.length +
            userMessage.length +
            history.reduce((sum, h) => sum + h.content.length, 0)) /
            4
        )
        const outputTokens = Math.ceil(text.length / 4)
        const totalTokens = inputTokens + outputTokens
        const cost = calculateCost(inputTokens, outputTokens, provider)

        // 4. Track usage
        if (userId) {
          updateTokenCount(userId, totalTokens)
          recordRequestEnd(userId)

          // Fire-and-forget usage tracking - errors are non-critical
          trackUsageEventSafe({
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
          }).catch(() => {
            // Usage tracking failure is non-critical - silent fail
          })
        }

        // 5. Cache the response
        if (!skipCache) {
          const cacheKey = generateCacheKey({
            type: eventType,
            systemPrompt,
            userMessage,
            context: history.map((h) => h.content).join("|"),
            scenarioId,
          })
          // Fire-and-forget cache write - errors are non-critical
          setCachedResponse(cacheKey, text, eventType).catch(() => {
            // Cache write failure is non-critical - silent fail
          })
        }

        logger.info("[AI Provider] Success", { provider, latencyMs, tokens: totalTokens })
        return {
          text,
          provider,
          latencyMs,
          tokensUsed: totalTokens,
        }
      } catch (error: any) {
        lastError = error

        // Log error details for debugging
        const errorMessage = error?.message || error?.toString() || "Unknown error"
        const errorStatus = error?.status || "unknown"
        logger.warn("[AI Provider] Provider failed", {
          provider,
          attempt: attempt + 1,
          maxRetries,
          status: errorStatus,
          message: errorMessage.substring(0, 300),
          quotaExceeded: error?.quotaExceeded,
        })

        // Check if it's a quota error - immediately fallback to next provider
        const errorString = JSON.stringify(error || {}).toLowerCase()
        const errorCause = JSON.stringify(error?.cause || {}).toLowerCase()
        const errorOriginal = JSON.stringify(error?.originalError || {}).toLowerCase()

        // Comprehensive quota error detection
        const isQuotaError =
          error?.quotaExceeded ||
          errorMessage.toLowerCase().includes("quota exceeded") ||
          errorMessage.toLowerCase().includes("quota") ||
          errorMessage.toLowerCase().includes("limit: 20") || // Gemini free tier limit
          errorMessage.toLowerCase().includes("free_tier_requests") ||
          errorMessage.toLowerCase().includes("quota failure") ||
          errorString.includes("quota") ||
          errorString.includes("limit: 20") ||
          errorString.includes("free_tier_requests") ||
          errorString.includes("quotafailure") ||
          errorCause.includes("quota") ||
          errorCause.includes("limit: 20") ||
          errorOriginal.includes("quota") ||
          errorOriginal.includes("limit: 20")

        if (isQuotaError) {
          // Quota errors should immediately fallback - don't retry
          const remainingProviders = providerOrder.slice(providerOrder.indexOf(provider) + 1)
          logger.warn("[AI Provider] Quota exceeded, falling back", {
            provider,
            message: errorMessage.substring(0, 300),
            fallbackProviders: remainingProviders,
          })
          break
        }

        // Only retry if it's a retryable error
        if (isRetryableError(error) && attempt < maxRetries - 1) {
          const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
          await new Promise((resolve) => setTimeout(resolve, delay))
        } else {
          // Move to next provider
          break
        }
      }
    }
  }

  // All providers failed
  if (userId) recordRequestEnd(userId)

  // Build helpful error message
  const isQuotaError =
    lastError?.quotaExceeded || (lastError?.message || "").toLowerCase().includes("quota")

  let errorMessage = `All AI providers failed.`

  if (isQuotaError && disabledProviders.length > 0) {
    const missingProviders = disabledProviders
      .map((p) => {
        const keyName =
          p === "gemini" || p === "gemini-lite"
            ? "GEMINI_API_KEY"
            : p === "deepseek"
              ? "DEEPSEEK_API_KEY"
              : "ANTHROPIC_API_KEY"
        return `${keyName} (for ${p})`
      })
      .join(", ")

    errorMessage =
      `Primary provider quota exceeded and no fallback providers available.\n\n` +
      `To enable fallback providers, add these environment variables to your .env.local file:\n` +
      `${missingProviders}\n\n` +
      `Last error: ${lastError?.message?.substring(0, 200) || "Unknown error"}`
  } else if (isQuotaError) {
    errorMessage =
      `All AI providers exceeded their quota limits. Please wait before retrying.\n\n` +
      `Last error: ${lastError?.message?.substring(0, 200) || "Unknown error"}`
  } else {
    errorMessage = `All AI providers failed. Last error: ${lastError?.message?.substring(0, 300) || "Unknown error"}`
  }

  throw new Error(errorMessage)
}

/**
 * Convenience function for chat messages (simple complexity)
 */
export async function generateChatResponse(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: "user" | "model"; content: string }> = []
): Promise<AIResponse> {
  return generateAIResponse(systemPrompt, userMessage, history, { complexity: "simple" })
}

/**
 * Convenience function for interview interactions (standard complexity)
 */
export async function generateInterviewResponse(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: "user" | "model"; content: string }> = []
): Promise<AIResponse> {
  return generateAIResponse(systemPrompt, userMessage, history, { complexity: "standard" })
}

/**
 * Convenience function for feedback generation (complex - needs quality)
 * Uses lower temperature (0.3) for more consistent, deterministic feedback
 */
export async function generateFeedbackResponse(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: "user" | "model"; content: string }> = [],
  options?: {
    userId?: string
    sessionId?: string
    scenarioId?: string
  }
): Promise<AIResponse> {
  return generateAIResponse(systemPrompt, userMessage, history, {
    complexity: "complex",
    temperature: 0.3, // Lower temperature for consistent, data-driven feedback
    userId: options?.userId,
    sessionId: options?.sessionId,
    scenarioId: options?.scenarioId,
    eventType: "feedback_generation",
  })
}

/**
 * Get available providers status
 */
export function getProviderStatus(): Record<AIProvider, { enabled: boolean; model: string }> {
  return {
    gemini: { enabled: PROVIDERS.gemini.enabled, model: PROVIDERS.gemini.model },
    "gemini-lite": {
      enabled: PROVIDERS["gemini-lite"].enabled,
      model: PROVIDERS["gemini-lite"].model,
    },
    deepseek: { enabled: PROVIDERS.deepseek.enabled, model: PROVIDERS.deepseek.model },
    "deepseek-chat": {
      enabled: PROVIDERS["deepseek-chat"].enabled,
      model: PROVIDERS["deepseek-chat"].model,
    },
    claude: { enabled: PROVIDERS.claude.enabled, model: PROVIDERS.claude.model },
  }
}

// Log provider status on module load (server-side only, development only via logger)
if (typeof window === "undefined") {
  const status = getProviderStatus()
  logger.info("[AI Providers] Configuration status", {
    providers: Object.fromEntries(
      Object.entries(status).map(([provider, config]) => [
        provider,
        { enabled: config.enabled, model: config.model },
      ])
    ),
  })
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
    issues.push("Response too short")
    relevanceScore -= 50
  }

  // Check if response mentions the problem title (if provided)
  if (problemContext.title) {
    const titleWords = problemContext.title.toLowerCase().split(/\s+/)
    const responseWords = response.toLowerCase()
    const titleMatches = titleWords.filter(
      (word) => word.length > 3 && responseWords.includes(word)
    ).length

    if (titleMatches === 0 && titleWords.length > 0) {
      // Only flag if we have a meaningful title to check
      const meaningfulWords = titleWords.filter((w) => w.length > 3)
      if (meaningfulWords.length > 0) {
        issues.push("Response may not be relevant to the problem")
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
      issues.push("Response contains potential refusal/hallucination pattern")
      relevanceScore -= 30
      break
    }
  }

  // Check for code-related keywords if it's a coding problem
  if (problemContext.type === "dsa" || problemContext.type === "bugfix") {
    const codeKeywords = ["function", "return", "algorithm", "complexity", "approach", "solution"]
    const hasCodeContext = codeKeywords.some((keyword) => response.toLowerCase().includes(keyword))

    // If no code-related keywords in a long response, might be off-topic
    if (!hasCodeContext && response.length > 200) {
      issues.push("Response lacks code/algorithm context for technical problem")
      relevanceScore -= 15
    }
  }

  return {
    valid: relevanceScore >= 50,
    confidence: Math.max(0, relevanceScore),
    issues,
  }
}
