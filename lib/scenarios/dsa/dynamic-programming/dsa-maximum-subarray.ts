import type { DSAScenario } from "../../types"

export const maximumSubarrayScenario: DSAScenario = {
  id: "dsa-maximum-subarray",
  title: "Maximum Subarray (Kadane's Algorithm)",
  type: "dsa",
  pattern: "dp-1d",
  difficulty: "medium",
  companies: ["Amazon", "Microsoft", "Meta", "Apple", "Roblox"],
  description: "Find the contiguous subarray with the largest sum",
  tags: ["array", "dynamic-programming", "divide-and-conquer"],
  estimatedTime: 20,
  problemStatement: `Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.

A subarray is a contiguous part of an array.`,
  examples: [
    {
      input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
      output: "6",
      explanation: "The subarray [4,-1,2,1] has the largest sum 6.",
    },
    {
      input: "nums = [1]",
      output: "1",
    },
    {
      input: "nums = [5,4,-1,7,8]",
      output: "23",
    },
  ],
  constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
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
