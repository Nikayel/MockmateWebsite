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
 * Analyze code efficiency and estimate complexity.
 * @param code - The source code to analyze
 * @param optimalComplexity - Optional optimal complexity from the scenario
 * @returns Efficiency metrics including estimated and optimal complexity
 */
export function analyzeCodeEfficiency(
  code: string,
  optimalComplexity?: OptimalComplexity
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

  // Count outer loops
  const forLoops = (code.match(/\bfor\b/gi) || []).length
  const whileLoops = (code.match(/\bwhile\b/gi) || []).length
  const totalLoops = forLoops + whileLoops

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

  // IMPORTANT: Check nested loops FIRST, regardless of sort
  // 3Sum pattern: for loop + while loop inside = O(n²), sort is just O(n log n) preprocessing
  if (nestedLoopCount >= 2 || totalLoops >= 4) {
    estimatedTimeComplexity = "O(n³)"
  } else if (nestedLoopCount >= 1 || totalLoops >= 3) {
    // for + nested while = O(n²) (e.g., 3Sum with two-pointer)
    estimatedTimeComplexity = "O(n²)"
  } else if (code.match(/\b(sort|sorted)\b/i)) {
    // Sort without nested loops = O(n log n)
    estimatedTimeComplexity = "O(n log n)"
  }

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
