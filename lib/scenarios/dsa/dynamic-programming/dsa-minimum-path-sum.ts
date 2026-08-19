import type { DSAScenario } from "../../types"

export const minimumPathSumScenario: DSAScenario = {
  id: "dsa-minimum-path-sum",
  title: "Minimum Path Sum",
  type: "dsa",
  pattern: "dp-2d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Goldman Sachs"],
  description: "Cross a grid corner to corner while collecting the smallest possible total",
  tags: ["dynamic-programming", "array", "matrix"],
  estimatedTime: 20,
  problemStatement: `You're standing on the top-left cell of an m x n grid, and every cell holds a non-negative number. You need to reach the bottom-right cell, and each move goes exactly one cell down or one cell right, never up or left.

Every cell you touch, the first and the last included, adds its number to your bill. In this grid the cheapest walk collects 3, 2, 1, 2, 3 for a bill of 11:

\`\`\`
3 9 9
2 1 8
7 2 3
\`\`\`

Return the smallest bill any legal walk through grid can achieve.`,
  examples: [
    {
      input: "grid = [[3,9,9],[2,1,8],[7,2,3]]",
      output: "11",
      explanation: "The walk 3 → 2 → 1 → 2 → 3 staircases through the middle and costs 11.",
    },
    {
      input: "grid = [[2,1,4],[3,2,1]]",
      output: "6",
    },
  ],
  constraints: [
    "grid has m rows and n columns.",
    "m and n each range from 1 to 200.",
    "Cell values are whole numbers from 0 through 200.",
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
