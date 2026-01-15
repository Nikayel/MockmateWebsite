/**
 * Misconception Detection Engine
 *
 * Analyzes user code submissions to detect common misconceptions and error patterns.
 * Tracks misconceptions over time and provides targeted remediation suggestions.
 *
 * Features:
 * - Pattern-based error detection (regex)
 * - RAG-enhanced debugging hints (retrieves similar errors from knowledge base)
 * - Frequency tracking and trend analysis
 * - Personalized remediation suggestions
 * - Integration with RAG for context-aware feedback
 */

import type { DSAPattern } from "@/lib/types/dsa-patterns"
import { adminDb } from "@/lib/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"
import type { DetectedMisconception, MisconceptionType } from "./enhanced-user-profile"
import { getAdvancedRetriever } from "./retrieval/advanced-retrieval"
import { generateTextEmbedding } from "./index"

// ============================================================================
// TYPES
// ============================================================================

/**
 * Code analysis result
 */
export interface CodeAnalysisResult {
  misconceptions: DetectedMisconception[]
  codeQualityIssues: CodeQualityIssue[]
  patternMisuse: PatternMisuse[]
  overallConfidence: number
}

export interface CodeQualityIssue {
  type: "naming" | "complexity" | "duplication" | "structure" | "efficiency"
  severity: "low" | "medium" | "high"
  description: string
  lineNumber?: number
  suggestion: string
}

export interface PatternMisuse {
  expectedPattern: DSAPattern
  actualApproach: string
  impact: "correctness" | "efficiency" | "readability"
  explanation: string
}

/**
 * RAG-enhanced debugging hint from similar errors
 */
export interface RAGDebuggingHint {
  source: "rag" | "knowledge-base" | "community"
  relevance: number // 0-1 similarity score
  hint: string
  context: string
  relatedPattern?: DSAPattern
  successfulFix?: string
}

/**
 * Enhanced code analysis result with RAG insights
 */
export interface EnhancedCodeAnalysisResult extends CodeAnalysisResult {
  ragHints: RAGDebuggingHint[]
  similarErrorsFound: number
  communityInsights: string[]
}

/**
 * Error signature for pattern matching
 */
interface ErrorSignature {
  type: MisconceptionType
  patterns: RegExp[]
  testFailurePatterns?: RegExp[]
  description: string
  suggestedFix: string
  relatedConcepts: string[]
}

// ============================================================================
// ERROR SIGNATURES DATABASE
// ============================================================================

