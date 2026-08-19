import type { DSAScenario } from "../../types"

export const coinChangeScenario: DSAScenario = {
  id: "dsa-coin-change",
  title: "Coin Change",
  type: "dsa",
  pattern: "dp-knapsack",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Apple", "Oracle"],
  description: "Find minimum number of coins needed to make amount",
  tags: ["dynamic-programming", "breadth-first-search"],
  estimatedTime: 25,
  problemStatement: `You're handed the integer array coins, listing the denominations minted in some currency, together with a target value amount. The till holds an unlimited supply of every denomination, so one coin value may be reused as many times as you like.

Figure out the smallest number of coins whose values add up to amount exactly, and return that count. When no combination of these denominations can land exactly on amount, return -1. An amount of 0 needs no coins at all.`,
  examples: [
    {
      input: "coins = [1,4,6], amount = 14",
      output: "3",
      explanation: "14 = 6 + 4 + 4. Starting with two 6s forces 6 + 6 + 1 + 1, a coin worse.",
    },
    {
      input: "coins = [5], amount = 7",
      output: "-1",
    },
    {
      input: "coins = [3], amount = 0",
      output: "0",
    },
  ],
  constraints: [
    "coins holds between 1 and 12 denominations",
    "each coins[i] is at least 1 and at most 2^31 - 1",
    "amount runs from 0 up to 10^4",
  ],
  hints: [
    "Use dynamic programming with dp[i] = minimum coins for amount i",
    "For each amount, try all coin denominations",
    "dp[i] = min(dp[i], dp[i-coin] + 1)",
  ],
  starterCode: {
    javascript: `function coinChange(coins, amount) {
// Write your solution here

}`,
    typescript: `function coinChange(coins: number[], amount: number): number {
// Write your solution here

}`,
    python: `def coinChange(coins, amount):
  # Write your solution here
  pass`,
  },
  optimalComplexity: {
    time: "O(amount * coins.length)",
    space: "O(amount)",
  },
  testCases: [
    {
      input: { coins: [1, 2, 5], amount: 11 },
      expected: 3,
      description: "11 = 5 + 5 + 1",
    },
    {
      input: { coins: [2], amount: 3 },
      expected: -1,
      description: "Cannot make amount 3 with only coin 2",
    },
    {
      input: { coins: [1], amount: 0 },
      expected: 0,
      description: "Amount 0 requires 0 coins",
    },
    {
      input: { coins: [1, 2, 5], amount: 100 },
      expected: 20,
      description: "100 = 20 coins of 5",
    },
    {
      input: { coins: [1, 3, 4, 5], amount: 7 },
      expected: 2,
      description: "7 = 3 + 4",
    },
  ],
}
