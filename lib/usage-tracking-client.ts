/**
 * Usage Tracking - Client-Safe Utilities
 *
 * This module contains constants and pure functions that can be safely
 * imported in both client and server components.
 *
 * For server-only functionality (like trackUsageEvent), import from
 * './usage-tracking' instead.
 */

// Cost per 1K tokens for each provider (input + output averaged) - Jan 2025
export const PROVIDER_COSTS = {
  gemini: 0.000188, // Gemini 2.5 Flash: $0.075 in + $0.30 out per 1M
  "gemini-pro": 0.003125, // Gemini 2.5 Pro: $1.25 in + $5.00 out per 1M
  deepseek: 0.00021, // Deepseek: $0.14 in + $0.28 out per 1M
  claude: 0.0024, // Claude 3.5 Haiku: $0.80 in + $4.00 out per 1M
  "claude-sonnet": 0.009, // Claude Sonnet 4: $3 in + $15 out per 1M
  "gpt-4o": 0.00625, // GPT-4o: $2.50 in + $10 out per 1M
  "gpt-4o-mini": 0.000375, // GPT-4o mini: $0.15 in + $0.60 out per 1M
} as const

// Deepgram voice costs (per minute of audio)
export const DEEPGRAM_COSTS = {
  "nova-2": 0.0043, // Nova-2: $0.0043/min (Pay As You Go)
  nova: 0.0041, // Nova: $0.0041/min
  enhanced: 0.0145, // Enhanced: $0.0145/min
  base: 0.0125, // Base: $0.0125/min
} as const

// Embedding costs per 1K tokens
export const EMBEDDING_COSTS = {
  "text-embedding-004": 0.000025, // Gemini: Free tier generous, ~$0.025/1M chars
  "text-embedding-3-small": 0.00002, // OpenAI: $0.02/1M tokens
  "text-embedding-3-large": 0.00013, // OpenAI: $0.13/1M tokens
  "text-embedding-ada-002": 0.0001, // OpenAI: $0.10/1M tokens (legacy)
} as const

// Budget caps per subscription tier (per billing cycle)
export const BUDGET_CAPS = {
  free: 0.5, // $0.50 - enough for ~50 sessions with Gemini
  pro: 25.0, // $25/month
  enterprise: 100.0, // $100/month
} as const

/**
 * Calculate cost for an AI API call
 * Pure function - safe to use anywhere
 */
export function calculateCost(inputTokens: number, outputTokens: number, provider: string): number {
  const costPer1k = PROVIDER_COSTS[provider as keyof typeof PROVIDER_COSTS] || PROVIDER_COSTS.gemini
  const totalTokens = inputTokens + outputTokens
  return (totalTokens / 1000) * costPer1k
}

/**
 * Calculate cost for voice transcription (Deepgram)
 * @param durationSeconds - Duration of audio in seconds
 * @param model - Deepgram model used
 */
export function calculateVoiceCost(
  durationSeconds: number,
  model: keyof typeof DEEPGRAM_COSTS = "nova-2"
): number {
  const costPerMinute = DEEPGRAM_COSTS[model] || DEEPGRAM_COSTS["nova-2"]
  const minutes = durationSeconds / 60
  return minutes * costPerMinute
}

/**
 * Calculate cost for embedding generation
 * @param tokens - Number of tokens embedded
 * @param model - Embedding model used
 */
export function calculateEmbeddingCost(
  tokens: number,
  model: keyof typeof EMBEDDING_COSTS = "text-embedding-004"
): number {
  const costPer1k = EMBEDDING_COSTS[model] || EMBEDDING_COSTS["text-embedding-004"]
  return (tokens / 1000) * costPer1k
}
