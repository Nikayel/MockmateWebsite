/**
 * Code Analysis Utilities
 *
 * Pure functions for analyzing code efficiency, complexity, and quality.
 * Used by the interview system to provide feedback on code submissions.
 */

export interface OptimalComplexity {
  time?: string
  space?: string
}

export interface AnalysisOptions {
  /** Test pass rate (0-100). If 100%, we're more confident the solution is optimal */
  testPassRate?: number
  /** The DSA pattern type (e.g., "two-pointers", "sliding-window") for pattern-aware estimation */
  pattern?: string
}

export interface CodeEfficiencyMetrics {
  linesOfCode: number
  complexity: "Low" | "Medium" | "High"
  estimatedTimeComplexity: string
  estimatedSpaceComplexity: string
  optimalTimeComplexity: string
  optimalSpaceComplexity: string
  efficiencyScore: number
}

/**
 * Detect obvious brute force patterns relative to the optimal complexity.
 *
 * CONSERVATIVE APPROACH: Only flag clear brute force patterns.
 * For complex patterns (bucket sort, amortized analysis), defer to LLM analysis.
 *
 * Returns true ONLY if there's clear evidence of suboptimal approach.
 */
function detectBruteForcePattern(code: string, optimalTime?: string): boolean {
  // Only detect triple-nested loops as definite brute force
  // This is conservative - we'd rather under-flag than over-flag
  const tripleNestedFor =
    (code.match(/\bfor\b[^}]*\{[^}]*\bfor\b[^}]*\{[^}]*\bfor\b/gi) || []).length > 0 ||
    (code.match(/\bfor\b[^:]*:[^\n]*\n\s+for\b[^:]*:[^\n]*\n\s+for\b/gi) || []).length > 0

  // For O(n²) optimal: 3 nested for loops is brute force (like brute force 3Sum)
  if (optimalTime === "O(n²)" && tripleNestedFor) {
    return true
  }

  // For other cases, defer to LLM analysis - regex can't reliably detect:
  // - Bucket sort (nested loops that are O(n) amortized)
  // - Sequential vs nested loops
  // - Early termination patterns
  return false
}

/**
 * Analyze code efficiency and estimate complexity.
 *
 * SYSTEMATIC APPROACH:
 * 1. Use pattern recognition for common DSA patterns (two-pointers, sliding-window, etc.)
 * 2. Detect and exclude "helper" loops (duplicate-skipping, pointer advancement)
 * 3. If all tests pass and no brute force detected, trust the optimal complexity
 * 4. Only penalize when there's clear evidence of suboptimal approach
 *
 * @param code - The source code to analyze
 * @param optimalComplexity - Optional optimal complexity from the scenario
 * @param options - Additional options like test pass rate for smarter estimation
 * @returns Efficiency metrics including estimated and optimal complexity
 */
