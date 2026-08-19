import type { DSAScenario } from "../../types"

export const bestTimeBuySellStockIiScenario: DSAScenario = {
  id: "dsa-best-time-buy-sell-stock-ii",
  title: "Best Time to Buy and Sell Stock II",
  type: "dsa",
  pattern: "dp-1d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Maximize profit with unlimited transactions",
  tags: ["array", "dynamic-programming", "greedy"],
  estimatedTime: 20,
  problemStatement: `You're day-trading a single stock, and the integer array prices records it day by day: prices[i] is the price on day i.

Each day you may buy one share, sell the share you're holding, or do nothing, and selling then buying back on the very same day is allowed. You can never hold more than one share at a time, but there's no cap on how many trades you make overall.

Return the biggest total profit you can finish with.`,
  examples: [
    {
      input: "prices = [8,2,6,3,9,5]",
      output: "10",
      explanation:
        "Buy on day 2 (price = 2) and sell on day 3 (price = 6), gain = 4. Then buy on day 4 (price = 3) and sell on day 5 (price = 9), gain = 6. Total = 10.",
    },
    {
      input: "prices = [2,3,5,8]",
      output: "6",
      explanation:
        "The price only climbs, so buy on day 1 (price = 2) and sell on day 4 (price = 8), gain = 6.",
    },
    {
      input: "prices = [9,7,5,2]",
      output: "0",
      explanation: "The price never rises, so the best move is to stay out entirely.",
    },
  ],
  constraints: [
    "there are between 1 and 3 * 10^4 trading days in prices",
    "every price sits between 0 and 10^4",
  ],
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
