import type { DSAPatternKnowledge } from "../../types"

export const arraysHashingPrefixSumKnowledge: DSAPatternKnowledge = {
  pattern: "arrays-hashing",
  displayName: "Prefix Sum",
  description:
    "Precompute cumulative sums for O(1) range queries. Useful for subarray sum problems.",
  whenToUse: [
    "Range sum queries",
    "Subarray sum problems",
    "Finding subarrays with target sum",
    "2D range sum queries",
    "Equilibrium point finding",
  ],
  keyInsights: [
    "prefix[i] = sum of elements 0 to i-1",
    "Range sum [i, j] = prefix[j+1] - prefix[i]",
    "Can be combined with hash map for target sum",
    "2D prefix sum for rectangle queries",
  ],
  commonMistakes: [
    "Off-by-one in prefix array indexing",
    "Forgetting prefix[0] = 0",
    "Integer overflow for large sums",
    "Wrong formula for range query",
  ],
  timeComplexity: {
    typical: "O(n) preprocessing, O(1) query",
    best: "O(1) per query after preprocessing",
    worst: "O(n) for building prefix array",
  },
  spaceComplexity: {
    typical: "O(n)",
    notes: "O(n²) for 2D prefix sum",
  },
  relatedPatterns: ["arrays-hashing", "sliding-window"],
  prerequisites: ["arrays-hashing"],
  codeTemplate: `def subarray_sum(nums, target):
  prefix_sum = {0: 1}
  current_sum = 0
  count = 0

  for num in nums:
      current_sum += num
      if current_sum - target in prefix_sum:
          count += prefix_sum[current_sum - target]
      prefix_sum[current_sum] = prefix_sum.get(current_sum, 0) + 1

  return count`,
  examples: [
    "Subarray Sum Equals K",
    "Range Sum Query",
    "Product of Array Except Self",
    "Contiguous Array",
  ],
  interviewTips: [
    "Explain the prefix sum concept clearly",
    "Draw out the prefix array",
    "Combine with hash map for O(n) solutions",
  ],
}
