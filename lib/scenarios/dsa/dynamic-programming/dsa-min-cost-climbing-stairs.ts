import type { DSAScenario } from "../../types"

export const minCostClimbingStairsScenario: DSAScenario = {
  id: "dsa-min-cost-climbing-stairs",
  title: "Min Cost Climbing Stairs",
  type: "dsa",
  pattern: "dp-1d",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Microsoft"],
  description: "Pay as little as possible to climb past the last stair",
  tags: ["dynamic-programming", "array"],
  estimatedTime: 15,
  problemStatement: `You're facing a staircase where standing on stair i costs you cost[i]. Paying a stair's price lets you push off from it and land either one or two stairs higher.

Your first foothold can be stair 0 or stair 1, whichever you prefer. The goal sits just past the final stair, and stepping beyond the last stair costs nothing extra.

Return the smallest total you can pay to get there.`,
  examples: [
    {
      input: "cost = [8,12,30]",
      output: "12",
      explanation: "Begin on stair 1, pay 12, and vault two stairs straight past the end.",
    },
    {
      input: "cost = [2,50,2,2,50,2,2,50,2,2]",
      output: "12",
      explanation:
        "Take the cheap stairs: 0 → 2 → 3 → 5 → 6 → 8 → past the end. That is six payments of 2.",
    },
  ],
  constraints: [
    "cost holds between 2 and 1000 stairs.",
    "Each stair's price falls between 0 and 999.",
  ],
  hints: [
    "dp[i] = minimum cost to reach step i",
    "dp[i] = cost[i] + min(dp[i-1], dp[i-2])",
    "Top is step n (one past last index)",
    "Can optimize to O(1) space",
  ],
  starterCode: {
    javascript: `function minCostClimbingStairs(cost) {
// Write your solution here

}`,
    typescript: `function minCostClimbingStairs(cost: number[]): number {
// Write your solution here

}`,
    python: `def minCostClimbingStairs(cost):
  # Write your solution here
  pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    { input: { cost: [10, 15, 20] }, expected: 15, description: "Start at index 1" },
    {
      input: { cost: [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] },
      expected: 6,
      description: "Skip expensive steps",
    },
    { input: { cost: [0, 0, 0, 1] }, expected: 0, description: "Can reach top for free" },
  ],
}
