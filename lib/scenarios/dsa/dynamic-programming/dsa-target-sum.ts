import type { DSAScenario } from "../../types"

export const targetSumScenario: DSAScenario = {
  id: "dsa-target-sum",
  title: "Target Sum",
  type: "dsa",
  pattern: "dp-knapsack",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Count ways to assign + and - to reach target sum",
  tags: ["array", "dynamic-programming", "backtracking"],
  estimatedTime: 30,
  problemStatement: `You're handed an integer array nums and an integer target. Walk down nums and write either a '+' or a '-' in front of every single entry; no entry may stay unsigned and none may be skipped. Reading off the signed entries and summing them gives the expression's value.

Count how many distinct sign placements make that value land exactly on target, and return the count.`,
  examples: [
    {
      input: "nums = [1,1,1,1], target = 2",
      output: "4",
      explanation:
        "Flip exactly one entry negative, as in +1+1+1-1 = 2. The minus sign has 4 possible homes.",
    },
    {
      input: "nums = [3], target = -3",
      output: "1",
    },
  ],
  constraints: [
    "nums holds 1 to 20 entries.",
    "Entries range from 0 up to 1000.",
    "The entries never total less than 0 or more than 1000.",
    "target lies between -1000 and 1000.",
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
