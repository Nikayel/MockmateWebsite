import type { DSAScenario } from "../../types"

export const bestTimeBuySellStockIiScenario: DSAScenario = {
  id: "dsa-best-time-buy-sell-stock-ii",
  title: "Best Time to Buy and Sell Stock II",
  type: "dsa",
  pattern: "dp-1d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Maximize profit with unlimited transactions",
  tags: ["dynamic-programming", "array", "greedy"],
  estimatedTime: 20,
  problemStatement: `You are given an integer array prices where prices[i] is the price of a given stock on the ith day.

On each day, you may decide to buy and/or sell the stock. You can only hold at most one share of the stock at any time. However, you can buy it then immediately sell it on the same day.

Find and return the maximum profit you can achieve.`,
  examples: [
    {
      input: "prices = [7,1,5,3,6,4]",
      output: "7",
      explanation:
        "Buy on day 2 (price = 1) and sell on day 3 (price = 5), profit = 4. Then buy on day 4 (price = 3) and sell on day 5 (price = 6), profit = 3. Total = 7.",
    },
    {
      input: "prices = [1,2,3,4,5]",
      output: "4",
      explanation: "Buy on day 1 (price = 1) and sell on day 5 (price = 5), profit = 4.",
    },
    {
      input: "prices = [7,6,4,3,1]",
      output: "0",
      explanation: "No profitable transactions possible.",
    },
  ],
  constraints: ["1 <= prices.length <= 3 * 10^4", "0 <= prices[i] <= 10^4"],
  hints: [
    "Greedy: collect all upward price movements",
    "If prices[i] > prices[i-1], add the difference to profit",
    "Equivalent to buying every valley and selling every peak",
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
    { input: { prices: [7, 1, 5, 3, 6, 4] }, expected: 7, description: "Two transactions" },
    { input: { prices: [1, 2, 3, 4, 5] }, expected: 4, description: "One long transaction" },
    { input: { prices: [7, 6, 4, 3, 1] }, expected: 0, description: "No profit possible" },
  ],
}
