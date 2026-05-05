import type { DSAScenario } from "../../types"

export const targetSumScenario: DSAScenario = {
  id: "dsa-target-sum",
  title: "Target Sum",
  type: "dsa",
  pattern: "dp-knapsack",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Count ways to assign + and - to reach target sum",
  tags: ["dynamic-programming", "array", "backtracking"],
  estimatedTime: 30,
  problemStatement: `You are given an integer array nums and an integer target.

You want to build an expression out of nums by adding one of the symbols '+' and '-' before each integer in nums and then concatenate all the integers.

Return the number of different expressions that you can build, which evaluates to target.`,
  examples: [
    {
      input: "nums = [1,1,1,1,1], target = 3",
      output: "5",
      explanation: "-1 + 1 + 1 + 1 + 1 = 3, +1 - 1 + 1 + 1 + 1 = 3, etc. There are 5 ways.",
    },
    {
      input: "nums = [1], target = 1",
      output: "1",
    },
  ],
  constraints: [
    "1 <= nums.length <= 20",
    "0 <= nums[i] <= 1000",
    "0 <= sum(nums[i]) <= 1000",
    "-1000 <= target <= 1000",
  ],
  hints: [
    "Let P = sum of positive numbers, N = sum of negative numbers",
    "P - N = target and P + N = sum",
    "So P = (target + sum) / 2 - this is a subset sum problem!",
    "Count subsets with sum P using DP",
  ],
  starterCode: {
    javascript: `function findTargetSumWays(nums, target) {
// Write your solution here

}`,
    typescript: `function findTargetSumWays(nums: number[], target: number): number {
// Write your solution here

}`,
    python: `def findTargetSumWays(nums, target):
  # Write your solution here
  pass`,
  },
  optimalComplexity: { time: "O(n * sum)", space: "O(sum)" },
  testCases: [
    {
      input: { nums: [1, 1, 1, 1, 1], target: 3 },
      expected: 5,
      description: "Five ones to make 3",
    },
    { input: { nums: [1], target: 1 }, expected: 1, description: "Single element" },
    { input: { nums: [1, 0], target: 1 }, expected: 2, description: "Zero can be +0 or -0" },
    { input: { nums: [1, 2, 1], target: 0 }, expected: 2, description: "+1-2+1 or -1+2-1" },
  ],
}
