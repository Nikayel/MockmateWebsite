import type { DSAScenario } from "../../types"

export const houseRobberScenario: DSAScenario = {
  id: "dsa-house-robber",
  title: "House Robber",
  type: "dsa",
  pattern: "dp-1d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Maximize amount robbed without robbing adjacent houses.",
  tags: ["dynamic-programming", "array"],
  estimatedTime: 20,
  problemStatement: `You are a robber planning to rob houses along a street. Each house has money, but adjacent houses have security that alerts police. Return the maximum amount you can rob without alerting police.`,
  examples: [
    {
      input: "nums = [1,2,3,1]",
      output: "4",
      explanation: "Rob house 1 and 3",
    },
    {
      input: "nums = [2,7,9,3,1]",
      output: "12",
      explanation: "Rob houses 1, 3, and 5",
    },
  ],
  constraints: ["1 <= nums.length <= 100", "0 <= nums[i] <= 400"],
  hints: [
    "1D DP: dp[i] = max money robbing up to house i",
    "Choice: rob current (nums[i] + dp[i-2]) or skip (dp[i-1])",
    "Can optimize space to O(1) using two variables",
  ],
  starterCode: {
    javascript: `function rob(nums) {
// Write your solution here

}`,
    python: `def rob(nums: list[int]) -> int:
  # Write your solution here
  pass`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { nums: [1, 2, 3, 1] },
      expected: 4,
      description: "Rob house 1 and 3: 1 + 3 = 4",
    },
    {
      input: { nums: [2, 7, 9, 3, 1] },
      expected: 12,
      description: "Rob houses 1, 3, 5: 2 + 9 + 1 = 12",
    },
    {
      input: { nums: [1] },
      expected: 1,
      description: "Single house",
    },
    {
      input: { nums: [2, 1] },
      expected: 2,
      description: "Two houses, pick larger",
    },
    {
      input: { nums: [1, 2, 3, 4, 5, 6] },
      expected: 12,
      description: "Rob even indexed houses: 2 + 4 + 6 = 12",
    },
  ],
}