const ERROR_SIGNATURES: Record<DSAPattern | "general", ErrorSignature[]> = {
  general: [
    {
      type: "off-by-one",
      patterns: [
        /for\s*\([^;]*;\s*\w+\s*<=\s*\w+\.length\s*;/, // i <= arr.length
        /for\s*\([^;]*;\s*\w+\s*<\s*\w+\.length\s*-\s*1\s*;/, // Missing last element
        /\[\s*\w+\s*\+\s*1\s*\]/, // Potential off-by-one in index
        /slice\s*\(\s*0\s*,\s*\w+\s*-\s*1\s*\)/, // slice(0, n-1) missing last
      ],
      testFailurePatterns: [
        /index.*out.*of.*bounds/i,
        /undefined.*at.*index/i,
        /expected.*\d+.*got.*\d+/i, // Off by one in result
      ],
      description: "Off-by-one error in loop bounds or array indexing",
      suggestedFix: "Check your loop conditions: use < for 0-indexed, verify slice boundaries",
      relatedConcepts: ["loop-invariants", "array-indexing"],
    },
    {
      type: "missing-edge-case",
      patterns: [
        /^(?!.*if\s*\(\s*\w+\s*===?\s*(null|undefined|0|''|""|false)\s*\))/,
        /^(?!.*if\s*\(\s*!\w+\s*\))/,
        /^(?!.*\?\?)/, // No nullish coalescing
      ],
      testFailurePatterns: [/null|undefined/i, /empty.*input/i, /edge.*case/i],
      description: "Missing null/empty check for edge cases",
      suggestedFix: 'Add checks for: null, undefined, empty array [], empty string ""',
      relatedConcepts: ["defensive-programming", "edge-cases"],
    },
    {
      type: "initialization-error",
      patterns: [
        /let\s+(\w+)\s*;[^=]*\n.*\1/, // Uninitialized variable used
        /const\s+\w+\s*=\s*\[\s*\]\s*;[\s\S]*push/, // Empty array that might need initial value
      ],
      testFailurePatterns: [/undefined/i, /NaN/i],
      description: "Variable not properly initialized before use",
      suggestedFix: 'Initialize variables with appropriate default values (0, [], {}, "")',
      relatedConcepts: ["variable-initialization", "default-values"],
    },
    {
      type: "termination-condition",
      patterns: [/while\s*\(\s*true\s*\)/, /while\s*\(\s*1\s*\)/, /for\s*\(\s*;\s*;\s*\)/],
      testFailurePatterns: [/timeout/i, /infinite.*loop/i, /maximum.*call.*stack/i],
      description: "Loop may not terminate properly",
      suggestedFix: "Ensure loop has a clear termination condition that will eventually be met",
      relatedConcepts: ["loop-invariants", "termination-proofs"],
    },
  ],

  "arrays-hashing": [
    {
      type: "wrong-data-structure",
      patterns: [
        /for\s*\([^)]*\)\s*{\s*for\s*\([^)]*\)/, // Nested loops for lookup
        /\.indexOf\s*\(/, // Using indexOf instead of Set/Map
        /\.includes\s*\(\s*\w+\s*\)/, // includes in a loop
      ],
      description: "Using O(n) lookup when O(1) hash-based lookup is possible",
      suggestedFix: "Use a Map or Set for O(1) lookups instead of nested loops or indexOf",
      relatedConcepts: ["hash-maps", "time-complexity", "space-time-tradeoff"],
    },
    {
      type: "incorrect-complexity",
      patterns: [
        /\.sort\s*\(\s*\).*\.sort\s*\(\s*\)/, // Double sort
        /for.*for.*for/, // Triple nested loops
      ],
      description: "Solution has higher time complexity than necessary",
      suggestedFix: "Consider if a single pass with a hash map could solve this in O(n)",
      relatedConcepts: ["time-complexity", "optimization"],
    },
  ],

  "two-pointers": [
    {
      type: "boundary-confusion",
      patterns: [
        /while\s*\(\s*left\s*<\s*right\s*\)[\s\S]*left\s*=\s*right/, // Pointer crossing
        /while\s*\(\s*left\s*<=?\s*right\s*\)(?![\s\S]*break)/, // No break condition
      ],
      testFailurePatterns: [/infinite/i, /timeout/i],
      description: "Two pointer boundaries not correctly managed",
      suggestedFix: "Ensure pointers move toward each other and check the termination condition",
      relatedConcepts: ["two-pointers", "loop-invariants"],
    },
    {
      type: "logic-error",
      patterns: [
        /left\s*\+\+.*right\s*\+\+/, // Both pointers moving same direction
        /left\s*--.*right\s*--/,
      ],
      description: "Both pointers moving in the same direction",
      suggestedFix: "In two-pointer technique, pointers typically move toward each other",
      relatedConcepts: ["two-pointers", "opposite-direction"],
    },
  ],

  "binary-search": [
    {
      type: "boundary-confusion",
      patterns: [
        /mid\s*=\s*\(\s*left\s*\+\s*right\s*\)\s*\/\s*2/, // Integer overflow risk
        /left\s*=\s*mid\s*[^+-]/, // left = mid without +1
        /right\s*=\s*mid\s*[^+-]/, // right = mid without -1
      ],
      description: "Binary search boundary update is incorrect",
      suggestedFix:
        "Use mid = left + (right - left) / 2, and update with left = mid + 1 or right = mid - 1",
      relatedConcepts: ["binary-search", "search-space"],
    },
    {
      type: "termination-condition",
      patterns: [
        /while\s*\(\s*left\s*<\s*right\s*\)/, // May skip the answer
        /while\s*\(\s*left\s*!=\s*right\s*\)/,
      ],
      testFailurePatterns: [/not.*found/i, /expected.*got.*-1/i],
      description: "Binary search termination condition may skip the answer",
      suggestedFix: "Consider if you need left < right or left <= right based on your update logic",
      relatedConcepts: ["binary-search", "loop-invariants"],
    },
  ],

  "dp-1d": [
    {
      type: "wrong-algorithm",
      patterns: [
        /function\s+(\w+)\s*\([^)]*\)\s*{[\s\S]*\1\s*\(/, // Recursion without memoization
      ],
      testFailurePatterns: [/timeout/i, /stack.*overflow/i],
      description: "Using plain recursion without memoization for DP problem",
      suggestedFix: "Add memoization with a Map or array, or convert to iterative DP",
      relatedConcepts: ["memoization", "dynamic-programming", "overlapping-subproblems"],
    },
    {
      type: "initialization-error",
      patterns: [
        /dp\s*=\s*new\s*Array\s*\([^)]+\)(?!\s*\.fill)/, // Array without fill
        /dp\s*=\s*\[\s*\]/, // Empty DP array
      ],
      description: "DP array not properly initialized",
      suggestedFix: "Initialize DP array with base cases: dp[0] = baseValue",
      relatedConcepts: ["base-cases", "dp-initialization"],
    },
  ],

  "dp-2d": [
    {
      type: "initialization-error",
      patterns: [
        /dp\s*=\s*new\s*Array\s*\([^)]+\)\.map\s*\(\s*\(\s*\)\s*=>\s*\[\s*\]\s*\)/, // 2D array without values
      ],
      description: "2D DP array not properly initialized with base cases",
      suggestedFix: "Initialize first row and column with appropriate base cases",
      relatedConcepts: ["2d-dp", "base-cases"],
    },
    {
      type: "logic-error",
      patterns: [
        /dp\s*\[\s*i\s*\]\s*\[\s*j\s*\]\s*=\s*dp\s*\[\s*i\s*-\s*1\s*\]\s*\[\s*j\s*-\s*1\s*\]/, // Only diagonal
      ],
      description: "Missing state transitions in 2D DP",
      suggestedFix: "Consider all possible previous states: dp[i-1][j], dp[i][j-1], dp[i-1][j-1]",
      relatedConcepts: ["state-transitions", "2d-dp"],
    },
  ],

  trees: [
    {
      type: "missing-edge-case",
      patterns: [
        /function\s+\w+\s*\(\s*\w+\s*\)\s*{(?![\s\S]*if\s*\(\s*!\w+|null|undefined)/, // No null check
      ],
      testFailurePatterns: [/null/i, /undefined.*left|right/i],
      description: "Missing null check for tree node",
      suggestedFix: "Always check if node is null before accessing .left or .right",
      relatedConcepts: ["tree-traversal", "null-checks"],
    },
    {
      type: "wrong-algorithm",
      patterns: [
        /\.push\s*\(\s*node\s*\)[\s\S]*\.push\s*\(\s*node\.left\s*\)[\s\S]*\.push\s*\(\s*node\.right\s*\)/,
      ],
      description: "Incorrect BFS/DFS implementation",
      suggestedFix: "For BFS use queue (FIFO), for DFS use stack (LIFO) or recursion",
      relatedConcepts: ["bfs", "dfs", "tree-traversal"],
    },
  ],

  graphs: [
    {
      type: "missing-edge-case",
      patterns: [
        /function\s+\w+\s*\([^)]*\)\s*{(?![\s\S]*visited|seen)/, // No visited check
      ],
      testFailurePatterns: [/infinite/i, /cycle/i, /stack.*overflow/i],
      description: "Missing visited set for graph traversal",
      suggestedFix: "Use a Set to track visited nodes and prevent infinite loops in cycles",
      relatedConcepts: ["graph-traversal", "cycle-detection"],
    },
  ],

  "linked-list": [
    {
      type: "logic-error",
      patterns: [
        /\.next\s*=\s*\w+\s*;[\s\S]*\.next\s*=/, // Multiple .next assignments
        /\w+\s*=\s*\w+\.next\s*;[\s\S]*\w+\.next\s*=/, // Lost reference
      ],
      description: "Linked list pointer manipulation error",
      suggestedFix: "Save references before modifying .next pointers to avoid losing nodes",
      relatedConcepts: ["pointer-manipulation", "linked-list"],
    },
    {
      type: "missing-edge-case",
      patterns: [/function\s+\w+\s*\(\s*head\s*\)\s*{(?![\s\S]*if\s*\(\s*!head)/],
      description: "Missing null check for head node",
      suggestedFix: "Check if head is null before processing",
      relatedConcepts: ["linked-list", "edge-cases"],
    },
  ],

  stack: [
    {
      type: "logic-error",
      patterns: [
        /\.pop\s*\(\s*\)(?![^;]*=)/, // pop() without using result
        /\.push\s*\([^)]*\)[\s\S]*\.push\s*\([^)]*\)/, // Multiple pushes in condition
      ],
      description: "Stack operation result not properly handled",
      suggestedFix: "Store pop() result if needed, or check stack is not empty before popping",
      relatedConcepts: ["stack", "lifo"],
    },
    {
      type: "missing-edge-case",
      patterns: [
        /\.pop\s*\(\s*\)(?!.*length\s*>\s*0|\.length)/, // pop without length check
      ],
      description: "Popping from potentially empty stack",
      suggestedFix: "Check stack.length > 0 before calling pop()",
      relatedConcepts: ["stack", "empty-check"],
    },
  ],

  "sliding-window": [
    {
      type: "boundary-confusion",
      patterns: [
        /right\s*-\s*left\s*>\s*k/, // Off-by-one in window size
        /right\s*-\s*left\s*<\s*k/,
      ],
      description: "Window size calculation may be off by one",
      suggestedFix:
        "Window size is right - left + 1 for inclusive bounds, or right - left for exclusive",
      relatedConcepts: ["sliding-window", "window-size"],
    },
  ],

  backtracking: [
    {
      type: "logic-error",
      patterns: [
        /\.push\s*\([^)]+\)(?![\s\S]*\.pop\s*\(\s*\))/, // push without pop (no backtrack)
      ],
      description: "Missing backtrack step after recursive call",
      suggestedFix:
        "After the recursive call returns, undo the choice (pop from path, unmark visited)",
      relatedConcepts: ["backtracking", "state-restoration"],
    },
  ],

  heap: [
    {
      type: "wrong-data-structure",
      patterns: [
        /\.sort\s*\([^)]*\).*\.slice\s*\(\s*0\s*,\s*k\s*\)/, // Sort + slice instead of heap
      ],
      description: "Using sort when a heap would be more efficient",
      suggestedFix: "For top-k problems, use a heap of size k for O(n log k) instead of O(n log n)",
      relatedConcepts: ["heap", "priority-queue", "top-k"],
    },
  ],

  greedy: [
    {
      type: "wrong-algorithm",
      patterns: [
        /for.*for.*for/, // Trying all combinations for greedy problem
      ],
      description: "Using brute force for a greedy problem",
      suggestedFix: "Greedy problems have optimal substructure - make locally optimal choices",
      relatedConcepts: ["greedy", "optimal-substructure"],
    },
  ],

  intervals: [
    {
      type: "logic-error",
      patterns: [
        /\.sort\s*\(\s*\(\s*a\s*,\s*b\s*\)\s*=>\s*a\s*-\s*b\s*\)/, // Sorting 1D instead of by start
      ],
      description: "Incorrect interval sorting",
      suggestedFix: "Sort intervals by start time: intervals.sort((a, b) => a[0] - b[0])",
      relatedConcepts: ["intervals", "sorting"],
    },
  ],

  "bit-manipulation": [
    {
      type: "syntax-confusion",
      patterns: [
        /\|\|/, // Using || instead of |
        /&&/, // Using && instead of &
      ],
      description: "Using logical operators instead of bitwise",
      suggestedFix: "Use & (bitwise AND), | (bitwise OR), ^ (XOR), ~ (NOT)",
      relatedConcepts: ["bitwise-operators"],
    },
  ],

  trie: [],
  "union-find": [],
  "binary-tree": [],
  "binary-search-tree": [],
  "priority-queue": [],
  "heap-priority-queue": [],
  bfs: [],
  dfs: [],
  "topological-sort": [],
  dijkstra: [],
  "dp-knapsack": [],
  "dp-lcs": [],
  "dp-tree": [],
  math: [],
  geometry: [],
  "math-geometry": [],
  sorting: [],
  "merge-sort": [],
  "quick-sort": [],
  string: [],
  "string-matching": [],
  matrix: [],
  "monotonic-stack": [],
  "monotonic-queue": [],
}

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyze code for misconceptions
 */
export function analyzeCode(
  code: string,
  pattern: DSAPattern,
  testResults?: { passed: number; total: number; failingTests?: string[] }
): CodeAnalysisResult {
  const misconceptions: DetectedMisconception[] = []
  const codeQualityIssues: CodeQualityIssue[] = []
  const patternMisuse: PatternMisuse[] = []

  // Get signatures for this pattern and general signatures
  const patternSignatures = ERROR_SIGNATURES[pattern] || []
  const generalSignatures = ERROR_SIGNATURES["general"]
  const allSignatures = [...generalSignatures, ...patternSignatures]

  // Check each signature
  for (const signature of allSignatures) {
    let matched = false

    // Check code patterns
    for (const regex of signature.patterns) {
      if (regex.test(code)) {
        matched = true
        break
      }
    }

    // Check test failure patterns if available
    if (!matched && signature.testFailurePatterns && testResults?.failingTests) {
      const failureText = testResults.failingTests.join(" ")
      for (const regex of signature.testFailurePatterns) {
        if (regex.test(failureText)) {
          matched = true
          break
        }
      }
    }

    if (matched) {
      misconceptions.push({
        id: `misconception-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        pattern,
        concept: signature.relatedConcepts[0] || pattern,
        misconceptionType: signature.type,
        description: signature.description,
        frequency: 1,
        lastSeen: new Date(),
        status: "active",
        suggestedFix: signature.suggestedFix,
      })
    }
  }

  // Check for code quality issues
  codeQualityIssues.push(...analyzeCodeQuality(code))

  // Check for pattern misuse
  patternMisuse.push(...detectPatternMisuse(code, pattern))

  return {
    misconceptions,
    codeQualityIssues,
    patternMisuse,
    overallConfidence: calculateConfidence(misconceptions, testResults),
  }
}

/**
 * Analyze code quality
 */
function analyzeCodeQuality(code: string): CodeQualityIssue[] {
  const issues: CodeQualityIssue[] = []

  // Check for single-letter variable names (except i, j, k, n, m)
  const badVarNames = code.match(/\b(let|const|var)\s+[a-hlo-z]\s*=/g)
  if (badVarNames && badVarNames.length > 2) {
    issues.push({
      type: "naming",
      severity: "medium",
      description: "Too many single-letter variable names reduce readability",
      suggestion: 'Use descriptive names like "left", "right", "count", "result"',
    })
  }

  // Check for very long functions
  const lines = code.split("\n").length
  if (lines > 50) {
    issues.push({
      type: "complexity",
      severity: "medium",
      description: "Function is quite long. Consider breaking it into smaller helper functions",
      suggestion: "Extract logical blocks into separate functions for clarity",
    })
  }

  // Check for deeply nested code
  const maxIndent = Math.max(
    ...code.split("\n").map((line) => {
      const match = line.match(/^(\s*)/)
      return match ? match[1].length : 0
    })
  )
  if (maxIndent > 16) {
    // More than 4 levels of nesting
    issues.push({
      type: "structure",
      severity: "high",
      description: "Code is deeply nested, which reduces readability",
      suggestion: "Use early returns, extract conditions, or refactor logic",
    })
  }

  // Check for magic numbers
  const magicNumbers = code.match(/[^\d](\d{2,})[^\d]/g)
  if (magicNumbers && magicNumbers.length > 3) {
    issues.push({
      type: "naming",
      severity: "low",
      description: "Multiple magic numbers in code",
      suggestion: "Extract magic numbers into named constants for clarity",
    })
  }

  return issues
}

/**
 * Detect pattern misuse
 */
function detectPatternMisuse(code: string, expectedPattern: DSAPattern): PatternMisuse[] {
  const misuse: PatternMisuse[] = []

  // Detect brute force when better approach exists
  const hasNestedLoops = /for\s*\([^)]*\)\s*{[^}]*for\s*\([^)]*\)/.test(code)
  const hasHashMap = /new\s+Map|new\s+Set|{}\s*;/.test(code)

  if (expectedPattern === "arrays-hashing" && hasNestedLoops && !hasHashMap) {
    misuse.push({
      expectedPattern,
      actualApproach: "nested-loops",
      impact: "efficiency",
      explanation: "Using O(n²) nested loops instead of O(n) hash map approach",
    })
  }

  // Detect recursion without memoization for DP
  if (expectedPattern.startsWith("dp-")) {
    const hasRecursion = /function\s+(\w+)[\s\S]*\1\s*\(/.test(code)
    const hasMemo = /memo|cache|dp\[/.test(code)

    if (hasRecursion && !hasMemo) {
      misuse.push({
        expectedPattern,
        actualApproach: "plain-recursion",
        impact: "efficiency",
        explanation:
          "Using plain recursion without memoization leads to exponential time complexity",
      })
    }
  }

  // Detect sort + search instead of binary search
  if (expectedPattern === "binary-search") {
    const hasSortFilter = /\.sort\s*\([^)]*\)\.filter|\.find/.test(code)
    if (hasSortFilter) {
      misuse.push({
        expectedPattern,
        actualApproach: "linear-search-after-sort",
        impact: "efficiency",
        explanation: "Using linear search after sorting instead of binary search",
      })
    }
  }

  return misuse
}

/**
 * Calculate confidence in the analysis
 */
function calculateConfidence(
  misconceptions: DetectedMisconception[],
  testResults?: { passed: number; total: number }
): number {
  let confidence = 50

  // More test failures = higher confidence in detected misconceptions
  if (testResults) {
    const failRate = 1 - testResults.passed / testResults.total
    if (failRate > 0.5) confidence += 30
    else if (failRate > 0.2) confidence += 15
  }

  // More misconceptions detected = higher confidence
  if (misconceptions.length > 0) confidence += 10
  if (misconceptions.length > 2) confidence += 10

  return Math.min(100, confidence)
}

// ============================================================================
// RAG-ENHANCED ANALYSIS
// ============================================================================

// Cache for RAG hints to reduce API calls (30 second TTL)
const ragHintCache = new Map<string, { hints: RAGDebuggingHint[]; timestamp: number }>()
const RAG_HINT_CACHE_TTL = 30 * 1000 // 30 seconds

/**
 * Get cache key for RAG hint lookup
 */
function getRAGCacheKey(errorType: string, pattern: DSAPattern, codeSnippet: string): string {
  // Use first 100 chars of code to create a reasonable cache key
  const codeHash = codeSnippet.substring(0, 100).replace(/\s+/g, "")
  return `${errorType}:${pattern}:${codeHash}`
}

/**
 * Retrieve similar errors and debugging hints from RAG
 * This provides context-aware help based on what other users encountered
 */
async function retrieveRAGDebuggingHints(
  misconceptions: DetectedMisconception[],
  pattern: DSAPattern,
  code: string,
  testFailures?: string[]
): Promise<RAGDebuggingHint[]> {
  if (misconceptions.length === 0) return []

  const hints: RAGDebuggingHint[] = []
  const retriever = getAdvancedRetriever()

  try {
    for (const misconception of misconceptions.slice(0, 2)) {
      // Limit to 2 to control costs
      // Check cache first
      const cacheKey = getRAGCacheKey(misconception.misconceptionType, pattern, code)
      const cached = ragHintCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < RAG_HINT_CACHE_TTL) {
        hints.push(...cached.hints)
        continue
      }

      // Build a rich query for similar errors
      const errorContext = [
        `Error type: ${misconception.misconceptionType}`,
        `Pattern: ${pattern}`,
        `Description: ${misconception.description}`,
        testFailures ? `Test failures: ${testFailures.slice(0, 3).join(", ")}` : "",
        `Code snippet: ${code.substring(0, 300)}`,
      ]
        .filter(Boolean)
        .join("\n")

      // Retrieve similar debugging hints from knowledge base
      const { results } = await retriever.retrieve({
        query: `debugging ${misconception.misconceptionType} error ${pattern} common fix solution`,
        limit: 3,
        types: ["knowledge", "hint"],
        minSimilarity: 0.3,
      })

      const retrievedHints: RAGDebuggingHint[] = results.map((doc) => ({
        source: "knowledge-base" as const,
        relevance: doc.finalScore,
        hint: extractHintFromDocument(doc.text, misconception.misconceptionType),
        context: doc.text.substring(0, 200),
        relatedPattern: (doc.metadata?.pattern as DSAPattern) || pattern,
        successfulFix: extractSuccessfulFix(doc.text),
      }))

      // Cache the results
      ragHintCache.set(cacheKey, { hints: retrievedHints, timestamp: Date.now() })
      hints.push(...retrievedHints)
    }
  } catch (error) {
    console.warn("[MisconceptionDetection] RAG retrieval failed, using regex-only:", error)
  }

  // Deduplicate and sort by relevance
  const uniqueHints = hints.reduce((acc, hint) => {
    const exists = acc.find((h) => h.hint === hint.hint)
    if (!exists) acc.push(hint)
    return acc
  }, [] as RAGDebuggingHint[])

  return uniqueHints.sort((a, b) => b.relevance - a.relevance).slice(0, 5)
}

/**
 * Extract actionable hint from RAG document
 */
function extractHintFromDocument(text: string, errorType: string): string {
  // Try to find specific fix suggestions in the text
  const fixPatterns = [
    /(?:fix|solution|solve|resolve)[:.\s]+([^.]+\.)/i,
    /(?:try|consider|use)[:.\s]+([^.]+\.)/i,
    /(?:instead|should)[:.\s]+([^.]+\.)/i,
  ]

  for (const pattern of fixPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  // Fallback: return first meaningful sentence
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20)
  return sentences[0]?.trim() || `Review your ${errorType} implementation`
}

/**
 * Extract successful fix example from RAG document
 */
function extractSuccessfulFix(text: string): string | undefined {
  // Look for code examples or explicit fixes
  const codeMatch = text.match(/```[\s\S]*?```/)
  if (codeMatch) {
    return codeMatch[0].replace(/```/g, "").trim().substring(0, 200)
  }

  const fixMatch = text.match(
    /(?:correct|fixed|working)[\s\S]{0,100}?(?:code|solution|example)[:.\s]+([^.]+)/i
  )
  if (fixMatch) {
    return fixMatch[1].trim()
  }

  return undefined
}

/**
 * Generate community insights based on aggregated misconception data
 */
async function generateCommunityInsights(
  pattern: DSAPattern,
  misconceptionTypes: MisconceptionType[]
): Promise<string[]> {
  const insights: string[] = []

  // Predefined community insights based on common patterns
  const communityWisdom: Record<string, string[]> = {
    "off-by-one": [
      "Pro tip: Draw array indices on paper before coding loops",
      "80% of off-by-one errors occur at array boundaries - always test with length 0, 1, and 2",
      "Use inclusive vs exclusive bounds consistently - pick a convention and stick to it",
    ],
    "missing-edge-case": [
      'Interview tip: Always ask "what if the input is empty?" before coding',
      "Common pattern: Handle null/empty at the TOP of your function",
      "Edge cases to always consider: empty, single element, all same values, sorted, reverse sorted",
    ],
    "wrong-data-structure": [
      "Rule of thumb: If you need O(1) lookup, think HashMap/Set",
      "Nested loops often signal a missed optimization opportunity",
      'Ask yourself: "Am I searching for something I could pre-compute?"',
    ],
    "initialization-error": [
      "DP tip: Always initialize base cases before the main loop",
      "Common mistake: Forgetting to handle dp[0] separately",
      "Pro tip: Write out the recurrence relation before coding",
    ],
    "boundary-confusion": [
      "Two-pointer tip: Draw the pointers moving on paper first",
      "Binary search: Always verify left=mid+1 and right=mid-1 logic",
      "When stuck on boundaries, trace through a 3-element example by hand",
    ],
    "termination-condition": [
      'Before coding any loop, write down: "This loop ends when..."',
      "Infinite loop? Check if your condition can actually become false",
      "For binary search: ensure left and right converge (no equality without break)",
    ],
  }

  for (const type of misconceptionTypes) {
    const typeInsights = communityWisdom[type]
    if (typeInsights) {
      insights.push(typeInsights[Math.floor(Math.random() * typeInsights.length)])
    }
  }

  // Add pattern-specific insight
  const patternInsights: Record<string, string> = {
    "arrays-hashing": "Arrays+Hashing problems almost always have an O(n) solution using a Map",
    "two-pointers": "Two pointers work best on sorted arrays or when finding pairs",
    "binary-search": "If the answer space is monotonic, binary search probably applies",
    "sliding-window": 'Sliding window = "find subarray/substring with property X"',
    "dp-1d": 'For 1D DP, ask: "Can I express state[i] using previous states?"',
    "dp-2d": "For 2D DP, think about what each dimension represents",
    trees: 'Most tree problems are solved with recursion - think "what do I need from children?"',
    graphs: 'Graph problem? Start with: "Is this BFS (shortest path) or DFS (explore all)?"',
  }

  if (patternInsights[pattern]) {
    insights.unshift(patternInsights[pattern])
  }

  return insights.slice(0, 3)
}

/**
 * RAG-Enhanced code analysis
 * Combines regex-based detection with RAG retrieval for richer debugging hints
 */
export async function analyzeCodeWithRAG(
  code: string,
  pattern: DSAPattern,
  testResults?: { passed: number; total: number; failingTests?: string[] }
): Promise<EnhancedCodeAnalysisResult> {
  // Step 1: Run standard regex-based analysis
  const baseResult = analyzeCode(code, pattern, testResults)

  // Step 2: If no issues found and tests pass, return early (no RAG needed)
  if (baseResult.misconceptions.length === 0 && testResults?.passed === testResults?.total) {
    return {
      ...baseResult,
      ragHints: [],
      similarErrorsFound: 0,
      communityInsights: [],
    }
  }

  // Step 3: Retrieve RAG-enhanced debugging hints
  const ragHints = await retrieveRAGDebuggingHints(
    baseResult.misconceptions,
    pattern,
    code,
    testResults?.failingTests
  )

  // Step 4: Generate community insights
  const misconceptionTypes = baseResult.misconceptions.map((m) => m.misconceptionType)
  const communityInsights = await generateCommunityInsights(pattern, misconceptionTypes)

  return {
    ...baseResult,
    ragHints,
    similarErrorsFound: ragHints.length,
    communityInsights,
  }
}

// ============================================================================
// MISCONCEPTION TRACKING SERVICE
// ============================================================================

export class MisconceptionTracker {
  /**
   * Track a new misconception for a user
   */
  async trackMisconception(userId: string, misconception: DetectedMisconception): Promise<void> {
    try {
      // Check if similar misconception already exists
      const existing = await adminDb
        .collection("user_misconceptions")
        .where("userId", "==", userId)
        .where("misconceptionType", "==", misconception.misconceptionType)
        .where("pattern", "==", misconception.pattern)
        .limit(1)
        .get()

      if (!existing.empty) {
        // Update existing
        const doc = existing.docs[0]
        await doc.ref.update({
          frequency: (doc.data().frequency || 0) + 1,
          lastSeen: Timestamp.now(),
          status: "active",
        })
      } else {
        // Create new
        await adminDb.collection("user_misconceptions").add({
          ...misconception,
          userId,
          lastSeen: Timestamp.fromDate(misconception.lastSeen),
          createdAt: Timestamp.now(),
        })
      }
    } catch (error) {
      console.error("[MisconceptionTracker] Error tracking:", error)
    }
  }

  /**
   * Get user's active misconceptions
   */
  async getActiveMisconceptions(userId: string): Promise<DetectedMisconception[]> {
    try {
      const snapshot = await adminDb
        .collection("user_misconceptions")
        .where("userId", "==", userId)
        .where("status", "==", "active")
        .orderBy("frequency", "desc")
        .limit(10)
        .get()

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        lastSeen: (doc.data().lastSeen as Timestamp).toDate(),
      })) as DetectedMisconception[]
    } catch (error) {
      console.error("[MisconceptionTracker] Error getting misconceptions:", error)
      return []
    }
  }

  /**
   * Mark misconception as resolved
   */
  async resolveMisconception(userId: string, misconceptionId: string): Promise<void> {
    try {
      await adminDb.collection("user_misconceptions").doc(misconceptionId).update({
        status: "resolved",
        resolvedAt: Timestamp.now(),
      })
    } catch (error) {
      console.error("[MisconceptionTracker] Error resolving:", error)
    }
  }

  /**
   * Check if user's recent submission has fixed a misconception
   */
  async checkForResolution(
    userId: string,
    pattern: DSAPattern,
    testResults: { passed: number; total: number }
  ): Promise<string[]> {
    if (testResults.passed !== testResults.total) return []

    try {
      const activeMisconceptions = await adminDb
        .collection("user_misconceptions")
        .where("userId", "==", userId)
        .where("pattern", "==", pattern)
        .where("status", "==", "active")
        .get()

      const resolved: string[] = []

      for (const doc of activeMisconceptions.docs) {
        await doc.ref.update({
          status: "resolving",
          lastSeen: Timestamp.now(),
        })
        resolved.push(doc.id)
      }

      return resolved
    } catch (error) {
      console.error("[MisconceptionTracker] Error checking resolution:", error)
      return []
    }
  }

  /**
   * Get misconception summary for a pattern
   */
  async getPatternMisconceptionSummary(
    userId: string,
    pattern: DSAPattern
  ): Promise<{
    count: number
    mostCommon: MisconceptionType | null
    suggestedFocus: string
  }> {
    try {
      const snapshot = await adminDb
        .collection("user_misconceptions")
        .where("userId", "==", userId)
        .where("pattern", "==", pattern)
        .where("status", "==", "active")
        .get()

      if (snapshot.empty) {
        return { count: 0, mostCommon: null, suggestedFocus: "Keep practicing!" }
      }

      const misconceptions = snapshot.docs.map((doc) => doc.data())

      // Find most common type
      const typeCounts = new Map<MisconceptionType, number>()
      for (const m of misconceptions) {
        const type = m.misconceptionType as MisconceptionType
        typeCounts.set(type, (typeCounts.get(type) || 0) + (m.frequency || 1))
      }

      let mostCommon: MisconceptionType | null = null
      let maxCount = 0
      for (const [type, count] of typeCounts) {
        if (count > maxCount) {
          maxCount = count
          mostCommon = type
        }
      }

      // Generate suggested focus
      const focusSuggestions: Record<MisconceptionType, string> = {
        "off-by-one": "Practice array indexing and loop bounds",
        "wrong-data-structure": "Review time complexity of different data structures",
        "incorrect-complexity": "Focus on optimizing brute force solutions",
        "missing-edge-case": "Always check for null, empty, and boundary cases first",
        "wrong-algorithm": "Review when to use each algorithmic pattern",
        "syntax-confusion": "Brush up on language syntax and operators",
        "logic-error": "Trace through your code with example inputs",
        "boundary-confusion": "Draw out pointer movements before coding",
        "initialization-error": "Always initialize variables with appropriate defaults",
        "termination-condition": "Verify your loop will always terminate",
      }

      return {
        count: snapshot.size,
        mostCommon,
        suggestedFocus: mostCommon ? focusSuggestions[mostCommon] : "Keep practicing!",
      }
    } catch (error) {
      console.error("[MisconceptionTracker] Error getting summary:", error)
      return { count: 0, mostCommon: null, suggestedFocus: "Keep practicing!" }
    }
  }
}

