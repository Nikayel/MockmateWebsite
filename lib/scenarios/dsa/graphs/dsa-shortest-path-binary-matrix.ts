import type { DSAScenario } from "../../types"

export const shortestPathBinaryMatrixScenario: DSAScenario = {
  id: "dsa-shortest-path-binary-matrix",
  title: "Shortest Path in Binary Matrix",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "Apple"],
  description: "Find shortest path from top-left to bottom-right in binary grid",
  tags: ["bfs", "matrix", "shortest-path"],
  estimatedTime: 20,
  problemStatement: `Given an n x n binary matrix grid, return the length of the shortest clear path from top-left to bottom-right. A clear path connects 0s and can move in 8 directions. Return -1 if no such path exists.

Example visualization:

  ┌───┬───┬───┐     8 directions:
  │ 0 │ 0 │ 0 │       ↖ ↑ ↗
  ├───┼───┼───┤       ← ● →
  │ 1 │ 1 │ 0 │       ↙ ↓ ↘
  ├───┼───┼───┤
  │ 1 │ 1 │ 0 │
  └───┴───┴───┘

  Path: (0,0) → (0,1) → (0,2) → (1,2) → (2,2)
  Length: 4 cells`,
  examples: [
    { input: "grid = [[0,1],[1,0]]", output: "2" },
    { input: "grid = [[0,0,0],[1,1,0],[1,1,0]]", output: "4" },
    {
      input: "grid = [[1,0,0],[1,1,0],[1,1,0]]",
      output: "-1",
      explanation: "Starting cell is blocked",
    },
  ],
  constraints: ["n == grid.length", "n == grid[i].length", "1 <= n <= 100", "grid[i][j] is 0 or 1"],
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
