/**
 * Text Sanitization for RAG
 *
 * Startup-grade sanitization:
 * - Prevents API crashes (null bytes, extreme length)
 * - Logs suspicious patterns (doesn't block)
 * - Keeps it simple
 */

const MAX_LENGTH = 10000 // ~2500 tokens, generous limit
const MIN_LENGTH = 3

/**
 * Sanitize text before embedding
 * Prevents crashes, doesn't over-engineer
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== "string") {
    return ""
  }

  let clean = text

  // 1. Remove null bytes (breaks APIs)
  clean = clean.replace(/\0/g, "")

  // 2. Remove other control characters that can cause issues
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")

  // 3. Normalize whitespace (prevents token bloat)
  clean = clean.replace(/\s+/g, " ").trim()

  // 4. Truncate if too long (prevents cost blowup + timeouts)
  if (clean.length > MAX_LENGTH) {
    clean = clean.slice(0, MAX_LENGTH)
  }

  return clean
}

/**
 * Check for issues and log them (doesn't block, just warns)
 * Helps us understand what users are pasting
 */
export function checkForIssues(text: string, context?: string): string[] {
  const warnings: string[] = []

  if (!text) {
    return warnings
  }

  // Very long input (probably pasting entire files)
  if (text.length > 50000) {
    warnings.push(`Very long input: ${text.length} chars`)
  }

  // Possible email addresses (PII awareness)
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const emails = text.match(emailPattern)
  if (emails && emails.length > 0) {
    warnings.push(`Possible emails detected: ${emails.length}`)
  }

  // Possible API keys (security awareness)
  const apiKeyPatterns = [
    /sk-[a-zA-Z0-9]{20,}/, // OpenAI
    /AIza[0-9A-Za-z-_]{35}/, // Google
    /ghp_[a-zA-Z0-9]{36}/, // GitHub
  ]
  for (const pattern of apiKeyPatterns) {
    if (pattern.test(text)) {
      warnings.push("Possible API key detected")
      break
    }
  }

  // Log warnings if any
  if (warnings.length > 0) {
    console.warn(`[RAG Sanitize]${context ? ` (${context})` : ""} Warnings:`, warnings)
  }

  return warnings
}

/**
 * Validate text is suitable for embedding
 */
export function validateForEmbedding(text: string): {
  valid: boolean
  error?: string
} {
  if (!text || typeof text !== "string") {
    return { valid: false, error: "Text must be a non-empty string" }
  }

  const sanitized = sanitizeText(text)

  if (sanitized.length < MIN_LENGTH) {
    return { valid: false, error: `Text too short (min ${MIN_LENGTH} chars after sanitization)` }
  }

  return { valid: true }
}

/**
 * Full sanitization pipeline
 * Use this as the main entry point
 */
export function prepareTextForEmbedding(
  text: string,
  options: {
    context?: string
    logWarnings?: boolean
  } = {}
): {
  text: string
  valid: boolean
  error?: string
  warnings: string[]
} {
  const { context, logWarnings = true } = options

  // Check for issues first (logs them)
  const warnings = logWarnings ? checkForIssues(text, context) : []

  // Sanitize
  const sanitized = sanitizeText(text)

  // Validate
  const validation = validateForEmbedding(sanitized)

  return {
    text: sanitized,
    valid: validation.valid,
    error: validation.error,
    warnings,
  }
}
