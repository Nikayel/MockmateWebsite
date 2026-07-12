/**
 * Complexity and candidate-signal patterns.
 *
 * These helpers support transcript understanding, voice transcription cleanup,
 * complexity rank comparisons, and edge-case detection. Semantic extraction is
 * the primary path where available; these remain as fast deterministic support
 * and fallback logic.
 */

// =============================================================================
// COMPLEXITY PATTERNS
// =============================================================================

/**
 * Patterns for detecting complexity mentions in text
 * Used by: interview-phases.ts, conversation-extraction.ts, structured-extraction.ts
 *
 * IMPORTANT: Voice transcriptions often produce non-standard formats like:
 * - "on2" instead of "O(n²)"
 * - "o n squared" instead of "O(n²)"
 * - "o of n" instead of "O(n)"
 * - "o1" instead of "O(1)"
 * These are handled by VOICE_COMPLEXITY_PATTERNS below.
 */
export const COMPLEXITY_PATTERNS = {
  // Standard O notation: O(n), O(n²), O(n log n)
  bigO: /O\s*\(\s*([^)]+)\s*\)/gi,

  // Verbal: "O of n", "O of n squared"
  verbal: /O\s+of\s+(\w+(?:\s+\w+)?)/gi,

  // Natural language: "linear time", "quadratic time"
  naturalLanguage: /(\w+)\s+(?:time|complexity)/gi,

  // Common complexity keywords
  keywords: {
    constant: ["O(1)", "constant"],
    logarithmic: ["O(log n)", "logarithmic", "log n"],
    linear: ["O(n)", "linear", "n time"],
    linearithmic: ["O(n log n)", "n log n", "linearithmic"],
    quadratic: ["O(n²)", "O(n^2)", "quadratic", "n squared", "n^2"],
    cubic: ["O(n³)", "O(n^3)", "cubic", "n cubed"],
    exponential: ["O(2^n)", "exponential", "2^n"],
  },
}

/**
 * Voice transcription patterns for complexity
 * These catch common speech-to-text outputs that standard patterns miss
 */
export const VOICE_COMPLEXITY_PATTERNS = [
  // "on2" / "on 2" / "o n 2" -> O(n²)
  { pattern: /\bo\s*n\s*2\b/i, complexity: "O(n²)" },
  { pattern: /\bon2\b/i, complexity: "O(n²)" },
  // "on squared" / "o n squared" / "on square" / "o n square" -> O(n²)
  // IMPORTANT: "square" (without 'd') is common in voice transcription
  { pattern: /\bo\s*n\s*squared?\b/i, complexity: "O(n²)" },
  { pattern: /\bon\s*squared?\b/i, complexity: "O(n²)" },
  // "o1" / "o 1" -> O(1)
  { pattern: /\bo\s*1\b/i, complexity: "O(1)" },
  { pattern: /\bo1\b/i, complexity: "O(1)" },
  // "on" / "o n" (alone, not part of other words) -> O(n)
  // Negative lookahead to avoid matching "o n square" which should be O(n²)
  { pattern: /\bo\s*n\b(?!\s*(?:log|squared?|2|3))/i, complexity: "O(n)" },
  { pattern: /\bon\b(?!\s*(?:log|squared?|2|3|e|ce|ly))/i, complexity: "O(n)" },
  // "on log n" / "o n log n" -> O(n log n)
  { pattern: /\bo\s*n\s*log\s*n\b/i, complexity: "O(n log n)" },
  { pattern: /\bon\s*log\s*n\b/i, complexity: "O(n log n)" },
  // "oen log en" (voice mishear) -> O(n log n)
  { pattern: /\bo\s*e?n\s*log\s*e?n\b/i, complexity: "O(n log n)" },
  // "log n" -> O(log n)
  { pattern: /\blog\s*n\b/i, complexity: "O(log n)" },

  // NEW: Common voice transcription artifacts for O(log n)
  // "o log in" is very common - voice transcribes "log n" as "log in"
  { pattern: /\bo\s*log\s*in\b/i, complexity: "O(log n)" },
  { pattern: /\boh\s*log\s*n\b/i, complexity: "O(log n)" },
  { pattern: /\boh\s*log\s*in\b/i, complexity: "O(log n)" },
  // "log in" alone (not "log in to") -> O(log n)
  { pattern: /\blog\s*in\b(?!\s*to)/i, complexity: "O(log n)" },
  { pattern: /\blog\s*of\s*n\b/i, complexity: "O(log n)" },
  { pattern: /\blogn\b/i, complexity: "O(log n)" },
  { pattern: /\blogarithm/i, complexity: "O(log n)" },

  // NEW: More O(1) variations
  { pattern: /\bconstant\s*(?:time|space)\b/i, complexity: "O(1)" },

  // NEW: Voice artifacts for O(n)
  { pattern: /\bo\s*en\b/i, complexity: "O(n)" },
  { pattern: /\boh\s*n\b/i, complexity: "O(n)" },
]

