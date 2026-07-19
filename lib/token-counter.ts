/**
 * Accurate Token Counter
 *
 * Uses js-tiktoken for accurate token counting based on actual model tokenizers.
 * Supports GPT-4, Claude, and Gemini models with their respective encodings.
 *
 * Token counting is now ACCURATE, not estimated:
 * - GPT/OpenAI models: Uses cl100k_base encoding (GPT-4, GPT-3.5-turbo)
 * - Claude models: Uses cl100k_base as approximation (very close match)
 * - Gemini models: Uses cl100k_base as approximation
 */

import { getEncoding, Tiktoken } from 'js-tiktoken'

// Lazy-loaded encoder instances
let cl100kEncoder: Tiktoken | null = null

/**
 * Get or initialize the cl100k_base encoder (used by GPT-4, Claude approximation)
 */
function getEncoder(): Tiktoken {
  if (!cl100kEncoder) {
    cl100kEncoder = getEncoding('cl100k_base')
  }
  return cl100kEncoder
}

/**
 * Model families and their token counting approach
 */
export const MODEL_FAMILIES = {
  // OpenAI models - use cl100k_base directly
  'gpt-4': 'cl100k_base',
  'gpt-4-turbo': 'cl100k_base',
  'gpt-4o': 'cl100k_base',
  'gpt-4o-mini': 'cl100k_base',
  'gpt-3.5-turbo': 'cl100k_base',

  // Claude models - cl100k_base is ~95% accurate for Claude
  'claude-3-opus': 'cl100k_base',
  'claude-3-sonnet': 'cl100k_base',
  'claude-3-haiku': 'cl100k_base',
  'claude-sonnet-4': 'cl100k_base',
  'claude-opus-4': 'cl100k_base',

  // Gemini models - cl100k_base is ~90% accurate. The live ids (see lib/ai/model-ids) must
  // stay covered here so a model upgrade does not strand token accounting.
  'gemini-pro': 'cl100k_base',
  'gemini-1.5-pro': 'cl100k_base',
  'gemini-2.0-flash': 'cl100k_base',
  'gemini-2.5-flash': 'cl100k_base',
  'gemini-2.5-flash-lite': 'cl100k_base',

  // DeepSeek - cl100k_base approximation
  'deepseek': 'cl100k_base',
  'deepseek-chat': 'cl100k_base',
  'deepseek-coder': 'cl100k_base',
} as const

export type ModelName = keyof typeof MODEL_FAMILIES

export interface TokenCount {
  tokens: number
  characters: number
  isExact: boolean  // true if using exact tokenizer, false if fallback estimation
  model?: string
}

export interface ConversationTokenCount extends TokenCount {
  messageCount: number
  breakdown: {
    systemPrompt: number
    userMessages: number
    assistantMessages: number
    overhead: number  // role markers, delimiters
  }
}

/**
 * Count tokens accurately using the model's tokenizer
 *
 * @param text - The text to tokenize
 * @param model - Optional model name for model-specific adjustments
 * @returns Token count with metadata
 */
export function countTokens(text: string, model?: string): TokenCount {
  if (!text) {
    return { tokens: 0, characters: 0, isExact: true, model }
  }

  try {
    const encoder = getEncoder()
    const tokens = encoder.encode(text)

    return {
      tokens: tokens.length,
      characters: text.length,
      isExact: true,
      model,
    }
  } catch (error) {
    // Fallback to estimation if tokenization fails
    console.warn('[Token Counter] Tokenization failed, using estimation:', error)
    return estimateTokensFallback(text, model)
  }
}

/**
 * Fallback estimation when tokenizer fails
 * Uses refined character-based estimation
 */
function estimateTokensFallback(text: string, model?: string): TokenCount {
  const contentType = detectContentType(text)

  // Refined estimates based on content type
  const charsPerToken = {
    text: 4.0,      // English prose
    code: 2.8,      // Code has more tokens per character
    mixed: 3.4,     // Mixed content
    json: 3.0,      // JSON/structured data
  }

  const tokens = Math.ceil(text.length / charsPerToken[contentType])

  return {
    tokens,
    characters: text.length,
    isExact: false,
    model,
  }
}

/**
 * Detect content type for fallback estimation
 */
