import type { DSAScenario } from "../../types"

export const climbingStairsScenario: DSAScenario = {
  id: "dsa-climbing-stairs",
  title: "Climbing Stairs",
  type: "dsa",
  pattern: "dp-1d",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta", "Apple"],
  description: "Calculate number of ways to climb stairs",
  tags: ["dynamic-programming", "math", "memoization"],
  estimatedTime: 15,
  problemStatement: `You are climbing a staircase. It takes n steps to reach the top.

Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?`,
  examples: [
    {
      input: "n = 2",
      output: "2",
      explanation: "There are two ways to climb to the top: 1. 1 step + 1 step, 2. 2 steps",
    },
    {
      input: "n = 3",
      output: "3",
      explanation: "There are three ways: 1. 1+1+1, 2. 1+2, 3. 2+1",
    },
  ],
  constraints: ["1 <= n <= 45"],
  hints: [
    "This is a Fibonacci sequence problem",
    "dp[i] = dp[i-1] + dp[i-2]",
    "You can optimize space to O(1) by only keeping track of the last two values",
  ],
  starterCode: {
    javascript: `function climbStairs(n) {
// Write your solution here

}`,
    typescript: `function climbStairs(n: number): number {
// Write your solution here

}`,
    python: `def climbStairs(n):
  # Write your solution here
  pass`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { n: 2 },
      expected: 2,
      description: "2 steps: [1+1, 2]",
    },
    {
      input: { n: 3 },
      expected: 3,
      description: "3 steps: [1+1+1, 1+2, 2+1]",
    },
    {
      input: { n: 1 },
      expected: 1,
      description: "Single step",
    },
    {
      input: { n: 5 },
      expected: 8,
      description: "5 steps: Fibonacci(5) = 8",
    },
    {
      input: { n: 10 },
      expected: 89,
      description: "10 steps: Fibonacci(10) = 89",
    },
  ],
}
