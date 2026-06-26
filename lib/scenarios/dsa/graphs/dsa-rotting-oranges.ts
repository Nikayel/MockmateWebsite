import type { DSAScenario } from "../../types"

export const rottingOrangesScenario: DSAScenario = {
  id: "dsa-rotting-oranges",
  title: "Rotting Oranges",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Microsoft", "Google", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe", "fdse"],
  description: "Find minimum minutes for all oranges to rot using BFS",
  tags: ["array", "bfs", "matrix"],
  estimatedTime: 25,
  problemStatement: `You are given an m x n grid where 0 is an empty cell, 1 is a fresh orange, and 2 is a rotten orange. Every minute, any fresh orange adjacent (4-directionally) to a rotten orange becomes rotten. Return the minimum number of minutes that must elapse until no cell has a fresh orange. If impossible, return -1.

Example visualization:

  t=0          t=1          t=2          t=3          t=4
 ┌───┬───┬───┐ ┌───┬───┬───┐ ┌───┬───┬───┐ ┌───┬───┬───┐ ┌───┬───┬───┐
 │ 2 │ 1 │ 1 │ │ 2 │ 2 │ 1 │ │ 2 │ 2 │ 2 │ │ 2 │ 2 │ 2 │ │ 2 │ 2 │ 2 │
 ├───┼───┼───┤ ├───┼───┼───┤ ├───┼───┼───┤ ├───┼───┼───┤ ├───┼───┼───┤
 │ 1 │ 1 │ 0 │ │ 2 │ 1 │ 0 │ │ 2 │ 2 │ 0 │ │ 2 │ 2 │ 0 │ │ 2 │ 2 │ 0 │
 ├───┼───┼───┤ ├───┼───┼───┤ ├───┼───┼───┤ ├───┼───┼───┤ ├───┼───┼───┤
 │ 0 │ 1 │ 1 │ │ 0 │ 1 │ 1 │ │ 0 │ 2 │ 1 │ │ 0 │ 2 │ 2 │ │ 0 │ 2 │ 2 │
 └───┴───┴───┘ └───┴───┴───┘ └───┴───┴───┘ └───┴───┴───┘ └───┴───┴───┘

  0=empty, 1=fresh 🍊, 2=rotten 🟤
  Answer: 4 minutes`,
  examples: [
    { input: "grid = [[2,1,1],[1,1,0],[0,1,1]]", output: "4" },
    {
      input: "grid = [[2,1,1],[0,1,1],[1,0,1]]",
      output: "-1",
      explanation: "The orange in the bottom left corner is never reached.",
    },
    { input: "grid = [[0,2]]", output: "0", explanation: "No fresh oranges to rot." },
  ],
  constraints: [
    "m == grid.length",
    "n == grid[i].length",
    "1 <= m, n <= 10",
    "grid[i][j] is 0, 1, or 2",
  ],
  hints: [
    "Use multi-source BFS starting from all rotten oranges",
    "Count fresh oranges initially",
    "Track time/levels in BFS",
  ],
  starterCode: {
    javascript: `function orangesRotting(grid) {\n  // Write your solution here\n\n}`,
    typescript: `function orangesRotting(grid: number[][]): number {\n  // Write your solution here\n\n}`,
    python: `def orangesRotting(grid):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(m * n)", space: "O(m * n)" },
  testCases: [
    {
      input: {
        grid: [
          [2, 1, 1],
          [1, 1, 0],
          [0, 1, 1],
        ],
      },
      expected: 4,
      description: "All oranges rot",
    },
    {
      input: {
        grid: [
          [2, 1, 1],
          [0, 1, 1],
          [1, 0, 1],
        ],
      },
      expected: -1,
      description: "Impossible case",
    },
  ],
}
