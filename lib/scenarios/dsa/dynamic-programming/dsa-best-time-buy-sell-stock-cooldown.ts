import type { DSAScenario } from "../../types"

export const bestTimeBuySellStockCooldownScenario: DSAScenario = {
  id: "dsa-best-time-buy-sell-stock-cooldown",
  title: "Best Time to Buy and Sell Stock with Cooldown",
  type: "dsa",
  pattern: "dp-1d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Maximize profit with cooldown period after selling",
  tags: ["dynamic-programming", "array"],
  estimatedTime: 30,
  problemStatement: `You are given an array prices where prices[i] is the price of a given stock on the ith day.

Find the maximum profit you can achieve. You may complete as many transactions as you like with the following restrictions:

- After you sell your stock, you cannot buy stock on the next day (i.e., cooldown one day).

Note: You may not engage in multiple transactions simultaneously (i.e., you must sell the stock before you buy again).`,
  examples: [
    {
      input: "prices = [1,2,3,0,2]",
      output: "3",
      explanation: "Buy on day 1, sell on day 2. Cooldown on day 3. Buy on day 4, sell on day 5.",
    },
    {
      input: "prices = [1]",
      output: "0",
    },
  ],
  constraints: ["1 <= prices.length <= 5000", "0 <= prices[i] <= 1000"],
  hints: [
    "State machine approach: hold, sold, rest",
    "hold[i] = max(hold[i-1], rest[i-1] - prices[i])",
    "sold[i] = hold[i-1] + prices[i]",
    "rest[i] = max(rest[i-1], sold[i-1])",
  ],
  starterCode: {
    javascript: `function maxProfit(prices) {
// Write your solution here

}`,
    typescript: `function maxProfit(prices: number[]): number {
// Write your solution here

}`,
    python: `def maxProfit(prices):
  # Write your solution here
  pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    { input: { prices: [1, 2, 3, 0, 2] }, expected: 3, description: "With cooldown" },
    { input: { prices: [1] }, expected: 0, description: "Single day" },
    { input: { prices: [1, 2] }, expected: 1, description: "Simple profit" },
    // In every case above the answer happened to equal max(prices) - min(prices), so that
    // one-liner passed. It only works when the low comes first: here the high does, and no
    // profitable trade exists at all.
    {
      input: { prices: [5, 1] },
      expected: 0,
      description: "Price only falls: the high comes before the low",
    },
  ],
}