/**
 * Shared prompt fragment describing how spoken/voice-transcribed complexity
 * phrasings normalize to standard Big-O notation.
 *
 * This is the single source of truth for the spoken-complexity normalization
 * rule used across LLM prompts (conversation extraction, structured feedback
 * extraction, conversation validation). It mirrors the deterministic mapping
 * in VOICE_COMPLEXITY_PATTERNS above so prompt guidance and code stay aligned.
 *
 * Interpolate this fragment into a prompt in place of any bespoke wording; do
 * not restate these mappings inline.
 */
export const SPOKEN_COMPLEXITY_RULES = `Voice transcription often produces non-standard spellings of Big-O notation. Interpret these charitably and normalize to standard O() notation:
- "o 1", "o one", "constant" = O(1)
- "o log in", "log in", "o log n", "log n", "logarithmic" = O(log n)
- "o n", "on", "oh n", "o en", "linear" = O(n)
- "o n log n", "n log n", "linearithmic" = O(n log n)
- "o n 2", "on2", "o n squared", "o n square", "n squared", "quadratic" = O(n²)
- "o n 3", "n cubed", "cubic" = O(n³)
If it sounds like a complexity, interpret it charitably.`

/**
 * Extract complexity from text, including voice transcriptions
 */
export function extractComplexityFromText(text: string): string | null {
  const lower = text.toLowerCase()

  // First try voice transcription patterns (most specific)
  for (const { pattern, complexity } of VOICE_COMPLEXITY_PATTERNS) {
    if (pattern.test(lower)) {
      return complexity
    }
  }

  // Then try standard O notation
  const bigOMatch = text.match(COMPLEXITY_PATTERNS.bigO)
  if (bigOMatch && bigOMatch.length > 0) {
    return bigOMatch[0]
  }

  // Then try verbal patterns
  const verbalMatch = text.match(COMPLEXITY_PATTERNS.verbal)
  if (verbalMatch && verbalMatch.length > 0) {
    return verbalMatch[0]
  }

  // Check for natural language keywords
  for (const [type, keywords] of Object.entries(COMPLEXITY_PATTERNS.keywords)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        // Return the standard O notation for this type
        switch (type) {
          case "constant":
            return "O(1)"
          case "logarithmic":
            return "O(log n)"
          case "linear":
            return "O(n)"
          case "linearithmic":
            return "O(n log n)"
          case "quadratic":
            return "O(n²)"
          case "cubic":
            return "O(n³)"
          case "exponential":
            return "O(2^n)"
        }
      }
    }
  }

  return null
}

/**
 * Fuzzy extract complexity from voice transcription
 * More lenient than extractComplexityFromText - for when exact match fails
 * Used as a fallback to catch edge cases in voice transcription
 */
export function fuzzyExtractComplexity(text: string): string | null {
  // Try exact extraction first
  const exact = extractComplexityFromText(text)
  if (exact) return exact

  const lower = text.toLowerCase()

  // Fuzzy patterns for voice transcription - catches edge cases
  const fuzzyPatterns = [
    // Log variants - very common in voice transcription
    { test: /log.{0,3}(n|in|en|and)/i, result: "O(log n)" },
    { test: /logarith/i, result: "O(log n)" },
    // Linear variants - very generous to catch voice transcription
    { test: /\blinear\b/i, result: "O(n)" },
    { test: /\bo\s+n\b/i, result: "O(n)" }, // "o n" with space
    { test: /\boh?\s*en\b/i, result: "O(n)" }, // "oh en" or "o en"
    { test: /\bo\s+of\s+n\b/i, result: "O(n)" }, // "o of n"
    // Constant variants
    { test: /\bconstant\b/i, result: "O(1)" },
    { test: /\bo\s+one\b/i, result: "O(1)" }, // "o one"
    { test: /\bo\s+of\s+one\b/i, result: "O(1)" }, // "o of one"
    { test: /\boh?\s*one\b/i, result: "O(1)" }, // "oh one"
    // Quadratic variants
    { test: /\bquadrat/i, result: "O(n²)" },
    { test: /\bn\s*square/i, result: "O(n²)" },
    { test: /\bo\s+n\s*2\b/i, result: "O(n²)" }, // "o n 2"
    { test: /\bo\s+n\s*squared?\b/i, result: "O(n²)" }, // "o n squared"
  ]

  for (const { test, result } of fuzzyPatterns) {
    if (test.test(lower)) return result
  }

  return null
}

