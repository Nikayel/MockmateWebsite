import type { DSAScenario } from "../../types"

export const uniquePathsScenario: DSAScenario = {
  id: "dsa-unique-paths",
  title: "Unique Paths",
  type: "dsa",
  pattern: "dp-2d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Count every distinct down-and-right route across an m x n grid.",
  tags: ["dynamic-programming", "math", "combinatorics"],
  estimatedTime: 20,
  problemStatement: `You've parked a delivery robot on the top-left square of an m x n grid, and its charging dock sits on the bottom-right square. The robot's firmware allows exactly two moves: one square down or one square right. It can never back up or drift left.

Count the distinct routes the robot could take from its starting square to the dock, and return that number.`,
  examples: [
    {
      input: "m = 3, n = 4",
      output: "10",
    },
    {
      input: "m = 2, n = 2",
      output: "2",
    },
  ],
  constraints: ["m and n each fall between 1 and 100."],
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
