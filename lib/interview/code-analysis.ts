/**
 * Code Analysis Utilities
 *
 * Pure functions for analyzing code efficiency, complexity, and quality.
 * Used by the interview system to provide feedback on code submissions.
 *
 * Uses approach detection for smarter complexity estimation when problem ID is known.
 */

import { detectApproach } from "./approach-detector"
import type { DSAPattern } from "@/lib/types/dsa-patterns"

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
  // New fields for approach detection
  detectedApproach?: string
  isOptimal?: boolean
  approachConfidence?: "high" | "medium" | "low"
}

export interface AnalyzeCodeOptions {
  optimalComplexity?: OptimalComplexity
  problemId?: string
  pattern?: DSAPattern
}

/**
 * Analyze code efficiency and estimate complexity.
 *
 * @param code - The source code to analyze
 * @param optionsOrOptimalComplexity - Options including problemId for smart detection, or legacy OptimalComplexity
 * @returns Efficiency metrics including estimated and optimal complexity
 */
export function analyzeCodeEfficiency(
  code: string,
  optionsOrOptimalComplexity?: AnalyzeCodeOptions | OptimalComplexity
): CodeEfficiencyMetrics {
  // Handle both new options format and legacy OptimalComplexity format
  let options: AnalyzeCodeOptions
  if (
    optionsOrOptimalComplexity &&
    ("problemId" in optionsOrOptimalComplexity || "pattern" in optionsOrOptimalComplexity)
  ) {
    options = optionsOrOptimalComplexity as AnalyzeCodeOptions
  } else {
    options = { optimalComplexity: optionsOrOptimalComplexity as OptimalComplexity | undefined }
  }

  const { optimalComplexity, problemId, pattern } = options

  // Calculate lines of code (excluding empty lines and comments)
  const lines = code.split("\n")
  const linesOfCode = lines.filter((line) => {
    const trimmed = line.trim()
    return (
      trimmed.length > 0 &&
      !trimmed.startsWith("//") &&
      !trimmed.startsWith("/*") &&
      !trimmed.startsWith("*") &&
      !trimmed.startsWith("#")
    )
  }).length

  // Basic complexity estimation based on control structures
  const controlStructures = (code.match(/\b(if|else|for|while|switch|case|catch)\b/g) || []).length
  const complexityLevel: "Low" | "Medium" | "High" =
    controlStructures <= 3 ? "Low" : controlStructures <= 7 ? "Medium" : "High"

  // Use approach detector for smart complexity estimation
  const approachResult = detectApproach(code, problemId, pattern)

  let estimatedTimeComplexity: string
  let estimatedSpaceComplexity: string
  let detectedApproach: string | undefined
  let isOptimal: boolean | undefined
  let approachConfidence: "high" | "medium" | "low" | undefined

  if (approachResult.confidence !== "low" && approachResult.timeComplexity !== "Unknown") {
    // Use approach detector results
    estimatedTimeComplexity = approachResult.timeComplexity
    estimatedSpaceComplexity = approachResult.spaceComplexity
    detectedApproach = approachResult.detectedApproach || undefined
    isOptimal = approachResult.isOptimal
    approachConfidence = approachResult.confidence
  } else {
    // Fallback to regex-based detection (legacy behavior)
    const { time, space } = fallbackComplexityDetection(code)
    estimatedTimeComplexity = time
    estimatedSpaceComplexity = space
    approachConfidence = "low"
  }

  // Get optimal complexity from scenario (or use defaults)
  const optimalTimeComplexity = optimalComplexity?.time || "N/A"
  const optimalSpaceComplexity = optimalComplexity?.space || "N/A"

  // Calculate efficiency score (0-100)
  let efficiencyScore = 100

  // Deduct points for suboptimal time complexity
  if (
    optimalTimeComplexity !== "N/A" &&
    !complexitiesMatch(estimatedTimeComplexity, optimalTimeComplexity)
  ) {
    // Smaller deduction if detected approach is correct but not optimal
    if (isOptimal === false) {
      efficiencyScore -= 15 // Smaller penalty - they have a working approach
    } else {
      efficiencyScore -= 20
    }
  }

  // Deduct points for suboptimal space complexity
  if (
    optimalSpaceComplexity !== "N/A" &&
    !complexitiesMatch(estimatedSpaceComplexity, optimalSpaceComplexity)
  ) {
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
    detectedApproach,
    isOptimal,
    approachConfidence,
  }
}

/**
 * Legacy fallback for complexity detection using regex
 * Used when approach detector doesn't have enough confidence
 */
function fallbackComplexityDetection(code: string): { time: string; space: string } {
  // Check for hash structures FIRST - these often have amortized O(n) complexity
  // even when nested loops are present (e.g., Longest Consecutive Sequence)
  const hasHashSet = /\bset\s*\(|new\s+Set\s*\(|HashSet/i.test(code)
  const hasHashMap = /Map|dict|Counter|\{\s*\}|defaultdict|OrderedDict|LinkedHashMap/.test(code)
  const hasHashStructure = hasHashSet || hasHashMap

  // Check for the specific pattern of hash set with "in" checks inside a loop
  // This is a common O(n) pattern that looks like O(n²) naively
  // Example: for x in nums: while x+1 in num_set: ... (Longest Consecutive Sequence)
  const hasHashLookupInLoop =
    /for[\s\S]*?(?:in\s+\w+_?set|in\s+seen|\.has\s*\(|not\s+in\s+\w+)/m.test(code)

  // Estimate time complexity based on nested loops
  // Detect various nested loop patterns including Python (no braces)
  const hasNestedLoops =
    /for[\s\S]*?for|while[\s\S]*?while|for[\s\S]*?while|while[\s\S]*?for/m.test(code)
  const hasTripleNesting = /for[\s\S]*?for[\s\S]*?for|while[\s\S]*?while[\s\S]*?while/m.test(code)

  // Check for sort operations
  const hasSort = /\.sort\s*\(|sorted\s*\(|Arrays\.sort\s*\(|Collections\.sort\s*\(/.test(code)

  // Check for binary search pattern
  const hasBinarySearch =
    /while[\s\S]*?(?:left|lo|start)\s*<[=]?\s*(?:right|hi|end)[\s\S]*?mid/m.test(code)

  // Determine time complexity
  let time = "O(n)"

  // IMPORTANT: Hash-based solutions with nested loops are often still O(n)
  // because the inner loop is bounded by unique elements, not n
  // Only mark as O(n²) if there's no hash structure involved
  if (hasTripleNesting && !hasHashStructure) {
    time = "O(n³)"
  } else if (hasNestedLoops && !hasHashStructure && !hasHashLookupInLoop) {
    time = "O(n²)"
  } else if (hasBinarySearch) {
    time = "O(log n)"
  } else if (hasSort && !hasNestedLoops) {
    // Only O(n log n) if sorting is the dominant operation
    time = "O(n log n)"
  }
  // Hash-based solutions stay at O(n) even with nested loops

  // Estimate space complexity
  const hasArrayCreation =
    /=\s*\[\s*\]|=\s*\[[^\]]+\]|new\s+Array|Array\s*\.\s*from|list\s*\(\s*\)|\.split\s*\(|\.map\s*\(|\.filter\s*\(|\[\s*for\s+/.test(
      code
    )

  let space = "O(1)"
  if (hasHashStructure || hasArrayCreation) {
    space = "O(n)"
  }

  return { time, space }
}

/**
 * Check if two complexity strings are equivalent
 * Handles variations like "O(n)" vs "O(N)" vs "O( n )"
 */
function complexitiesMatch(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "").replace(/\^/g, "")
  return normalize(a) === normalize(b)
}
