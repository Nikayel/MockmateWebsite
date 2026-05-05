import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type { PatternComplexityRules, ProblemComplexityKnowledge } from "../types"
import { twoSumComplexity } from "./problems/dsa-two-sum"
import { containsDuplicateComplexity } from "./problems/dsa-contains-duplicate"
import { validAnagramComplexity } from "./problems/dsa-valid-anagram"
import { groupAnagramsComplexity } from "./problems/dsa-group-anagrams"
import { topKFrequentComplexity } from "./problems/dsa-top-k-frequent"
import { productExceptSelfComplexity } from "./problems/dsa-product-except-self"
import { longestConsecutiveComplexity } from "./problems/dsa-longest-consecutive"
import { validPalindromeComplexity } from "./problems/dsa-valid-palindrome"
import { threeSumComplexity } from "./problems/dsa-three-sum"
import { containerWaterComplexity } from "./problems/dsa-container-water"
import { trappingRainWaterComplexity } from "./problems/dsa-trapping-rain-water"
import { bestTimeBuySellComplexity } from "./problems/dsa-best-time-buy-sell"
import { longestSubstringComplexity } from "./problems/dsa-longest-substring"
import { longestRepeatingReplacementComplexity } from "./problems/dsa-longest-repeating-replacement"
import { minWindowSubstringComplexity } from "./problems/dsa-min-window-substring"
import { validParenthesesComplexity } from "./problems/dsa-valid-parentheses"
import { minStackComplexity } from "./problems/dsa-min-stack"
import { dailyTemperaturesComplexity } from "./problems/dsa-daily-temperatures"
import { largestRectangleHistogramComplexity } from "./problems/dsa-largest-rectangle-histogram"
import { binarySearchComplexity } from "./problems/dsa-binary-search"
import { searchRotatedArrayComplexity } from "./problems/dsa-search-rotated-array"
import { findMinRotatedComplexity } from "./problems/dsa-find-min-rotated"
import { medianTwoArraysComplexity } from "./problems/dsa-median-two-arrays"
import { reverseLinkedListComplexity } from "./problems/dsa-reverse-linked-list"
import { mergeTwoListsComplexity } from "./problems/dsa-merge-two-lists"
import { linkedListCycleComplexity } from "./problems/dsa-linked-list-cycle"
import { lruCacheComplexity } from "./problems/dsa-lru-cache"
import { mergeKListsComplexity } from "./problems/dsa-merge-k-lists"
import { invertBinaryTreeComplexity } from "./problems/dsa-invert-binary-tree"
import { maxDepthTreeComplexity } from "./problems/dsa-max-depth-tree"
import { validateBstComplexity } from "./problems/dsa-validate-bst"
import { levelOrderTraversalComplexity } from "./problems/dsa-level-order-traversal"
import { binaryTreeMaxPathComplexity } from "./problems/dsa-binary-tree-max-path"
import { climbingStairsComplexity } from "./problems/dsa-climbing-stairs"
import { houseRobberComplexity } from "./problems/dsa-house-robber"
import { longestPalindromicComplexity } from "./problems/dsa-longest-palindromic"
import { coinChangeComplexity } from "./problems/dsa-coin-change"
import { wordBreakComplexity } from "./problems/dsa-word-break"
import { longestIncreasingSubseqComplexity } from "./problems/dsa-longest-increasing-subseq"
import { subsetsComplexity } from "./problems/dsa-subsets"
import { combinationSumComplexity } from "./problems/dsa-combination-sum"
import { permutationsComplexity } from "./problems/dsa-permutations"
import { numberOfIslandsComplexity } from "./problems/dsa-number-of-islands"
import { courseScheduleComplexity } from "./problems/dsa-course-schedule"
import { mergeIntervalsComplexity } from "./problems/dsa-merge-intervals"
import { insertIntervalComplexity } from "./problems/dsa-insert-interval"
import { romanToIntegerComplexity } from "./problems/dsa-roman-to-integer"
import { maximumUnitsOnTruckComplexity } from "./problems/dsa-maximum-units-on-truck"
import { maximumSubarrayComplexity } from "./problems/dsa-maximum-subarray"
import { PATTERN_COMPLEXITY_RULES } from "./pattern-rules"

export { PATTERN_COMPLEXITY_RULES } from "./pattern-rules"

export const PROBLEM_COMPLEXITY_DATA: ProblemComplexityKnowledge[] = [
  twoSumComplexity,
  containsDuplicateComplexity,
  validAnagramComplexity,
  groupAnagramsComplexity,
  topKFrequentComplexity,
  productExceptSelfComplexity,
  longestConsecutiveComplexity,
  validPalindromeComplexity,
  threeSumComplexity,
  containerWaterComplexity,
  trappingRainWaterComplexity,
  bestTimeBuySellComplexity,
  longestSubstringComplexity,
  longestRepeatingReplacementComplexity,
  minWindowSubstringComplexity,
  validParenthesesComplexity,
  minStackComplexity,
  dailyTemperaturesComplexity,
  largestRectangleHistogramComplexity,
  binarySearchComplexity,
  searchRotatedArrayComplexity,
  findMinRotatedComplexity,
  medianTwoArraysComplexity,
  reverseLinkedListComplexity,
  mergeTwoListsComplexity,
  linkedListCycleComplexity,
  lruCacheComplexity,
  mergeKListsComplexity,
  invertBinaryTreeComplexity,
  maxDepthTreeComplexity,
  validateBstComplexity,
  levelOrderTraversalComplexity,
  binaryTreeMaxPathComplexity,
  climbingStairsComplexity,
  houseRobberComplexity,
  longestPalindromicComplexity,
  coinChangeComplexity,
  wordBreakComplexity,
  longestIncreasingSubseqComplexity,
  subsetsComplexity,
  combinationSumComplexity,
  permutationsComplexity,
  numberOfIslandsComplexity,
  courseScheduleComplexity,
  mergeIntervalsComplexity,
  insertIntervalComplexity,
  romanToIntegerComplexity,
  maximumUnitsOnTruckComplexity,
  maximumSubarrayComplexity,
]

/**
 * Get complexity knowledge for a specific problem
 */
export function getComplexityKnowledge(problemId: string): ProblemComplexityKnowledge | undefined {
  return PROBLEM_COMPLEXITY_DATA.find((p) => p.problemId === problemId)
}

/**
 * Get complexity knowledge by LeetCode number
 */
export function getComplexityByLeetCode(
  leetcodeNumber: number
): ProblemComplexityKnowledge | undefined {
  return PROBLEM_COMPLEXITY_DATA.find((p) => p.leetcodeNumber === leetcodeNumber)
}

/**
 * Get pattern complexity rules
 */
export function getPatternComplexityRules(pattern: DSAPattern): PatternComplexityRules | undefined {
  return PATTERN_COMPLEXITY_RULES.find((r) => r.pattern === pattern)
}

/**
 * Check if complexity data exists for a problem
 */
export function hasComplexityData(problemId: string): boolean {
  return PROBLEM_COMPLEXITY_DATA.some((p) => p.problemId === problemId)
}

/**
 * Get all problems with complexity data
 */
export function getProblemsWithComplexityData(): string[] {
  return PROBLEM_COMPLEXITY_DATA.map((p) => p.problemId)
}
