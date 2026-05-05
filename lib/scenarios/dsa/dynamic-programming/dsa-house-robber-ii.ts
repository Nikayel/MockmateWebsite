import type { DSAScenario } from "../../types"

export const houseRobberIiScenario: DSAScenario = {
  id: "dsa-house-robber-ii",
  title: "House Robber II",
  type: "dsa",
  pattern: "dp-1d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Maximum robbery with circular house arrangement",
  tags: ["dynamic-programming", "array"],
  estimatedTime: 25,
  problemStatement: `You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. All houses at this place are arranged in a circle. That means the first house is the neighbor of the last one. Meanwhile, adjacent houses have a security system connected, and it will automatically contact the police if two adjacent houses were broken into on the same night.

Given an integer array nums representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police.`,
  examples: [
    {
      input: "nums = [2,3,2]",
      output: "3",
      explanation:
        "You cannot rob house 1 (money = 2) and then rob house 3 (money = 2), because they are adjacent houses.",
    },
    {
      input: "nums = [1,2,3,1]",
      output: "4",
      explanation: "Rob house 1 (money = 1) and then rob house 3 (money = 3). Total = 1 + 3 = 4.",
    },
    {
      input: "nums = [1,2,3]",
      output: "3",
    },
  ],
  constraints: ["1 <= nums.length <= 100", "0 <= nums[i] <= 1000"],
  hints: [
    "Since houses are circular, you can't rob both first and last house",
    "Run House Robber I twice: once for houses 0 to n-2, once for houses 1 to n-1",
    "Return max of both results",
  ],
  starterCode: {
    javascript: `function rob(nums) {
// Write your solution here

}`,
    typescript: `function rob(nums: number[]): number {
// Write your solution here

}`,
    python: `def rob(nums):
  # Write your solution here
  pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    { input: { nums: [2, 3, 2] }, expected: 3, description: "Cannot rob first and last" },
    { input: { nums: [1, 2, 3, 1] }, expected: 4, description: "Rob house 1 and 3" },
    { input: { nums: [1, 2, 3] }, expected: 3, description: "Rob middle house" },
    { input: { nums: [1] }, expected: 1, description: "Single house" },
    { input: { nums: [1, 2] }, expected: 2, description: "Two houses - pick larger" },
  ],
}
