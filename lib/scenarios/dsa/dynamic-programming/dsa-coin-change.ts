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
  problemStatement: `You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.

You may assume that you have an infinite number of each kind of coin.`,
  examples: [
    {
      input: "coins = [1,2,5], amount = 11",
      output: "3",
      explanation: "11 = 5 + 5 + 1",
    },
    {
      input: "coins = [2], amount = 3",
      output: "-1",
    },
    {
      input: "coins = [1], amount = 0",
      output: "0",
    },
  ],
  constraints: ["1 <= coins.length <= 12", "1 <= coins[i] <= 2^31 - 1", "0 <= amount <= 10^4"],
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
