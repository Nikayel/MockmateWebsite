/**
 * Deterministic response guardrail patterns.
 *
 * These patterns validate interviewer output after generation. They are fast,
 * predictable checks for known failure modes; semantic validation handles the
 * fuzzier intent checks.
 */

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

// =============================================================================
// SUMMARIZING PATTERNS
// =============================================================================

/**
 * Patterns indicating AI is parroting/restating instead of advancing
 * Used by: response-validation.ts (no-summarizing gate)
 */
export const SUMMARIZING_PATTERNS = [
  /so (?:you're|you are) saying/i,
  /in other words/i,
  /to summarize/i,
  /(?:so |)basically,? what you(?:'re| are)? (?:saying|proposing|suggesting)/i,
  /if i understand (?:correctly|you)/i,
  /let me (?:make sure i understand|recap|summarize)/i,
  /so what you(?:'re| are) (?:proposing|suggesting|saying)/i,
  /you(?:'re| are) essentially saying/i,
]

/**
 * Check if response contains summarizing language
 */
export function containsSummarizing(response: string): RegExpMatchArray | null {
  for (const p of SUMMARIZING_PATTERNS) {
    const match = response.match(p)
    if (match) return match
  }
  return null
}

/**
 * Count real sentences (>15 chars) in text
 */
export function countSentences(text: string): number {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 15).length
}