// Singleton
let misconceptionTrackerInstance: MisconceptionTracker | null = null

export function getMisconceptionTracker(): MisconceptionTracker {
  if (!misconceptionTrackerInstance) {
    misconceptionTrackerInstance = new MisconceptionTracker()
  }
  return misconceptionTrackerInstance
}

// Convenience exports
export async function analyzeAndTrackMisconceptions(
  userId: string,
  code: string,
  pattern: DSAPattern,
  testResults?: { passed: number; total: number; failingTests?: string[] }
): Promise<CodeAnalysisResult> {
  const result = analyzeCode(code, pattern, testResults)
  const tracker = getMisconceptionTracker()

  // Track each misconception
  for (const misconception of result.misconceptions) {
    await tracker.trackMisconception(userId, misconception)
  }

  // Check if any misconceptions were resolved
  if (testResults && testResults.passed === testResults.total) {
    await tracker.checkForResolution(userId, pattern, testResults)
  }

  return result
}

/**
 * RAG-Enhanced version of analyzeAndTrackMisconceptions
 * Provides richer debugging hints by retrieving similar errors from the knowledge base
 *
 * Use this when you want to provide users with:
 * - Context-aware debugging hints based on similar errors
 * - Community insights ("Users who had this error often fixed it by...")
 * - More actionable suggestions than regex alone can provide
 *
 * Cost: ~1-2 extra RAG retrievals per call (cached for 30s)
 */
export async function analyzeAndTrackMisconceptionsWithRAG(
  userId: string,
  code: string,
  pattern: DSAPattern,
  testResults?: { passed: number; total: number; failingTests?: string[] }
): Promise<EnhancedCodeAnalysisResult> {
  // Use RAG-enhanced analysis
  const result = await analyzeCodeWithRAG(code, pattern, testResults)
  const tracker = getMisconceptionTracker()

  // Track each misconception
  for (const misconception of result.misconceptions) {
    await tracker.trackMisconception(userId, misconception)
  }

  // Check if any misconceptions were resolved
  if (testResults && testResults.passed === testResults.total) {
    await tracker.checkForResolution(userId, pattern, testResults)
  }

  return result
}
