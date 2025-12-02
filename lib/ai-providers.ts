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
 */

import { GoogleGenerativeAI } from "@google/generative-ai"

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

// Provider configurations
const PROVIDERS: Record<AIProvider, ProviderConfig> = {
  gemini: {
    name: 'gemini',
    enabled: true,
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.5-flash',
    maxTokens: 1024,
    temperature: 0.7,
    costPer1kTokens: 0.0001, // Very cheap
  },
  deepseek: {
    name: 'deepseek',
    enabled: !!process.env.DEEPSEEK_API_KEY,
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    maxTokens: 1024,
    temperature: 0.7,
    costPer1kTokens: 0.00014, // $0.14 per million tokens
  },
  claude: {
    name: 'claude',
    enabled: !!process.env.ANTHROPIC_API_KEY,
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-haiku-20240307', // Use Haiku for cost efficiency
    maxTokens: 1024,
    temperature: 0.7,
    costPer1kTokens: 0.00025, // Haiku is cheap
  },
}

// Fallback order based on task complexity
const FALLBACK_ORDER: Record<TaskComplexity, AIProvider[]> = {
  simple: ['deepseek', 'gemini', 'claude'],   // Cheapest first
  standard: ['gemini', 'deepseek', 'claude'], // Balanced
  complex: ['gemini', 'claude', 'deepseek'],  // Quality first
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
  } = {}
): Promise<AIResponse> {
  const {
    complexity = 'standard',
    preferredProvider,
    maxRetries = MAX_RETRIES,
    temperature,
  } = options

  const startTime = Date.now()

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

        return {
          text,
          provider,
          latencyMs,
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
