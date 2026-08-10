import type { DSAScenario } from "../../types"

export const minimumPathSumScenario: DSAScenario = {
  id: "dsa-minimum-path-sum",
  title: "Minimum Path Sum",
  type: "dsa",
  pattern: "dp-2d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Goldman Sachs"],
  description: "Find minimum sum path from top-left to bottom-right in a grid",
  tags: ["dynamic-programming", "array", "matrix"],
  estimatedTime: 20,
  problemStatement: `Given a m x n grid filled with non-negative numbers, find a path from top left to bottom right, which minimizes the sum of all numbers along its path.

Note: You can only move either down or right at any point in time.`,
  examples: [
    {
      input: "grid = [[1,3,1],[1,5,1],[4,2,1]]",
      output: "7",
      explanation: "The path 1 → 3 → 1 → 1 → 1 minimizes the sum.",
    },
    {
      input: "grid = [[1,2,3],[4,5,6]]",
      output: "12",
    },
  ],
  constraints: [
    "m == grid.length",
    "n == grid[i].length",
    "1 <= m, n <= 200",
    "0 <= grid[i][j] <= 200",
  ],
  hints: [
    "dp[i][j] = minimum sum to reach cell (i,j)",
    "dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])",
    "First row/column only have one path to them",
    "Can optimize space to O(n) using 1D array",
  ],
  starterCode: {
    javascript: `function minPathSum(grid) {
// Write your solution here

}`,
    typescript: `function minPathSum(grid: number[][]): number {
// Write your solution here

}`,
    python: `def minPathSum(grid):
  # Write your solution here
  pass`,
  },
  optimalComplexity: { time: "O(m * n)", space: "O(n)" },
  testCases: [
    {
      input: {
        grid: [
          [1, 3, 1],
          [1, 5, 1],
          [4, 2, 1],
        ],
      },
      expected: 7,
      description: "3x3 grid",
    },
    {
      input: {
        grid: [
          [1, 2, 3],
          [4, 5, 6],
        ],
      },
      expected: 12,
      description: "2x3 grid",
    },
    { input: { grid: [[1]] }, expected: 1, description: "Single cell" },
    {
      input: {
        grid: [
          [1, 2],
          [1, 1],
        ],
      },
      expected: 3,
      description: "2x2 grid",
    },
    // In every grid above the cheapest route ran along an edge (across the top then down
    // the right side, or down the left then across the bottom), so a solution that only
    // priced those two paths passed. Here the cheap cells form a staircase through the
    // middle and both edge routes are far more expensive.
    {
      input: {
        grid: [
          [1, 9, 9],
          [1, 1, 9],
          [9, 1, 1],
        ],
      },
      expected: 5,
      description: "Cheapest route staircases through the middle, not along an edge",
    },
  ],
}
