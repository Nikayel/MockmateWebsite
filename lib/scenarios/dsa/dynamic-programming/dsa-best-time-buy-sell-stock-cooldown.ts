import type { DSAScenario } from "../../types"

export const bestTimeBuySellStockCooldownScenario: DSAScenario = {
  id: "dsa-best-time-buy-sell-stock-cooldown",
  title: "Best Time to Buy and Sell Stock with Cooldown",
  type: "dsa",
  pattern: "dp-1d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Maximize profit with cooldown period after selling",
  tags: ["array", "dynamic-programming"],
  estimatedTime: 30,
  problemStatement: `You're trading one stock across several days, and prices[i] is its price on day i. You can buy a share and later sell it, over as many rounds as you like, but you can hold at most one share at a time, so a new purchase has to wait until the share you hold is sold.

One extra rule applies: every sale triggers a cooldown. On the day immediately after you sell, buying is forbidden; the earliest you can buy again is the day after that.

Return the largest total profit these rules allow.`,
  examples: [
    {
      input: "prices = [2,3,4,1,3]",
      output: "3",
      explanation:
        "Buy on day 1, sell on day 2 for +1. Sit out day 3 (cooldown), buy on day 4, sell on day 5 for +2.",
    },
    {
      input: "prices = [6]",
      output: "0",
    },
  ],
  constraints: ["prices spans between 1 and 5000 days", "each prices[i] sits between 0 and 1000"],
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
