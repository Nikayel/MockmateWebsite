import type { DSAScenario } from "../../types"

export const minCostClimbingStairsScenario: DSAScenario = {
  id: "dsa-min-cost-climbing-stairs",
  title: "Min Cost Climbing Stairs",
  type: "dsa",
  pattern: "dp-1d",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Microsoft"],
  description: "Find minimum cost to reach the top of stairs",
  tags: ["dynamic-programming", "array"],
  estimatedTime: 15,
  problemStatement: `You are given an integer array cost where cost[i] is the cost of ith step on a staircase. Once you pay the cost, you can either climb one or two steps.

You can either start from the step with index 0, or the step with index 1.

Return the minimum cost to reach the top of the floor.`,
  examples: [
    {
      input: "cost = [10,15,20]",
      output: "15",
      explanation: "Start at index 1, pay 15, climb two steps to reach the top.",
    },
    {
      input: "cost = [1,100,1,1,1,100,1,1,100,1]",
      output: "6",
      explanation: "Optimal path: 0 → 2 → 4 → 6 → 7 → 9 → top. Total cost = 1+1+1+1+1+1 = 6.",
    },
  ],
  constraints: ["2 <= cost.length <= 1000", "0 <= cost[i] <= 999"],
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
