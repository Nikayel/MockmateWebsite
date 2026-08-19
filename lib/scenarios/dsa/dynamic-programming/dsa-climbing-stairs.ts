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
  problemStatement: `You're standing at the bottom of a staircase that is n steps tall. Every stride you take moves you up by either 1 step or 2 steps.

Strides happen in order, so two climbs count as different whenever their stride sequences differ. How many distinct climbs can carry you from the ground to the top?`,
  examples: [
    {
      input: "n = 4",
      output: "5",
      explanation: "Five climbs work: 1+1+1+1, 1+1+2, 1+2+1, 2+1+1, and 2+2",
    },
    {
      input: "n = 5",
      output: "8",
      explanation:
        "Eight climbs: 1+1+1+1+1, four orders that use one 2-stride, and three orders that use two 2-strides",
    },
  ],
  constraints: ["n is at least 1 and at most 45"],
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
