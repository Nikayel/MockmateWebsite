import type { DSAScenario } from "../../types"

export const dsaSubarraySumEqualsKScenario: DSAScenario = {
  id: "dsa-subarray-sum-equals-k",
  title: "Subarray Sum Equals K",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "medium",
  companies: ["Meta", "Google", "Amazon", "Microsoft", "Snap", "TikTok", "Reddit", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe", "fdse"],
  description: "Count subarrays with sum equal to k using prefix sum",
  tags: ["array", "hash-table", "prefix-sum"],
  estimatedTime: 25,
  problemStatement: `Given an array of integers nums and an integer k, return the total number of subarrays whose sum equals to k.

A subarray is a contiguous non-empty sequence of elements within an array.`,
  examples: [
    {
      input: "nums = [1,1,1], k = 2",
      output: "2",
      explanation: "Subarrays [1,1] at index 0-1 and 1-2",
    },
    { input: "nums = [1,2,3], k = 3", output: "2", explanation: "Subarrays [1,2] and [3]" },
  ],
  constraints: ["1 <= nums.length <= 2 * 10^4", "-1000 <= nums[i] <= 1000", "-10^7 <= k <= 10^7"],
  hints: [
    "Use prefix sum: if prefixSum[j] - prefixSum[i] = k, subarray (i,j] sums to k",
    "Store prefix sums in HashMap with their counts",
    "For each position, check if (currentSum - k) exists in map",
  ],
  starterCode: {
    javascript: `function subarraySum(nums, k) {\n  // Write your solution here\n\n}`,
    typescript: `function subarraySum(nums: number[], k: number): number {\n  // Write your solution here\n\n}`,
    python: `def subarraySum(nums, k):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(n)" },
  testCases: [
    { input: { nums: [1, 1, 1], k: 2 }, expected: 2, description: "Multiple subarrays" },
    { input: { nums: [1, 2, 3], k: 3 }, expected: 2, description: "Non-overlapping subarrays" },
    { input: { nums: [1, -1, 0], k: 0 }, expected: 3, description: "With negatives and zero" },
  ],
}