/**
 * Complexity ranking for dominance calculation
 * Higher rank = worse complexity = dominates
 */
export const COMPLEXITY_RANKS: Record<string, number> = {
  // Best to worst
  "O(1)": 10,
  "O(LOG N)": 20,
  "O(N)": 40,
  "O(N LOG N)": 60,
  "O(N²)": 80,
  "O(N^2)": 80,
  "O(N2)": 80,
  "O(N³)": 90,
  "O(N^3)": 90,
  "O(2^N)": 95,
  "O(N!)": 100,
}

/**
 * Get rank for a complexity string
 * Returns higher number for worse complexity
 */
export function getComplexityRank(complexity: string): number {
  const normalized = complexity
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace("²", "^2")
    .replace("³", "^3")

  // Direct match
  if (COMPLEXITY_RANKS[normalized]) {
    return COMPLEXITY_RANKS[normalized]
  }

  // Pattern matching for variations
  if (normalized.includes("N^2") || normalized.includes("N²") || normalized.includes("QUADRATIC")) {
    return 80
  }
  if (normalized.includes("NLOGN") || normalized.includes("N LOG N")) {
    return 60
  }
  if (
    normalized.includes("LOGN") ||
    normalized.includes("LOG N") ||
    normalized.includes("LOGARITHMIC")
  ) {
    return 20
  }
  if (normalized.includes("N)") && !normalized.includes("LOG") && !normalized.includes("^")) {
    return 40 // O(n) - linear
  }
  if (normalized.includes("1)") || normalized.includes("CONSTANT")) {
    return 10
  }

  return 50 // Unknown - treat as middle ground
}

/**
 * Find dominant (worst) complexity from a list
 */
export function findDominantComplexity(complexities: string[]): string | null {
  if (!complexities || complexities.length === 0) return null

  let dominant = complexities[0]
  let highestRank = getComplexityRank(dominant)

  for (const c of complexities) {
    const rank = getComplexityRank(c)
    if (rank > highestRank) {
      highestRank = rank
      dominant = c
    }
  }

  return dominant
}

/**
 * Normalize complexity string to standard format
 */
export function normalizeComplexity(raw: string): string {
  const upper = raw.toUpperCase().trim()

  // Handle natural language
  if (upper.includes("LINEAR")) return "O(n)"
  if (upper.includes("CONSTANT")) return "O(1)"
  if (upper.includes("QUADRATIC") || upper.includes("N SQUARED")) return "O(n²)"
  if (upper.includes("LOGARITHMIC")) return "O(log n)"

  // Handle "n log n" variations
  if (/N\s*LOG\s*N/i.test(upper)) return "O(n log n)"

  // Already in O() format - normalize
  const match = upper.match(/O\s*\(\s*([^)]+)\s*\)/)
  if (match) {
    return `O(${match[1].toLowerCase().replace(/\s+/g, " ").trim()})`
  }

  return raw // Return as-is if can't normalize
}

// =============================================================================
// EDGE CASE KEYWORDS
// =============================================================================

/**
 * Keywords that indicate edge case discussion
 * Used by: interview-phases.ts, response-validation.ts
 */
export const EDGE_CASE_KEYWORDS = [
  "empty",
  "null",
  "none",
  "zero",
  "negative",
  "single",
  "one element",
  "duplicate",
  "edge case",
  "what if",
  "corner case",
  "boundary",
  "overflow",
  "underflow",
  "max",
  "min",
  "large input",
] as const

/**
 * Extract mentioned edge cases from text
 */
export function extractEdgeCases(text: string): string[] {
  const lower = text.toLowerCase()
  return EDGE_CASE_KEYWORDS.filter((keyword) => lower.includes(keyword))
}

// =============================================================================
// CODING TRANSITION PATTERNS
// =============================================================================

/**
 * Patterns that indicate interviewer is telling candidate to start coding
 * Used by: response-validation.ts (no-premature-coding gate)
 */
