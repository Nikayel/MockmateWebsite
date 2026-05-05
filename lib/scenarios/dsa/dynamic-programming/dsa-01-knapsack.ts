import type { DSAScenario } from "../../types"

export const zeroOneKnapsackScenario: DSAScenario = {
  id: "dsa-01-knapsack",
  title: "0/1 Knapsack Problem",
  type: "dsa",
  pattern: "dp-knapsack",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Microsoft", "Goldman Sachs"],
  description: "Maximize value in a knapsack with weight constraint (classic DP problem)",
  tags: ["dynamic-programming", "array"],
  estimatedTime: 30,
  problemStatement: `You are given weights and values of n items. You have a knapsack with a maximum weight capacity W.

Each item can only be selected once (0/1 property). Return the maximum total value that can be put in the knapsack.

For each item, you either include it completely or exclude it (no fractional items).`,
  examples: [
    {
      input: "weights = [1, 2, 3], values = [6, 10, 12], W = 5",
      output: "22",
      explanation: "Select items with weights 2 and 3 (values 10 + 12 = 22)",
    },
    {
      input: "weights = [1, 3, 4, 5], values = [1, 4, 5, 7], W = 7",
      output: "9",
      explanation: "Select items with weights 3 and 4 (values 4 + 5 = 9)",
    },
  ],
  constraints: ["1 <= n <= 100", "1 <= weights[i], values[i] <= 1000", "1 <= W <= 1000"],
  hints: [
    "2D DP: dp[i][w] = max value using first i items with capacity w",
    "For each item: include it (if fits) or exclude it",
    "dp[i][w] = max(dp[i-1][w], dp[i-1][w-weight[i]] + value[i])",
    "Iterate backwards for 1D space optimization",
  ],
  starterCode: {
    javascript: `function knapsack(weights, values, W) {
// Write your solution here

}`,
    typescript: `function knapsack(weights: number[], values: number[], W: number): number {
// Write your solution here

}`,
    python: `def knapsack(weights, values, W):
  # Write your solution here
  pass`,
  },
  optimalComplexity: { time: "O(n * W)", space: "O(W)" },
  testCases: [
    {
      input: { weights: [1, 2, 3], values: [6, 10, 12], W: 5 },
      expected: 22,
      description: "Standard case",
    },
    {
      input: { weights: [1, 3, 4, 5], values: [1, 4, 5, 7], W: 7 },
      expected: 9,
      description: "Medium case",
    },
    { input: { weights: [10], values: [100], W: 5 }, expected: 0, description: "Item too heavy" },
    { input: { weights: [1, 2], values: [5, 6], W: 3 }, expected: 11, description: "Take both" },
    {
      input: { weights: [2, 2, 2], values: [1, 2, 3], W: 4 },
      expected: 5,
      description: "Choose best pair",
    },
  ],
}
