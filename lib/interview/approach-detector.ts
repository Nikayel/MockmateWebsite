/**
 * Approach Detector - Smart complexity detection using pattern matching
 *
 * Instead of fragile regex, this matches user code against known approaches
 * from our verified complexity knowledge base.
 *
 * How LeetCode does it: Runtime analysis (run code with n=10, n=100, n=1000)
 * How we do it: Pattern matching against known approaches per problem
 */

import {
  getComplexityKnowledge,
  getPatternComplexityRules,
} from "@/lib/rag/knowledge-base/complexity-knowledge"
import type { ProblemComplexityKnowledge, ProblemApproach } from "@/lib/rag/knowledge-base/types"
import type { DSAPattern } from "@/lib/types/dsa-patterns"

// =============================================================================
// TYPES
// =============================================================================

export interface ApproachDetectionResult {
  detectedApproach: string | null
  confidence: "high" | "medium" | "low"
  timeComplexity: string
  spaceComplexity: string
  isOptimal: boolean
  isOptimalTime: boolean
  isOptimalSpace: boolean
  matchedPatterns: string[]
  fallbackUsed: boolean
}

interface CodePatterns {
  indicators: RegExp[]
  antiIndicators?: RegExp[]
  requiredCount?: number // How many indicators must match
}

// =============================================================================
// APPROACH PATTERN DEFINITIONS
// =============================================================================

/**
 * Code patterns that indicate specific approaches
 * These work across Python, JavaScript, Java, etc.
 */
