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
  problemStatement: `You're casing a row of houses along a quiet street, and nums[i] is the cash hidden inside house i. The complication is the wiring: every two houses that sit side by side share a linked alarm, and breaking into both members of such a pair on one night brings the police.

Choose which houses to hit so that no two of them are next-door neighbors, and return the biggest total haul you can carry off.`,
  examples: [
    {
      input: "nums = [3,1,4,2]",
      output: "7",
      explanation: "Hit houses 1 and 3",
    },
    {
      input: "nums = [5,3,8,4,9]",
      output: "22",
      explanation: "Hit houses 1, 3, and 5",
    },
  ],
  constraints: [
    "the street holds between 1 and 100 houses in nums",
    "every stash nums[i] is between 0 and 400",
  ],
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
    // In every case above the best plan was one of the two alternating sets, so
    // max(sum of even indices, sum of odd indices) passed. Here the answer skips two
    // houses in a row, which neither alternating set can do.
    {
      input: { nums: [2, 1, 1, 2] },
      expected: 4,
      description: "Best plan skips two houses in a row, so alternating sets fall short",
    },
    // And in every case above, repeatedly taking the largest remaining house happened to
    // be optimal. Here taking the 4 blocks both 3s, which together are worth more.
    {
      input: { nums: [3, 4, 3] },
      expected: 6,
      description: "Taking the largest house first loses to its two neighbours",
    },
  ],
}
