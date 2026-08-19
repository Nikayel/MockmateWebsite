import type { DSAScenario } from "../../types"

export const shortestPathBinaryMatrixScenario: DSAScenario = {
  id: "dsa-shortest-path-binary-matrix",
  title: "Shortest Path in Binary Matrix",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "Apple", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description:
    "Count the cells on the shortest 8-directional walk across a grid of open and blocked cells",
  tags: ["bfs", "matrix", "shortest-path"],
  estimatedTime: 20,
  problemStatement: `You're navigating an n x n grid of cells named grid, each holding 0 (open) or 1 (blocked). Starting from the top left cell, you want to arrive at the bottom right cell while stepping only on open cells. A single step may take you to any of the 8 cells surrounding your current one, so sideways, vertical, and diagonal moves are all legal whenever the destination cell is open.

Count the cells on the shortest possible walk, the cell you start on and the cell you finish on both included, and return that count. If the top left or bottom right cell is blocked, or no walk connects them, return -1.

\`\`\`
┌───┬───┬───┐        the 8 ways to step
│ 0 │ 1 │ 1 │           ↖ ↑ ↗
├───┼───┼───┤           ← ● →
│ 0 │ 1 │ 1 │           ↙ ↓ ↘
├───┼───┼───┤
│ 0 │ 0 │ 0 │
└───┴───┴───┘
\`\`\`

Here one best walk is (0,0), (1,0), (2,1), (2,2): it touches 4 cells, so the answer is 4.`,
  examples: [
    { input: "grid = [[0,0],[0,0]]", output: "2" },
    { input: "grid = [[0,1,1],[0,1,1],[0,0,0]]", output: "4" },
    {
      input: "grid = [[1,0,0],[0,0,0],[0,0,0]]",
      output: "-1",
      explanation: "The walk can never begin, because the entry cell is blocked",
    },
  ],
  constraints: [
    "the grid is square: n rows and n columns, 1 <= n <= 100",
    "every cell of grid is either 0 or 1",
  ],
  hints: [
    "BFS from (0,0) - guarantees shortest path",
    "8 directions: horizontal, vertical, diagonal",
    "Track visited to avoid revisiting",
    "Check start and end cells first",
  ],
  starterCode: {
    javascript: `function shortestPathBinaryMatrix(grid) {\n  // BFS with 8 directions\n}`,
    typescript: `function shortestPathBinaryMatrix(grid: number[][]): number {\n  // BFS with 8 directions\n}`,
    python: `def shortestPathBinaryMatrix(grid: list[list[int]]) -> int:\n    # BFS with 8 directions\n    pass`,
    java: `class Solution {\n    public int shortestPathBinaryMatrix(int[][] grid) {\n        // BFS with 8 directions\n        return -1;\n    }\n}`,
  },
  optimalComplexity: { time: "O(n^2)", space: "O(n^2)" },
  testCases: [
    {
      input: {
        grid: [
          [0, 1],
          [1, 0],
        ],
      },
      expected: 2,
      description: "2x2 diagonal",
    },
    {
      input: {
        grid: [
          [0, 0, 0],
          [1, 1, 0],
          [1, 1, 0],
        ],
      },
      expected: 4,
      description: "Longer path",
    },
    {
      input: {
        grid: [
          [1, 0, 0],
          [1, 1, 0],
          [1, 1, 0],
        ],
      },
      expected: -1,
      description: "Blocked start",
    },
  ],
}
