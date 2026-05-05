import type { DSAScenario } from "../../types"

export const uniquePathsScenario: DSAScenario = {
  id: "dsa-unique-paths",
  title: "Unique Paths",
  type: "dsa",
  pattern: "dp-2d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Count unique paths from top-left to bottom-right in grid.",
  tags: ["dynamic-programming", "math", "combinatorics"],
  estimatedTime: 20,
  problemStatement: `There is a robot on an m x n grid. The robot starts at the top-left corner and wants to reach the bottom-right corner. The robot can only move down or right. How many unique paths are there?`,
  examples: [
    {
      input: "m = 3, n = 7",
      output: "28",
    },
    {
      input: "m = 3, n = 2",
      output: "3",
    },
  ],
  constraints: ["1 <= m, n <= 100"],
  hints: [
    "2D DP: dp[i][j] = paths to reach cell (i,j)",
    "dp[i][j] = dp[i-1][j] + dp[i][j-1]",
    "Can optimize space to O(n) using 1D array",
  ],
  starterCode: {
    javascript: `function uniquePaths(m, n) {
// Write your solution here

}`,
    python: `def uniquePaths(m: int, n: int) -> int:
  # Write your solution here
  pass`,
  },
  optimalComplexity: {
    time: "O(m * n)",
    space: "O(n)",
  },
  testCases: [
    {
      input: { m: 3, n: 7 },
      expected: 28,
      description: "3x7 grid",
    },
    {
      input: { m: 3, n: 2 },
      expected: 3,
      description: "3x2 grid: down-down-right, down-right-down, right-down-down",
    },
    {
      input: { m: 1, n: 1 },
      expected: 1,
      description: "Single cell grid",
    },
    {
      input: { m: 3, n: 3 },
      expected: 6,
      description: "3x3 grid",
    },
    {
      input: { m: 7, n: 3 },
      expected: 28,
      description: "7x3 grid (same as 3x7)",
    },
  ],
}