export const CODING_TRANSITION_PATTERNS = [
  /code it up/i,
  /go ahead and code/i,
  /start coding/i,
  /let's code/i,
  /go code/i,
  /begin coding/i,
  /you can (?:start|begin) (?:coding|implementing)/i,
  /start implementing/i,
  /go ahead and implement/i,

  // NEW: Broader patterns that catch more variations
  // Catches "You may now proceed with coding your solution"
  /(?:you )?(?:may|can) (?:now )?(?:proceed|go ahead|start|begin)(?:\s+(?:with|to))?\s*(?:cod|implement|writ)/i,
  /(?:ready|feel free) to (?:start|begin) (?:coding|implementing|writing)/i,
  /(?:let's|shall we) (?:move|proceed) (?:to|into|with) (?:the )?(?:coding|implementation)/i,
  /(?:time|ready) to (?:code|implement|write)/i,
  /(?:dive|jump) (?:into|in) (?:the )?(?:code|implementation|coding)/i,
]

/**
 * Semantic detection of coding transition intent
 * This catches cases where regex patterns miss variations
 * Uses keyword co-occurrence to detect intent
 */
export function hasCodingTransitionIntent(response: string): boolean {
  const lower = response.toLowerCase()

  // Must have action word + coding-related word
  const actionWords = ["proceed", "go ahead", "start", "begin", "ready", "move", "dive", "time to"]
  const codingWords = ["code", "coding", "implement", "implementation", "write", "writing"]

  const hasAction = actionWords.some((w) => lower.includes(w))
  const hasCoding = codingWords.some((w) => lower.includes(w))

  // Both must be present AND no complexity question in same response
  // If they're asking about complexity, they're NOT saying "go code"
  const asksAboutComplexity = /what(?:'s| is).*complexity|time.*complexity|space.*complexity/i.test(
    response
  )

  return hasAction && hasCoding && !asksAboutComplexity
}

/**
 * Check if response contains coding transition
 * Uses regex patterns first (fast), then falls back to semantic detection
 */
export function containsCodingTransition(response: string): boolean {
  // First check regex patterns (fast)
  if (CODING_TRANSITION_PATTERNS.some((p) => p.test(response))) {
    return true
  }
  // Fallback to semantic intent detection
  return hasCodingTransitionIntent(response)
}

/**
 * Find the message index where coding phase starts
 * Returns -1 if no coding transition found
 */
export function findCodingPhaseStart(transcript: Array<{ role: string; content: string }>): number {
  for (let i = 0; i < transcript.length; i++) {
    const msg = transcript[i]
    // Look for interviewer telling them to code
    if (
      (msg.role === "assistant" || msg.role === "interviewer") &&
      containsCodingTransition(msg.content)
    ) {
      return i
    }
  }
  return -1
}

// =============================================================================
// CODE EXPLANATION DETECTION (fast heuristic fallback)
// =============================================================================

/**
 * IMPORTANT: This is a HEURISTIC fallback, not the primary detector.
 *
 * Real detection happens via LLM in structured-extraction.ts (extractSemantically).
 * This is used for:
 * 1. Quick algorithmic pass before LLM (saves API calls)
 * 2. Fallback if LLM extraction fails
 * 3. Double-checking LLM results
 *
 * Production systems use:
 * - LLM classification (primary) ✓ We have this
 * - Embedding similarity (optional, needs training data)
 * - Multi-modal correlation (audio timestamps + code changes)
 * - Agentic acknowledgment (interviewer AI confirms in real-time)
 */

/**
 * HEURISTIC: Quick check if message might be code explanation
 * Returns true if the message has signals of code narration.
 * False positives are OK - LLM will verify.
 * False negatives are bad - be generous.
 */
export function isCodeExplanation(message: string): boolean {
  // Too short to be meaningful
  if (message.length < 20) return false

  const lower = message.toLowerCase()

  // Obvious filler - definitely not code explanation
  const fillerOnly = /^(hmm|uh|um|ok|okay|let me think|one sec|hold on|wait)[.!?]*$/i.test(
    message.trim()
  )
  if (fillerOnly) return false

  // GENEROUS signals that this might be code explanation:
  // (LLM will verify, so false positives are OK)
  const codeSignals = [
    // Narration verbs
    "i'm ",
    "i am ",
    "let me ",
    "i'll ",
    "i will ",
    "setting",
    "initializing",
    "creating",
    "starting",
    "looping",
    "iterating",
    "checking",
    "comparing",
    "returning",
    "calling",
    "passing",
    "adding",
    // Code concepts
    "variable",
    "pointer",
    "index",
    "array",
    "loop",
    "function",
    "return",
    "if ",
    "else",
    "while",
    "for ",
    "the value",
    "this will",
    "that should",
    // Narration phrases
    "so here",
    "so now",
    "first i",
    "then i",
    "next i",
    "basically",
    "essentially",
    "this handles",
  ]

  return codeSignals.some((signal) => lower.includes(signal))
}