const APPROACH_PATTERNS: Record<string, CodePatterns> = {
  // Brute Force patterns
  "Brute Force": {
    indicators: [
      /for\s*[\(\[]?[^)]*[\)\]]?\s*[:{][\s\S]*?for\s*[\(\[]?[^)]*[\)\]]?\s*[:{]/m, // Nested for loops
      /while[\s\S]*?while/m, // Nested while loops
      /for[\s\S]*?while|while[\s\S]*?for/m, // Mixed nesting
      /range\s*\(\s*len\s*\([^)]+\)\s*\)[\s\S]*?range\s*\(\s*len/m, // Python nested range
    ],
    antiIndicators: [
      /\bMap\b|\bSet\b|\bdict\b|\bset\s*\(|\{\s*\}/, // Hash structures suggest optimization
      /\.sort\s*\(|sorted\s*\(/, // Sorting suggests different approach
      /left.*right|lo.*hi|start.*end/i, // Two pointer variables
    ],
  },

  // Hash Map approaches
  "Hash Table": {
    indicators: [
      /new\s+Map\s*\(/, // JS Map
      /\bdict\s*\(|\{\s*\}|defaultdict|Counter/, // Python dict
      /HashMap|TreeMap/, // Java Map types
      /\.get\s*\(|\.set\s*\(/, // Map operations
    ],
    requiredCount: 1,
  },

  // Hash Set approach - commonly used for O(n) lookups
  "Hash Set": {
    indicators: [
      /new\s+Set\s*\(/, // JS Set
      /\bset\s*\(/, // Python set()
      /HashSet/, // Java HashSet
      /\bin\s+\w+_set|\bin\s+num_set|\bin\s+seen/, // "in set_name" pattern
      /\.has\s*\(|\.add\s*\(/, // Set operations
      /not\s+in\s+\w+/, // Python "not in" pattern for set membership
    ],
    antiIndicators: [
      /\.get\s*\(|\.set\s*\(/, // These are Map operations, not Set
    ],
    requiredCount: 1,
  },

  "One-pass Hash Table": {
    indicators: [
      /for[\s\S]*?(?:Map|dict|Set|\{\})[\s\S]*?(?:get|has|in\s|\[)[\s\S]*?(?:set|add|\[.*\]\s*=)/m,
      /for[\s\S]*?(?:\[.*\]\s*=|\.add|\.set)[\s\S]*?(?:get|has|in\s|\[)/m,
    ],
    requiredCount: 1,
  },

  "Two-pass Hash Table": {
    indicators: [
      /for[\s\S]*?(?:Map|dict|\{\})[\s\S]*?for[\s\S]*?(?:get|has|in\s|\[)/m, // Build then query
    ],
    requiredCount: 1,
  },

  // Two Pointer approaches
  "Two Pointers": {
    indicators: [
      /left\s*[,=][\s\S]*?right\s*[,=]/m, // left, right variables
      /lo\s*[,=][\s\S]*?hi\s*[,=]/m, // lo, hi variables
      /start\s*[,=][\s\S]*?end\s*[,=]/m, // start, end variables
      /i\s*[,=]\s*0[\s\S]*?j\s*[,=][\s\S]*?len|length/m, // i=0, j=len pattern
      /while[\s\S]*?(?:left|lo|start|i)\s*<\s*(?:right|hi|end|j)/m, // while left < right
    ],
    requiredCount: 2,
  },

  "Sort + Two Pointers": {
    indicators: [
      /\.sort\s*\(|sorted\s*\(/,
      /left\s*[,=][\s\S]*?right|lo\s*[,=][\s\S]*?hi/m,
      /while[\s\S]*?<[\s\S]*?\+\+[\s\S]*?--|\-=\s*1[\s\S]*?\+=\s*1/m,
    ],
    requiredCount: 2,
  },

  // Binary Search
  "Binary Search": {
    indicators: [
      /while[\s\S]*?(?:left|lo|start)\s*<[=]?\s*(?:right|hi|end)/m,
      /mid\s*=[\s\S]*?(?:\/\/?\s*2|>>\s*1|\+.*\/\s*2)/m, // mid calculation
      /(?:left|lo|start)\s*=\s*mid|(?:right|hi|end)\s*=\s*mid/m, // boundary update
    ],
    requiredCount: 2,
  },

  // Sliding Window
  "Sliding Window": {
    indicators: [
      /(?:left|start|i)\s*[,=][\s\S]*?(?:right|end|j)\s*[,=]/m,
      /while[\s\S]*?\+\+[\s\S]*?(?:sum|count|window)/im,
      /for[\s\S]*?while[\s\S]*?(?:left|start)\s*\+\+/m,
    ],
    requiredCount: 2,
  },

  // Dynamic Programming
  "Dynamic Programming": {
    indicators: [
      /\bdp\s*[\[=]|\bmemo\s*[\[=]|\bcache\b/, // DP array or memo
      /@(?:lru_)?cache|@functools\.cache|@memo/, // Python decorators
      /new\s+Array\s*\([\s\S]*?\)\.fill/m, // JS DP array init
      /\[\s*0\s*\]\s*\*\s*\w+|\[\s*0\s*for\s+/m, // Python DP array init
    ],
    requiredCount: 1,
  },

  // Recursion (might be backtracking, DFS, etc.)
  Recursion: {
    indicators: [
      /def\s+(\w+)\s*\([^)]*\)[\s\S]*?\1\s*\(/m, // Python recursive call
      /function\s+(\w+)\s*\([^)]*\)[\s\S]*?\1\s*\(/m, // JS recursive call
      /(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>)[\s\S]*?\1\s*\(/m, // Arrow fn recursive
    ],
    requiredCount: 1,
  },

  // Heap/Priority Queue
  Heap: {
    indicators: [
      /heapq\.|heappush|heappop/, // Python heapq
      /PriorityQueue|MinHeap|MaxHeap/, // Java/custom
      /new\s+Heap\s*\(/, // Custom heap
    ],
    requiredCount: 1,
  },

  // Stack
  Stack: {
    indicators: [
      /\bstack\s*[\[=]|\[\s*\][\s\S]*?\.append[\s\S]*?\.pop/m, // Stack operations
      /\.push\s*\([\s\S]*?\.pop\s*\(/m, // JS stack
      /deque\s*\(/m, // Python deque as stack
    ],
    requiredCount: 1,
  },

  // Two Stacks - used for Min Stack, Max Stack patterns
  // All operations are O(1) because we maintain a parallel min/max stack
  "Two Stacks": {
    indicators: [
      /minStack|min_stack|minS|mins/i, // Min stack variable
      /regStack|reg_stack|main_stack|dataStack|data_stack|vals/i, // Regular/data stack variable
      /self\.\w+\s*=\s*\[\s*\][\s\S]*?self\.\w+\s*=\s*\[\s*\]/m, // Two stack init in Python
      /this\.\w+\s*=\s*\[\s*\][\s\S]*?this\.\w+\s*=\s*\[\s*\]/m, // Two stack init in JS
      /getMin|get_min|GetMin/i, // Min retrieval method
    ],
    requiredCount: 2, // Need at least 2 indicators for confidence
  },

  // BFS/DFS
  BFS: {
    indicators: [
      /queue\s*[\[=]|deque\s*\(|Queue\s*\(/m,
      /\.popleft\s*\(|\.poll\s*\(/m,
      /while[\s\S]*?queue[\s\S]*?(?:append|add|offer)/m,
    ],
    requiredCount: 2,
  },

  DFS: {
    indicators: [
      /def\s+dfs\s*\(|function\s+dfs\s*\(/m,
      /stack\s*[\[=][\s\S]*?\.pop\s*\(/m,
      /visited\s*[\[=]|seen\s*[\[=]/m,
    ],
    requiredCount: 1,
  },

  // Sorting only (no additional algorithm)
  Sorting: {
    indicators: [/\.sort\s*\(|sorted\s*\(|Arrays\.sort|Collections\.sort/],
    antiIndicators: [
      /left.*right|lo.*hi/i, // Two pointers after sort
      /while[\s\S]*?<[\s\S]*?mid/m, // Binary search after sort
    ],
    requiredCount: 1,
  },
}

// =============================================================================
// MAIN DETECTION FUNCTION
// =============================================================================

/**
 * Detect which approach the user is using
 *
 * Priority:
 * 1. If we have problem-specific knowledge, match against known approaches
 * 2. Otherwise, use generic pattern matching
 */
export function detectApproach(
  code: string,
  problemId?: string,
  pattern?: DSAPattern
): ApproachDetectionResult {
  if (!code || code.trim().length < 10) {
    return createUnknownResult()
  }

  // Normalize code for matching
  const normalizedCode = normalizeCode(code)

  // Try problem-specific detection first
  if (problemId) {
    const knowledge = getComplexityKnowledge(problemId)
    if (knowledge) {
      const result = detectFromKnowledge(normalizedCode, knowledge)
      if (result.confidence !== "low") {
        return result
      }
    }
  }

  // Try pattern-specific rules
  if (pattern) {
    const patternRules = getPatternComplexityRules(pattern)
    if (patternRules) {
      const result = detectFromPatternRules(normalizedCode, pattern, patternRules)
      if (result.confidence !== "low") {
        return result
      }
    }
  }

  // Fallback to generic pattern matching
  return detectGeneric(normalizedCode)
}

// =============================================================================
// DETECTION STRATEGIES
// =============================================================================

/**
 * Detect approach using problem-specific knowledge
 */
function detectFromKnowledge(
  code: string,
  knowledge: ProblemComplexityKnowledge
): ApproachDetectionResult {
  let bestMatch: { approach: ProblemApproach; score: number; patterns: string[] } | null = null

  for (const approach of knowledge.approaches) {
    const { score, matchedPatterns } = scoreApproachMatch(code, approach.name)

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { approach, score, patterns: matchedPatterns }
    }
  }

  if (bestMatch && bestMatch.score >= 2) {
    return {
      detectedApproach: bestMatch.approach.name,
      confidence: bestMatch.score >= 3 ? "high" : "medium",
      timeComplexity: bestMatch.approach.timeComplexity,
      spaceComplexity: bestMatch.approach.spaceComplexity,
      isOptimal: (bestMatch.approach.isOptimalTime && bestMatch.approach.isOptimalSpace) || false,
      isOptimalTime: bestMatch.approach.isOptimalTime || false,
      isOptimalSpace: bestMatch.approach.isOptimalSpace || false,
      matchedPatterns: bestMatch.patterns,
      fallbackUsed: false,
    }
  }

  return createUnknownResult()
}

/**
 * Detect approach using pattern-specific rules
 */
function detectFromPatternRules(
  code: string,
  pattern: DSAPattern,
  rules: ReturnType<typeof getPatternComplexityRules>
): ApproachDetectionResult {
  if (!rules) return createUnknownResult()

  // Check variations
  if (rules.variations) {
    for (const variation of rules.variations) {
      const { score, matchedPatterns } = scoreApproachMatch(code, variation.name)
      if (score >= 2) {
        return {
          detectedApproach: variation.name,
          confidence: score >= 3 ? "high" : "medium",
          timeComplexity: variation.time,
          spaceComplexity: variation.space,
          isOptimal: variation.time === rules.typicalTimeComplexity,
          isOptimalTime: variation.time === rules.typicalTimeComplexity,
          isOptimalSpace: variation.space === rules.typicalSpaceComplexity,
          matchedPatterns,
          fallbackUsed: false,
        }
      }
    }
  }

  return createUnknownResult()
}

/**
 * Generic pattern-based detection (fallback)
 */
function detectGeneric(code: string): ApproachDetectionResult {
  const results: Array<{ name: string; score: number; patterns: string[] }> = []

  // Score each approach
  for (const [approachName, patterns] of Object.entries(APPROACH_PATTERNS)) {
    const { score, matchedPatterns } = matchPatterns(code, patterns)
    if (score > 0) {
      results.push({ name: approachName, score, patterns: matchedPatterns })
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score)

  if (results.length === 0) {
    return createUnknownResult()
  }

  const best = results[0]
  const complexity = estimateComplexityFromApproach(best.name, code)

  return {
    detectedApproach: best.name,
    confidence: best.score >= 3 ? "high" : best.score >= 2 ? "medium" : "low",
    timeComplexity: complexity.time,
    spaceComplexity: complexity.space,
    isOptimal: false, // Can't know without problem-specific data
    isOptimalTime: false,
    isOptimalSpace: false,
    matchedPatterns: best.patterns,
    fallbackUsed: true,
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function normalizeCode(code: string): string {
  // Remove comments
  let normalized = code
    .replace(/\/\/.*$/gm, "") // Single-line JS comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // Multi-line JS comments
    .replace(/#.*$/gm, "") // Python comments
    .replace(/"""[\s\S]*?"""/g, "") // Python docstrings
    .replace(/'''[\s\S]*?'''/g, "")

  // Normalize whitespace but preserve structure
  normalized = normalized.replace(/\r\n/g, "\n")

  return normalized
}

function scoreApproachMatch(
  code: string,
  approachName: string
): { score: number; matchedPatterns: string[] } {
  const patterns = APPROACH_PATTERNS[approachName]
  if (!patterns) {
    return { score: 0, matchedPatterns: [] }
  }

  return matchPatterns(code, patterns)
}

function matchPatterns(
  code: string,
  patterns: CodePatterns
): { score: number; matchedPatterns: string[] } {
  let score = 0
  const matchedPatterns: string[] = []

  // Check indicators
  for (const indicator of patterns.indicators) {
    if (indicator.test(code)) {
      score++
      matchedPatterns.push(indicator.source.slice(0, 30) + "...")
    }
  }

  // Check anti-indicators (reduce score)
  if (patterns.antiIndicators) {
    for (const antiIndicator of patterns.antiIndicators) {
      if (antiIndicator.test(code)) {
        score = Math.max(0, score - 1)
      }
    }
  }

  // Check minimum required count
  if (patterns.requiredCount && score < patterns.requiredCount) {
    return { score: 0, matchedPatterns: [] }
  }

  return { score, matchedPatterns }
}

function estimateComplexityFromApproach(
  approachName: string,
  code: string
): { time: string; space: string } {
  // Complexity estimates based on approach
  const complexityMap: Record<string, { time: string; space: string }> = {
    "Brute Force": { time: "O(n²)", space: "O(1)" },
    "Hash Table": { time: "O(n)", space: "O(n)" },
    "Hash Set": { time: "O(n)", space: "O(n)" },
    "One-pass Hash Table": { time: "O(n)", space: "O(n)" },
    "Two-pass Hash Table": { time: "O(n)", space: "O(n)" },
    "Two Pointers": { time: "O(n)", space: "O(1)" },
    "Sort + Two Pointers": { time: "O(n log n)", space: "O(1)" }, // Sorting dominates
    "Binary Search": { time: "O(log n)", space: "O(1)" },
    "Sliding Window": { time: "O(n)", space: "O(1)" },
    "Dynamic Programming": { time: "O(n)", space: "O(n)" }, // Varies, but common case
    Recursion: { time: "O(2^n)", space: "O(n)" }, // Worst case without memo
    Heap: { time: "O(n log n)", space: "O(n)" },
    Stack: { time: "O(n)", space: "O(n)" },
    "Two Stacks": { time: "O(1)", space: "O(n)" }, // Min/Max Stack - O(1) per operation
    BFS: { time: "O(V+E)", space: "O(V)" },
    DFS: { time: "O(V+E)", space: "O(V)" },
    Sorting: { time: "O(n log n)", space: "O(1)" },
  }

  let result = complexityMap[approachName] || { time: "O(n)", space: "O(1)" }

  // IMPORTANT: Hash-based approaches maintain O(n) even with nested loops
  // because the inner loop is bounded by unique elements (amortized O(1) per element)
  // Example: Longest Consecutive Sequence - while loop inside for loop is still O(n)
  // because each element is visited at most twice total, not n times each
  const hashBasedApproaches = [
    "Hash Table",
    "Hash Set",
    "One-pass Hash Table",
    "Two-pass Hash Table",
  ]

  // Skip nested loop adjustment for hash-based approaches - their complexity
  // comes from amortized O(1) lookups, not naive loop multiplication
  if (hashBasedApproaches.includes(approachName)) {
    return result
  }

  // Check for nested loops to upgrade to O(n²) or O(n³)
  // Only apply to approaches where nested loops actually mean O(n²)
  const hasNestedLoops =
    /for[\s\S]*?for|while[\s\S]*?while|for[\s\S]*?while|while[\s\S]*?for/m.test(code)
  const hasTripleNesting = /for[\s\S]*?for[\s\S]*?for|while[\s\S]*?while[\s\S]*?while/m.test(code)

  // Adjust for nesting - but only for approaches that don't already account for it
  const alreadyQuadratic = ["Brute Force", "Sort + Two Pointers"]

  if (hasTripleNesting && !alreadyQuadratic.includes(approachName)) {
    result = { ...result, time: "O(n³)" }
  } else if (hasNestedLoops && !alreadyQuadratic.includes(approachName)) {
    // Only upgrade to O(n²) for genuinely quadratic patterns
    // Skip for Two Pointers and Sliding Window which use controlled iteration
    const controlledIterationApproaches = ["Two Pointers", "Sliding Window"]
    if (!controlledIterationApproaches.includes(approachName)) {
      result = { ...result, time: "O(n²)" }
    }
  }

  return result
}

function createUnknownResult(): ApproachDetectionResult {
  return {
    detectedApproach: null,
    confidence: "low",
    timeComplexity: "Unknown",
    spaceComplexity: "Unknown",
    isOptimal: false,
    isOptimalTime: false,
    isOptimalSpace: false,
    matchedPatterns: [],
    fallbackUsed: true,
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Quick complexity check - returns just time/space complexity
 * For backward compatibility with existing code
 */
export function detectComplexity(
  code: string,
  problemId?: string,
  pattern?: DSAPattern
): { time: string; space: string; isOptimal: boolean } {
  const result = detectApproach(code, problemId, pattern)
  return {
    time: result.timeComplexity,
    space: result.spaceComplexity,
    isOptimal: result.isOptimal,
  }
}
