import type { DSAScenario } from "../../types"

export const dsaSubarraySumEqualsKScenario: DSAScenario = {
  id: "dsa-subarray-sum-equals-k",
  title: "Subarray Sum Equals K",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "medium",
  companies: ["Meta", "Google", "Amazon", "Microsoft", "Snap", "TikTok", "Reddit", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe", "fdse"],
  description: "Count how many contiguous runs of an array add up to k",
  tags: ["array", "hash-table", "prefix-sum"],
  estimatedTime: 25,
  problemStatement: `You're given an integer array nums and an integer k. Count how many subarrays of nums sum to exactly k, and return that count.

A subarray means a run of one or more elements sitting next to each other in the array, so it is contiguous and never empty.`,
  examples: [
    {
      input: "nums = [2,2,2], k = 4",
      output: "2",
      explanation: "The windows nums[0..1] and nums[1..2] both add up to 4",
    },
    {
      input: "nums = [3,2,5], k = 5",
      output: "2",
      explanation:
        "nums[0..1] = 3 + 2 reaches 5, and the single entry nums[2] = 5 matches on its own",
    },
  ],
  constraints: [
    "nums holds between 1 and 2 * 10^4 entries.",
    "Entries range from -1000 to 1000.",
    "k lies anywhere between -10^7 and 10^7.",
  ],
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
