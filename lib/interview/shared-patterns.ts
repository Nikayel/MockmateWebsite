/**
 * Shared Patterns - Single Source of Truth
 *
 * This file consolidates all detection patterns used across the interview system.
 * Having a single source prevents drift between:
 * - Response validation (hard gates)
 * - Tool execution (state queries)
 * - Conversation extraction (LLM hints)
 *
 * DRY Principle: Change patterns in ONE place, affects ALL usages.
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
  // "on squared" / "o n squared" -> O(n²)
  { pattern: /\bo\s*n\s*squared\b/i, complexity: "O(n²)" },
  { pattern: /\bon\s*squared\b/i, complexity: "O(n²)" },
  // "o1" / "o 1" -> O(1)
  { pattern: /\bo\s*1\b/i, complexity: "O(1)" },
  { pattern: /\bo1\b/i, complexity: "O(1)" },
  // "on" / "o n" (alone, not part of other words) -> O(n)
  { pattern: /\bo\s*n\b(?!\s*(?:log|squared|2|3))/i, complexity: "O(n)" },
  { pattern: /\bon\b(?!\s*(?:log|squared|2|3|e|ce|ly))/i, complexity: "O(n)" },
  // "on log n" / "o n log n" -> O(n log n)
  { pattern: /\bo\s*n\s*log\s*n\b/i, complexity: "O(n log n)" },
  { pattern: /\bon\s*log\s*n\b/i, complexity: "O(n log n)" },
  // "oen log en" (voice mishear) -> O(n log n)
  { pattern: /\bo\s*e?n\s*log\s*e?n\b/i, complexity: "O(n log n)" },
  // "log n" -> O(log n)
  { pattern: /\blog\s*n\b/i, complexity: "O(log n)" },
]

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
  if (normalized.includes("LOGN") || normalized.includes("LOG N") || normalized.includes("LOGARITHMIC")) {
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
// VAGUE ANSWER PATTERNS
// =============================================================================

/**
 * Patterns that indicate a vague/non-specific answer
 * Used by: response-validation.ts, interviewer-tools.ts
 */
export const VAGUE_ANSWER_PATTERNS = [
  /i(?:'ll| will| can) (?:just )?skip (?:them|it|those)/i,
  /i(?:'ll| will| can) (?:just )?handle (?:that|it|those)/i,
  /i(?:'ll| will| can) (?:just )?check (?:for )?(?:that|it)/i,
  /i(?:'ll| will) (?:just )?(?:use|add) (?:a )?(?:condition|check|if)/i,
  /i(?:'ll| will| can) (?:just )?(?:do|use) (?:that|it|something)/i,
]

/**
 * Check if a message contains a vague answer
 */
export function isVagueAnswer(message: string): boolean {
  // Short messages that match vague patterns
  if (message.length > 100) return false // Long messages are usually specific
  return VAGUE_ANSWER_PATTERNS.some((p) => p.test(message))
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
]

/**
 * Check if response contains coding transition
 */
export function containsCodingTransition(response: string): boolean {
  return CODING_TRANSITION_PATTERNS.some((p) => p.test(response))
}

// =============================================================================
// ANSWER GIVEAWAY PATTERNS
// =============================================================================

/**
 * Patterns that indicate interviewer is giving away the answer
 * Used by: response-validation.ts (no-giving-answers gate)
 */
export const GIVEAWAY_PATTERNS = [
  { pattern: /the answer is/i, type: "direct_answer" },
  { pattern: /you should use a hash/i, type: "data_structure" },
  { pattern: /it's basically (?:a )?(fibonacci|dp|bfs|dfs)/i, type: "algorithm" },
  { pattern: /the trick is to/i, type: "trick_reveal" },
  { pattern: /just use (?:a )?(two pointer|sliding window|binary search)/i, type: "technique" },
  { pattern: /the optimal (?:solution|approach|way) (?:is|uses)/i, type: "optimal_reveal" },
  { pattern: /you need to use (?:a )?(map|set|heap|stack|queue)/i, type: "data_structure" },
] as const

// =============================================================================
// LEADING QUESTION PATTERNS
// =============================================================================

/**
 * Patterns that indicate a leading question (hints at the answer)
 * Used by: response-validation.ts (no-leading-questions gate)
 */
export const LEADING_QUESTION_PATTERNS = [
  { pattern: /are you thinking.*(dp|dynamic|hash|map|set|tree)/i, type: "data_structure" },
  { pattern: /would a.*(hash|map|set|array|tree|stack|queue).*help/i, type: "data_structure" },
  { pattern: /have you considered.*(dp|dynamic|hash|sliding|two pointer)/i, type: "algorithm" },
  { pattern: /what about using.*(dp|bfs|dfs|binary search|two pointer)/i, type: "algorithm" },
] as const

// =============================================================================
// ACCEPTANCE PATTERNS (for vague answer validation)
// =============================================================================

/**
 * Patterns indicating interviewer accepted an answer
 */
export const ACCEPTANCE_PATTERNS = [
  /(?:good|great|nice|perfect|sounds good)/i,
  /go ahead/i,
  /code it up/i,
]

/**
 * Patterns indicating interviewer is probing for details
 */
export const PROBING_PATTERNS = [
  /how (?:exactly|specifically|would you)/i,
  /walk me through/i,
  /where (?:exactly|specifically)/i,
  /what (?:will|would) (?:that|you)/i,
  /show me/i,
  /can you (?:explain|elaborate)/i,
]

/**
 * Check if response accepts without probing
 */
export function acceptsWithoutProbing(response: string): boolean {
  const accepted = ACCEPTANCE_PATTERNS.some((p) => p.test(response))
  const probed = PROBING_PATTERNS.some((p) => p.test(response))
  return accepted && !probed
}
