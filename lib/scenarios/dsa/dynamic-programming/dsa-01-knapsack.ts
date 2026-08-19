import type { DSAScenario } from "../../types"

export const zeroOneKnapsackScenario: DSAScenario = {
  id: "dsa-01-knapsack",
  title: "0/1 Knapsack Problem",
  type: "dsa",
  pattern: "dp-knapsack",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Microsoft", "Goldman Sachs"],
  description: "Maximize the value you can pack without exceeding the weight capacity",
  tags: ["dynamic-programming", "array"],
  estimatedTime: 30,
  problemStatement: `You're packing a knapsack that can hold at most W units of weight. There are n items to pick from; item i weighs weights[i] and is worth values[i].

Every item is a single indivisible object: you take it whole or leave it behind, and nothing can be taken twice. Return the highest total value the knapsack can carry without the combined weight going over W.`,
  examples: [
    {
      input: "weights = [2, 3, 4], values = [4, 5, 8], W = 6",
      output: "12",
      explanation: "Pack the items weighing 2 and 4 (values 4 + 8 = 12)",
    },
    {
      input: "weights = [2, 4, 5, 6], values = [2, 5, 6, 8], W = 9",
      output: "11",
      explanation:
        "Pack the items weighing 4 and 5 (values 5 + 6 = 11). Grabbing the value-8 item first caps you at 10.",
    },
  ],
  constraints: [
    "n stays between 1 and 100",
    "every weights[i] and values[i] lies between 1 and 1000",
    "W is at least 1 and at most 1000",
  ],
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