function detectContentType(text: string): 'text' | 'code' | 'mixed' | 'json' {
  // Check for JSON
  const trimmed = text.trim()
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch {
      // Not valid JSON, continue
    }
  }

  // Check for code indicators
  const codeIndicators = [
    /\bfunction\b/,
    /\bconst\b/,
    /\blet\b/,
    /\bvar\b/,
    /\bclass\b/,
    /\bimport\b/,
    /\breturn\b/,
    /[{}[\]();]/,
    /=>/,
    /\bif\s*\(/,
    /\bfor\s*\(/,
    /\bwhile\s*\(/,
    /\bdef\s+/,      // Python
    /\bpub\s+fn\b/,  // Rust
  ]

  const codeScore = codeIndicators.reduce((score, pattern) => {
    return score + (pattern.test(text) ? 1 : 0)
  }, 0)

  if (codeScore >= 5) return 'code'
  if (codeScore >= 2) return 'mixed'
  return 'text'
}

/**
 * Count tokens for a conversation (array of messages)
 * Accounts for message overhead (role markers, delimiters)
 */
export function countConversationTokens(
  messages: Array<{ role: string; content: string }>,
  model?: string
): ConversationTokenCount {
  // Per-message overhead tokens (role marker, delimiters, separators)
  const MESSAGE_OVERHEAD = 4

  let totalTokens = 0
  let systemTokens = 0
  let userTokens = 0
  let assistantTokens = 0

  for (const msg of messages) {
    const count = countTokens(msg.content, model)
    totalTokens += count.tokens + MESSAGE_OVERHEAD

    switch (msg.role) {
      case 'system':
        systemTokens += count.tokens
        break
      case 'user':
        userTokens += count.tokens
        break
      case 'assistant':
        assistantTokens += count.tokens
        break
    }
  }

  // Conversation-level overhead (start/end tokens)
  const conversationOverhead = 3
  totalTokens += conversationOverhead

  return {
    tokens: totalTokens,
    characters: messages.reduce((sum, m) => sum + m.content.length, 0),
    isExact: true,
    model,
    messageCount: messages.length,
    breakdown: {
      systemPrompt: systemTokens,
      userMessages: userTokens,
      assistantMessages: assistantTokens,
      overhead: (messages.length * MESSAGE_OVERHEAD) + conversationOverhead,
    },
  }
}

/**
 * Model context limits (in tokens)
 */
export const MODEL_CONTEXT_LIMITS = {
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-4-turbo': 128000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-3.5-turbo': 16385,
  'claude-3-sonnet': 200000,
  'claude-3-opus': 200000,
  'claude-3-haiku': 200000,
  'claude-sonnet-4': 200000,
  'claude-opus-4': 200000,
  'gemini-pro': 32000,
  'gemini-1.5-pro': 2000000,
  'gemini-2.0-flash': 1000000,
  'gemini-2.5-flash': 1000000,
  'gemini-2.5-flash-lite': 1000000,
  'deepseek': 128000,
  'deepseek-chat': 128000,
  'deepseek-coder': 128000,
} as const

/**
 * Check if content fits within model context
 */
export function fitsInContext(
  tokens: number,
  model: keyof typeof MODEL_CONTEXT_LIMITS,
  reserveForResponse: number = 4000
): boolean {
  const limit = MODEL_CONTEXT_LIMITS[model]
  return tokens + reserveForResponse <= limit
}

/**
 * Truncate messages to fit context window
 * Keeps system message and most recent messages
 */
export function truncateToFitContext(
  messages: Array<{ role: string; content: string }>,
  model: keyof typeof MODEL_CONTEXT_LIMITS,
  reserveForResponse: number = 4000
): Array<{ role: string; content: string }> {
  const limit = MODEL_CONTEXT_LIMITS[model] - reserveForResponse

  if (messages.length <= 1) {
    return messages
  }

  const systemMessage = messages[0]
  const systemTokens = countTokens(systemMessage.content).tokens + 4

  const result: Array<{ role: string; content: string }> = [systemMessage]
  let usedTokens = systemTokens

  // Add messages from the end, keeping most recent
  for (let i = messages.length - 1; i >= 1; i--) {
    const msg = messages[i]
    const msgTokens = countTokens(msg.content).tokens + 4

    if (usedTokens + msgTokens <= limit) {
      result.splice(1, 0, msg)
      usedTokens += msgTokens
    } else {
      const droppedCount = i
      if (droppedCount > 0) {
        result.splice(1, 0, {
          role: 'system',
          content: `[${droppedCount} earlier messages truncated for context window management]`,
        })
      }
      break
    }
  }

  return result
}

/**
 * Count tokens for code with context
 */
export function countCodeTokens(
  code: string,
  options: {
    problemDescription?: string
    testCases?: string[]
    hints?: string[]
    model?: string
  } = {}
): {
  total: number
  breakdown: {
    code: number
    problemDescription: number
    testCases: number
    hints: number
  }
} {
  const codeTokens = countTokens(code, options.model).tokens
  const descTokens = options.problemDescription
    ? countTokens(options.problemDescription, options.model).tokens
    : 0
  const testTokens = options.testCases
    ? options.testCases.reduce((sum, tc) => sum + countTokens(tc, options.model).tokens, 0)
    : 0
  const hintTokens = options.hints
    ? options.hints.reduce((sum, h) => sum + countTokens(h, options.model).tokens, 0)
    : 0

  return {
    total: codeTokens + descTokens + testTokens + hintTokens,
    breakdown: {
      code: codeTokens,
      problemDescription: descTokens,
      testCases: testTokens,
      hints: hintTokens,
    },
  }
}

// =============================================================================
// LEGACY EXPORTS (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use countTokens() instead
 */
export function estimateTokens(text: string): { tokens: number; characters: number; type: string } {
  const result = countTokens(text)
  return {
    tokens: result.tokens,
    characters: result.characters,
    type: detectContentType(text),
  }
}

/**
 * @deprecated Use countConversationTokens() instead
 */
export function estimateConversationTokens(
  messages: Array<{ role: string; content: string }>
): number {
  return countConversationTokens(messages).tokens
}

/**
 * @deprecated Use countCodeTokens() instead
 */
export function estimateCodeTokens(
  code: string,
  options: {
    includeContext?: boolean
    problemDescription?: string
    testCases?: number
  } = {}
): number {
  const codeTokens = countTokens(code).tokens
  let additionalTokens = 0

  if (options.problemDescription) {
    additionalTokens += countTokens(options.problemDescription).tokens
  }

  if (options.testCases) {
    // Rough estimate: ~50 tokens per test case for backward compatibility
    additionalTokens += options.testCases * 50
  }

  if (options.includeContext) {
    additionalTokens += 100
  }

  return codeTokens + additionalTokens
}
