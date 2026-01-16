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
  const nestedLoopCount =
    (code.match(/for.*{[^}]*for/g) || []).length + (code.match(/while.*{[^}]*while/g) || []).length
  let estimatedTimeComplexity = "O(n)"
  if (nestedLoopCount >= 2) {
    estimatedTimeComplexity = "O(n³)"
  } else if (nestedLoopCount === 1) {
    estimatedTimeComplexity = "O(n²)"
  } else if (code.includes("sort")) {
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
