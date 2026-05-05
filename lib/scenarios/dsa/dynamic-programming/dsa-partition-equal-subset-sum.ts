import type { DSAScenario } from "../../types"

export const partitionEqualSubsetSumScenario: DSAScenario = {
  id: "dsa-partition-equal-subset-sum",
  title: "Partition Equal Subset Sum",
  type: "dsa",
  pattern: "dp-knapsack",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Determine if array can be partitioned into two subsets with equal sum",
  tags: ["dynamic-programming", "array"],
  estimatedTime: 25,
  problemStatement: `Given an integer array nums, return true if you can partition the array into two subsets such that the sum of the elements in both subsets is equal, or false otherwise.`,
  examples: [
    {
      input: "nums = [1,5,11,5]",
      output: "true",
      explanation: "The array can be partitioned as [1, 5, 5] and [11].",
    },
    {
      input: "nums = [1,2,3,5]",
      output: "false",
      explanation: "The array cannot be partitioned into equal sum subsets.",
    },
  ],
  constraints: ["1 <= nums.length <= 200", "1 <= nums[i] <= 100"],
  hints: [
    "If total sum is odd, impossible to partition equally",
    "Reduces to: can we find subset with sum = totalSum/2?",
    "This is a 0/1 Knapsack problem variant",
    "dp[i] = true if sum i is achievable",
  ],
  starterCode: {
    javascript: `function canPartition(nums) {
// Write your solution here

}`,
    typescript: `function canPartition(nums: number[]): boolean {
// Write your solution here

}`,
    python: `def canPartition(nums):
  # Write your solution here
  pass`,
  },
  optimalComplexity: { time: "O(n * sum)", space: "O(sum)" },
  testCases: [
    { input: { nums: [1, 5, 11, 5] }, expected: true, description: "[1,5,5] and [11]" },
    { input: { nums: [1, 2, 3, 5] }, expected: false, description: "Cannot partition" },
    { input: { nums: [1, 2, 3, 4] }, expected: true, description: "[1,4] and [2,3]" },
    { input: { nums: [2, 2, 1, 1] }, expected: true, description: "[2,1] and [2,1]" },
    { input: { nums: [1, 1, 1, 1, 1] }, expected: false, description: "Odd count of 1s" },
  ],
}
