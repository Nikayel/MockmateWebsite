import type { DSAScenario } from "../../types"

export const maximumSubarrayScenario: DSAScenario = {
  id: "dsa-maximum-subarray",
  title: "Maximum Subarray",
  type: "dsa",
  pattern: "dp-1d",
  difficulty: "medium",
  companies: ["Amazon", "Microsoft", "Meta", "Apple", "Roblox"],
  description: "Track down the stretch of neighboring entries with the biggest total",
  tags: ["array", "dynamic-programming", "divide-and-conquer"],
  estimatedTime: 20,
  problemStatement: `You're given an integer array nums. Out of every stretch of consecutive entries (a stretch must hold at least one number), find the one whose total is highest.

Entries in a stretch have to sit side by side in nums; leaving gaps is not allowed. Return that highest total, not the stretch itself.`,
  examples: [
    {
      input: "nums = [-3,2,-1,6,-5,1,3,-7,2]",
      output: "7",
      explanation: "The stretch [2,-1,6] adds up to 7, and nothing else beats it.",
    },
    {
      input: "nums = [4]",
      output: "4",
    },
    {
      input: "nums = [6,3,-2,8,5]",
      output: "20",
    },
  ],
  constraints: [
    "nums contains at least 1 entry and at most 10^5.",
    "Every entry lies between -10^4 and 10^4.",
  ],
  hints: [
    "Use Kadane's Algorithm",
    "Keep track of the current sum and maximum sum",
    "Reset current sum to 0 if it becomes negative",
  ],
  starterCode: {
    javascript: `function maxSubArray(nums) {
// Write your solution here

}`,
    typescript: `function maxSubArray(nums: number[]): number {
// Write your solution here

}`,
    python: `def maxSubArray(nums):
  # Write your solution here
  pass`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] },
      expected: 6,
      description: "Classic case: [4,-1,2,1] subarray sum = 6",
    },
    {
      input: { nums: [1] },
      expected: 1,
      description: "Single element",
    },
    {
      input: { nums: [5, 4, -1, 7, 8] },
      expected: 23,
      description: "All positive sum",
    },
    {
      input: { nums: [-1, -2, -3, -4] },
      expected: -1,
      description: "All negative: return largest negative",
    },
    {
      input: { nums: [1, 2, -1, -2, 2, 1, -2, 1] },
      expected: 3,
      description: "Mixed positive and negative",
    },
  ],
}