export function analyzeCodeEfficiency(
  code: string,
  optimalComplexity?: OptimalComplexity,
  options?: AnalysisOptions
): CodeEfficiencyMetrics {
  // Calculate lines of code (excluding empty lines and comments)
  const lines = code.split("\n")
  const linesOfCode = lines.filter((line) => {
    const trimmed = line.trim()
    return (
      trimmed.length > 0 &&
      !trimmed.startsWith("//") &&
      !trimmed.startsWith("/*") &&
      !trimmed.startsWith("*")
    )
  }).length

  // Basic complexity estimation based on control structures
  const controlStructures = (code.match(/\b(if|else|for|while|switch|case|catch)\b/g) || []).length
  const complexityLevel: "Low" | "Medium" | "High" =
    controlStructures <= 3 ? "Low" : controlStructures <= 7 ? "Medium" : "High"

  // Estimate time complexity based on nested loops
  // Handle both JavaScript/TypeScript ({}) and Python (:) syntax
  // Also handle mixed for/while nesting (common in two-pointer patterns)

  // Count loops for basic pattern detection
  const forLoops = (code.match(/\bfor\b/gi) || []).length
  const whileLoops = (code.match(/\bwhile\b/gi) || []).length

  // Detect two-pointer pattern: for loop + while with left < right
  // This is O(n²) overall (outer O(n) × inner O(n) scan)
  const hasTwoPointerPattern =
    forLoops >= 1 &&
    whileLoops >= 1 &&
    /\bwhile\b[^:\n{]*\b(left|l|lo|low|start|i)\b[^:\n{]*(<|<=)[^:\n{]*\b(right|r|hi|high|end|j)\b/i.test(
      code
    )

  // Detect nested loops more robustly:
  // - JavaScript: for...{ ... for/while
  // - Python: for...: followed by indented for/while
  const jsNestedForFor = (code.match(/\bfor\b[^}]*\{[^}]*\bfor\b/gi) || []).length
  const jsNestedForWhile = (code.match(/\bfor\b[^}]*\{[^}]*\bwhile\b/gi) || []).length
  const jsNestedWhileFor = (code.match(/\bwhile\b[^}]*\{[^}]*\bfor\b/gi) || []).length
  const jsNestedWhileWhile = (code.match(/\bwhile\b[^}]*\{[^}]*\bwhile\b/gi) || []).length

  // Python: for...: followed by while (common in two-pointer)
  // This is a simplified check - looks for for/while followed by another for/while with indentation
  const pyNestedForWhile = (code.match(/\bfor\b[^:]*:[^\n]*\n\s+while\b/gi) || []).length
  const pyNestedWhileFor = (code.match(/\bwhile\b[^:]*:[^\n]*\n\s+for\b/gi) || []).length
  const pyNestedForFor = (code.match(/\bfor\b[^:]*:[^\n]*\n\s+for\b/gi) || []).length
  const pyNestedWhileWhile = (code.match(/\bwhile\b[^:]*:[^\n]*\n\s+while\b/gi) || []).length

  const nestedLoopCount =
    jsNestedForFor +
    jsNestedForWhile +
    jsNestedWhileFor +
    jsNestedWhileWhile +
    pyNestedForWhile +
    pyNestedWhileFor +
    pyNestedForFor +
    pyNestedWhileWhile

  let estimatedTimeComplexity = "O(n)"

  // CONSERVATIVE COMPLEXITY ESTIMATION
  // Only flag what we can reliably detect with regex. For complex patterns
  // (bucket sort, amortized analysis), let LLM analysis handle it.
  //
  // KEY FIX: Removed effectiveTotalLoops >= 4 check that was causing O(n³) false positives.
  // Sequential loops (loop1; loop2; loop3; loop4) are O(n), NOT O(n³).
  // Only NESTED loops multiply complexity.

  if (hasTwoPointerPattern) {
    // Two-pointer with optional duplicate skipping = O(n²)
    // Examples: 3Sum, 4Sum with two-pointer inner loop
    estimatedTimeComplexity = "O(n²)"
  } else if (nestedLoopCount >= 2) {
    // True O(n³): multiple levels of actual nesting
    // Conservative: only flag when we see 2+ levels of definite nesting
    estimatedTimeComplexity = "O(n³)"
  } else if (nestedLoopCount >= 1) {
    // Single level of nesting = O(n²)
    // Note: This may over-flag bucket sort, but LLM analysis will correct it
    estimatedTimeComplexity = "O(n²)"
  } else if (code.match(/\b(sort|sorted)\b/i)) {
    // Sort without nested loops = O(n log n)
    estimatedTimeComplexity = "O(n log n)"
  }
  // Default: O(n) for sequential loops, single loops, etc.

  // Estimate space complexity based on data structures
  // Only count CREATION of new data structures, not access/indexing
  const hasHashMapCreation =
    /new\s+Map\s*\(/.test(code) || // new Map()
    /new\s+Set\s*\(/.test(code) || // new Set()
    /=\s*\{\s*\}/.test(code) || // = {} (empty object literal)
    /dict\s*\(\s*\)/.test(code) || // dict() in Python
    /set\s*\(\s*\)/.test(code) || // set() in Python
    /defaultdict\s*\(/.test(code) || // defaultdict in Python
    /Counter\s*\(/.test(code) // Counter in Python

  // Detect array CREATION, not just indexing
  const hasArrayCreation =
    /=\s*\[\s*\]/.test(code) || // = [] (empty array literal)
    /=\s*\[[^\]]+\](?!\s*=)/.test(code) || // = [items] (array literal with items)
    /new\s+Array\s*\(/.test(code) || // new Array()
    /Array\s*\.\s*from\s*\(/.test(code) || // Array.from()
    /list\s*\(\s*\)/.test(code) || // list() in Python
    /\.split\s*\(/.test(code) || // .split() creates new array
    /\.slice\s*\(/.test(code) || // .slice() creates new array
    /\.map\s*\(/.test(code) || // .map() creates new array
    /\.filter\s*\(/.test(code) || // .filter() creates new array
    /\[\s*for\s+/.test(code) // [x for x in ...] list comprehension

  let estimatedSpaceComplexity = "O(1)"
  if (hasHashMapCreation || hasArrayCreation) {
    estimatedSpaceComplexity = "O(n)"
  }

  // Get optimal complexity from scenario (or use defaults)
  const optimalTimeComplexity = optimalComplexity?.time || "N/A"
  const optimalSpaceComplexity = optimalComplexity?.space || "N/A"

  // SYSTEMATIC APPROACH: If all tests pass and no clear brute force, trust optimal complexity
  // This handles edge cases where pattern recognition might miss something
  // Rationale: If the solution works correctly for all test cases, and doesn't use an obviously
  // suboptimal approach (like 3 nested for loops for a 2-pointer problem), it's likely optimal
  const testPassRate = options?.testPassRate ?? 0
  const isBruteForce = detectBruteForcePattern(code, optimalTimeComplexity)

  if (testPassRate === 100 && optimalTimeComplexity !== "N/A" && !isBruteForce) {
    // All tests pass and no brute force detected - trust the optimal complexity
    // This is the systematic fallback when pattern recognition might be imperfect
    estimatedTimeComplexity = optimalTimeComplexity
    // For space, only trust optimal if we didn't detect extra data structures
    // (some problems allow O(n) space for the output itself)
  }

  // Calculate efficiency score (0-100)
  let efficiencyScore = 100

  // Deduct points for suboptimal time complexity
  if (optimalTimeComplexity !== "N/A" && estimatedTimeComplexity !== optimalTimeComplexity) {
    efficiencyScore -= 20
  }

  // Deduct points for suboptimal space complexity
  if (optimalSpaceComplexity !== "N/A" && estimatedSpaceComplexity !== optimalSpaceComplexity) {
    efficiencyScore -= 10
  }

  // Deduct points for excessive complexity
  if (complexityLevel === "High") {
    efficiencyScore -= 15
  } else if (complexityLevel === "Medium") {
    efficiencyScore -= 5
  }

  // Deduct points for excessive lines of code
  if (linesOfCode > 30) {
    efficiencyScore -= 10
  } else if (linesOfCode > 20) {
    efficiencyScore -= 5
  }

  return {
    linesOfCode,
    complexity: complexityLevel,
    estimatedTimeComplexity,
    estimatedSpaceComplexity,
    optimalTimeComplexity,
    optimalSpaceComplexity,
    efficiencyScore: Math.max(0, efficiencyScore),
  }
}
