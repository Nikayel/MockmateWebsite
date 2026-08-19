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
  problemStatement: `You're planning a night of burglaries on a street that loops back on itself: the houses stand in a circle, so the first house and the last house are direct neighbors. nums[i] tells you how much cash is stashed in house i, and every pair of adjacent houses shares a linked alarm that calls the police the moment both are broken into on the same night.

Because the circle makes them neighbors, hitting both the first house and the last house is off the table too whenever the street has more than one house. Return the most cash you can take in one night without tripping any alarm.`,
  examples: [
    {
      input: "nums = [4,1,4]",
      output: "4",
      explanation:
        "Houses 1 and 3 both hold 4, but the circle makes them neighbors, so only one of the two can be hit.",
    },
    {
      input: "nums = [2,5,1,7]",
      output: "12",
      explanation:
        "Hit house 2 (money = 5) and house 4 (money = 7). They are not adjacent. Total = 5 + 7 = 12.",
    },
    {
      input: "nums = [6,2,9]",
      output: "9",
    },
  ],
  constraints: [
    "the circle holds between 1 and 100 houses in nums",
    "each nums[i] is between 0 and 1000",
  ],
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
