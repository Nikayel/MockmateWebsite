/**
 * Keyword Detection for Interview Scoring
 *
 * Detects signals from user messages (voice STT or typed) that indicate
 * they are explaining their approach, discussing complexity, identifying
 * edge cases, etc.
 *
 * Philosophy:
 * - Be GENEROUS with detection (false positives are better than false negatives)
 * - Support natural speech patterns (voice → STT → text)
 * - Use case-insensitive matching
 * - Support variations and synonyms
 */

// =============================================================================
// TYPES
// =============================================================================

export interface DetectionResult {
  approachExplained: boolean
  complexityDiscussed: boolean
  edgeCasesMentioned: string[]
  clarifyingQuestion: boolean
  optimizationMentioned: boolean
  debuggingMentioned: boolean
  tradeoffDiscussed: boolean
}

export interface MessageAnalysis {
  detection: DetectionResult
  confidence: {
    approach: number // 0-1
    complexity: number
    edgeCases: number
  }
  matchedPatterns: string[]
}

// =============================================================================
// PATTERNS - Each pattern is small and testable
// =============================================================================

/**
 * Patterns that indicate user is explaining their approach
 */
export const APPROACH_PATTERNS = [
  // Direct statements
  /\b(my approach|my plan|my strategy|my idea)\b/i,
  /\b(i('ll| will| would| want to| am going to| gonna))\s+(use|try|start|begin|implement|do|solve)/i,
  /\b(let me|let's)\s+(start|begin|try|think|use|implement)/i,

  // Step-by-step indicators
  /\b(first|then|after that|next|finally|lastly)\b.*\b(i('ll| will)?|we('ll)?)\b/i,
  /\bstep\s*\d/i,
  /\b(step one|step two|step three)\b/i,

  // Algorithm/data structure mentions
  /\b(i('ll| will)?|we('ll)?|let's)\s+(use|try|implement)\s+(a\s+)?(hash|map|set|array|stack|queue|tree|graph|heap|linked list|two pointer|sliding window|binary search|dfs|bfs|dp|dynamic programming|recursion|iteration)/i,

  // Thinking out loud
  /\b(so|okay|alright)\s+(i think|i('ll| will)|the idea is|the plan is)/i,
  /\b(the way i('ll| would| will) (do|solve|approach) this)\b/i,
  /\b(here('s| is) (my|the) (approach|plan|idea|strategy))\b/i,

  // Problem breakdown
  /\b(break(ing)? (this |it )?down|split(ting)? (this |it )?into|divide(ing)? (this |it )?into)\b/i,
  /\b(smaller (parts|pieces|steps|problems))\b/i,
]

/**
 * Patterns that indicate user is discussing time/space complexity
 */
export const COMPLEXITY_PATTERNS = [
  // Big O notation (various formats from speech)
  /\bo\s*\(\s*[n1logkm\s\*\^]+\s*\)/i, // O(n), O(log n), O(n^2), etc.
  /\b(o of|o is|order of)\s+(n|one|log|constant|linear|quadratic|exponential)/i,
  /\bbig o\b/i,

  // Complexity terms
  /\b(time|space)\s*(complexity|efficient|efficiency)/i,
  /\b(linear|constant|logarithmic|quadratic|exponential|polynomial)\s*(time|space|complexity)?/i,
  /\b(runtime|run time|running time)\b/i,

  // Specific complexity statements
  /\b(this (is|runs|takes)|it('s| is| runs| takes))\s*(o\s*\(|linear|constant|log)/i,
  /\b(worst|best|average)\s*case\b/i,
  /\b(optimiz(e|ed|ing)|more efficient|better (time|space))\b/i,
]

/**
 * Patterns that indicate user is identifying edge cases
 */
export const EDGE_CASE_PATTERNS = [
  // Direct edge case mentions
  /\b(edge case|corner case|special case|boundary (case|condition))\b/i,
  /\b(edge|corner)\s*(cases?|conditions?|scenarios?)\b/i,

  // Specific edge cases
  /\b(empty|null|nil|none|undefined|zero|negative|single|one element)\s*(string|array|list|input|case)?\b/i,
  /\b(what (if|about|happens))\s+(the |it('s| is) )?(empty|null|zero|negative|single|one|no|nothing)/i,
  /\b(overflow|underflow|out of bounds|index error)\b/i,

  // Boundary thinking
  /\b(what if|what about|what happens|consider(ing)?)\b/i,
  /\b(handle|handling|check(ing)?)\s+(for\s+)?(null|empty|edge|special|invalid|error)/i,
  /\b(minimum|maximum|boundary|boundaries|limit|limits)\b/i,

  // Input validation thinking
  /\b(invalid input|bad input|malformed|unexpected)\b/i,
  /\b(duplicate|duplicates|repeated|same)\b/i,
]

/**
 * Patterns that indicate user is asking clarifying questions
 */
export const CLARIFYING_PATTERNS = [
  // Question forms
  /\b(can i|could i|should i|do i|am i|is it|are we|can we)\s+(assume|expect|use|return|consider)/i,
  /\b(what (is|are)|how (do|does|should)|which|where|when)\b.*\?/i,

  // Clarification requests
  /\b(clarify|clarification|confirm|make sure|understand(ing)?)\b/i,
  /\b(just to (be clear|clarify|confirm|make sure))\b/i,
  /\b(so (you('re| are)|we('re| are)|the input))\b.*\?/i,

  // Assumption checks
  /\b(assuming|assume|assumption)\b/i,
  /\b(is (it|the|this) (always|guaranteed|sorted|positive|valid))\b/i,
  /\b(constraints?|limitation|limit)\b/i,
]

/**
 * Patterns that indicate optimization discussion
 */
export const OPTIMIZATION_PATTERNS = [
  /\b(optimi(z|s)(e|ed|ing|ation))\b/i,
  /\b(more efficient|better (solution|approach|way)|improve|improvement)\b/i,
  /\b(reduce|reducing)\s+(time|space|complexity)\b/i,
  /\b(trade(-|\s)?off|tradeoff)\b/i,
  /\b(brute force|naive|optimal|optimized)\b/i,
  /\b(can we do better|is there a better way|faster|quicker)\b/i,
  /\b(instead of|rather than|alternative)\b/i,
]

/**
 * Patterns that indicate debugging discussion
 */
export const DEBUGGING_PATTERNS = [
  /\b(bug|error|issue|problem|wrong|incorrect|fail(ing|ed)?)\b/i,
  /\b(debug(ging)?|fix(ing|ed)?|troubleshoot(ing)?)\b/i,
  /\b(why (is|does|did)|what('s| is) (wrong|happening|going on))\b/i,
  /\b(let me (check|see|look|trace|print|log))\b/i,
  /\b(off by one|index|bounds|loop|condition)\s*(error|issue|problem|bug)?\b/i,
]

/**
 * Patterns that indicate tradeoff discussion
 */
export const TRADEOFF_PATTERNS = [
  /\b(trade(-|\s)?off|tradeoff)\b/i,
  /\b(pros? and cons?|advantages? and disadvantages?)\b/i,
  /\b(vs\.?|versus|compared to|comparison)\b/i,
  /\b(on one hand|on the other hand)\b/i,
  /\b(benefit|downside|drawback|limitation)\b/i,
  /\b((more|less) (memory|space|time) but)\b/i,
]

// =============================================================================
// DETECTION FUNCTIONS - Small, single-purpose
// =============================================================================

/**
 * Check if message matches any pattern in a list
 */
export function matchesAnyPattern(message: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(message))
}

/**
 * Get all matching patterns for debugging/analytics
 */
export function getMatchedPatterns(message: string, patterns: RegExp[]): string[] {
  return patterns.filter((pattern) => pattern.test(message)).map((pattern) => pattern.source)
}

/**
 * Extract edge cases mentioned in the message
 */
export function extractEdgeCases(message: string): string[] {
  const edgeCases: string[] = []
  const lowerMessage = message.toLowerCase()

  // Common edge case terms
  const edgeCaseTerms = [
    "empty",
    "null",
    "zero",
    "negative",
    "single element",
    "one element",
    "duplicate",
    "overflow",
    "underflow",
    "out of bounds",
    "invalid",
    "maximum",
    "minimum",
  ]

  for (const term of edgeCaseTerms) {
    if (lowerMessage.includes(term)) {
      edgeCases.push(term)
    }
  }

  return [...new Set(edgeCases)] // dedupe
}

/**
 * Calculate confidence score based on pattern matches
 */
export function calculateConfidence(message: string, patterns: RegExp[]): number {
  const matches = patterns.filter((pattern) => pattern.test(message)).length
  const maxMatches = Math.min(patterns.length, 3) // Cap at 3 for normalization
  return Math.min(1, matches / maxMatches)
}

// =============================================================================
// MAIN ANALYSIS FUNCTION
// =============================================================================

/**
 * Analyze a single message for all signals
 */
export function analyzeMessage(message: string): MessageAnalysis {
  const detection: DetectionResult = {
    approachExplained: matchesAnyPattern(message, APPROACH_PATTERNS),
    complexityDiscussed: matchesAnyPattern(message, COMPLEXITY_PATTERNS),
    edgeCasesMentioned: extractEdgeCases(message),
    clarifyingQuestion: matchesAnyPattern(message, CLARIFYING_PATTERNS),
    optimizationMentioned: matchesAnyPattern(message, OPTIMIZATION_PATTERNS),
    debuggingMentioned: matchesAnyPattern(message, DEBUGGING_PATTERNS),
    tradeoffDiscussed: matchesAnyPattern(message, TRADEOFF_PATTERNS),
  }

  // Also check edge case patterns (not just terms)
  if (!detection.edgeCasesMentioned.length && matchesAnyPattern(message, EDGE_CASE_PATTERNS)) {
    detection.edgeCasesMentioned = ["edge case mentioned"]
  }

  const confidence = {
    approach: calculateConfidence(message, APPROACH_PATTERNS),
    complexity: calculateConfidence(message, COMPLEXITY_PATTERNS),
    edgeCases: calculateConfidence(message, EDGE_CASE_PATTERNS),
  }

  const matchedPatterns = [
    ...getMatchedPatterns(message, APPROACH_PATTERNS),
    ...getMatchedPatterns(message, COMPLEXITY_PATTERNS),
    ...getMatchedPatterns(message, EDGE_CASE_PATTERNS),
  ]

  return { detection, confidence, matchedPatterns }
}

/**
 * Analyze multiple messages and aggregate results
 */
export function analyzeConversation(messages: string[]): DetectionResult {
  const results = messages.map(analyzeMessage)

  // Aggregate: true if ANY message triggered the signal
  return {
    approachExplained: results.some((r) => r.detection.approachExplained),
    complexityDiscussed: results.some((r) => r.detection.complexityDiscussed),
    edgeCasesMentioned: [...new Set(results.flatMap((r) => r.detection.edgeCasesMentioned))],
    clarifyingQuestion: results.some((r) => r.detection.clarifyingQuestion),
    optimizationMentioned: results.some((r) => r.detection.optimizationMentioned),
    debuggingMentioned: results.some((r) => r.detection.debuggingMentioned),
    tradeoffDiscussed: results.some((r) => r.detection.tradeoffDiscussed),
  }
}
