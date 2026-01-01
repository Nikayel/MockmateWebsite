/**
 * Token Counter Utility
 *
 * Estimates token counts for text before sending to AI models.
 * Uses a simple approximation since exact tokenization requires model-specific tokenizers.
 *
 * Approximations:
 * - GPT-4/Claude: ~4 characters per token on average
 * - For code: ~3 characters per token (more tokens due to syntax)
 */

// Average characters per token for different content types
const CHARS_PER_TOKEN = {
  text: 4,
  code: 3,
  mixed: 3.5,
}

export interface TokenEstimate {
  tokens: number
  characters: number
  type: 'text' | 'code' | 'mixed'
}

/**
 * Detect if content is primarily code
 */
function detectContentType(text: string): 'text' | 'code' | 'mixed' {
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
  ]

  const codeScore = codeIndicators.reduce((score, pattern) => {
    return score + (pattern.test(text) ? 1 : 0)
  }, 0)

  if (codeScore >= 5) return 'code'
  if (codeScore >= 2) return 'mixed'
  return 'text'
}

/**
 * Estimate token count for a string
 */
export function estimateTokens(text: string): TokenEstimate {
  if (!text) {
    return { tokens: 0, characters: 0, type: 'text' }
  }

  const type = detectContentType(text)
  const charsPerToken = CHARS_PER_TOKEN[type]
  const tokens = Math.ceil(text.length / charsPerToken)

  return {
    tokens,
    characters: text.length,
    type,
  }
}

/**
 * Estimate tokens for conversation messages
 */
export function estimateConversationTokens(
  messages: Array<{ role: string; content: string }>
): number {
  // Base overhead per message (role, delimiters)
  const MESSAGE_OVERHEAD = 4

  return messages.reduce((total, msg) => {
    const contentTokens = estimateTokens(msg.content).tokens
    return total + contentTokens + MESSAGE_OVERHEAD
  }, 0)
}

/**
 * Model context limits (in tokens)
 */
export const MODEL_CONTEXT_LIMITS = {
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-4-turbo': 128000,
  'gpt-4o': 128000,
  'claude-3-sonnet': 200000,
  'claude-3-opus': 200000,
  'claude-3-haiku': 200000,
  'gemini-pro': 32000,
  'gemini-1.5-pro': 1000000,
} as const

export type ModelName = keyof typeof MODEL_CONTEXT_LIMITS

/**
 * Check if content fits within model context
 */
export function fitsInContext(
  tokens: number,
  model: ModelName,
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
  model: ModelName,
  reserveForResponse: number = 4000
): Array<{ role: string; content: string }> {
  const limit = MODEL_CONTEXT_LIMITS[model] - reserveForResponse

  // Always keep the first message (usually system prompt)
  if (messages.length <= 1) {
    return messages
  }

  const systemMessage = messages[0]
  const systemTokens = estimateTokens(systemMessage.content).tokens + 4

  // Start with system message and work backwards from most recent
  const result: Array<{ role: string; content: string }> = [systemMessage]
  let usedTokens = systemTokens

  // Add messages from the end, keeping most recent
  for (let i = messages.length - 1; i >= 1; i--) {
    const msg = messages[i]
    const msgTokens = estimateTokens(msg.content).tokens + 4

    if (usedTokens + msgTokens <= limit) {
      result.splice(1, 0, msg) // Insert after system message
      usedTokens += msgTokens
    } else {
      // Add a summary message if we had to truncate
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
 * Estimate tokens for a code string with additional context
 */
export function estimateCodeTokens(
  code: string,
  options: {
    includeContext?: boolean
    problemDescription?: string
    testCases?: number
  } = {}
): number {
  const codeTokens = estimateTokens(code).tokens

  let additionalTokens = 0

  if (options.problemDescription) {
    additionalTokens += estimateTokens(options.problemDescription).tokens
  }

  if (options.testCases) {
    // Rough estimate: ~50 tokens per test case
    additionalTokens += options.testCases * 50
  }

  if (options.includeContext) {
    // Add overhead for context formatting
    additionalTokens += 100
  }

  return codeTokens + additionalTokens
}
