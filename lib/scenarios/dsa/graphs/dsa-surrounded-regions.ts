import type { DSAScenario } from "../../types"

export const surroundedRegionsScenario: DSAScenario = {
  id: "dsa-surrounded-regions",
  title: "Surrounded Regions",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Capture surrounded regions by flipping 'O' to 'X'",
  tags: ["array", "dfs", "bfs", "matrix", "union-find"],
  estimatedTime: 25,
  problemStatement: `Given an m x n matrix board containing 'X' and 'O', capture all regions that are 4-directionally surrounded by 'X'.

A region is captured by flipping all 'O's into 'X's in that surrounded region.

Example visualization:

  Input:                    Output:
  ┌───┬───┬───┬───┐         ┌───┬───┬───┬───┐
  │ X │ X │ X │ X │         │ X │ X │ X │ X │
  ├───┼───┼───┼───┤         ├───┼───┼───┼───┤
  │ X │ O │ O │ X │   →     │ X │ X │ X │ X │  (captured!)
  ├───┼───┼───┼───┤         ├───┼───┼───┼───┤
  │ X │ X │ O │ X │         │ X │ X │ X │ X │  (captured!)
  ├───┼───┼───┼───┤         ├───┼───┼───┼───┤
  │ X │ O │ X │ X │         │ X │ O │ X │ X │  (on border - safe)
  └───┴───┴───┴───┘         └───┴───┴───┴───┘

  Strategy: Mark border-connected O's as safe, flip the rest`,
  examples: [
    {
      input: 'board = [["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]]',
      output: '[["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]]',
      explanation: "The bottom 'O' is on the border, so it is not captured.",
    },
  ],
  constraints: [
    "m == board.length",
    "n == board[i].length",
    "1 <= m, n <= 200",
    "board[i][j] is 'X' or 'O'.",
  ],
  hints: [
    "Start from border 'O's - they cannot be captured",
    "Use DFS/BFS to mark all 'O's connected to borders",
    "Remaining 'O's are surrounded - flip them to 'X'",
  ],
  starterCode: {
    javascript: `function solve(board) {\n  // Write your solution here (modify board in-place)\n\n}`,
    typescript: `function solve(board: string[][]): void {\n  // Write your solution here\n\n}`,
    python: `def solve(board):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(m * n)", space: "O(m * n)" },
  testCases: [
    {
      input: {
        board: [
          ["X", "X", "X", "X"],
          ["X", "O", "O", "X"],
          ["X", "X", "O", "X"],
          ["X", "O", "X", "X"],
        ],
      },
      expected: [
        ["X", "X", "X", "X"],
        ["X", "X", "X", "X"],
        ["X", "X", "X", "X"],
        ["X", "O", "X", "X"],
      ],
      description: "Standard case",
    },
    {
      input: {
        board: [
          ["O", "O"],
          ["O", "O"],
        ],
      },
      expected: [
        ["O", "O"],
        ["O", "O"],
      ],
      description: "All border - none captured",
    },
  ],
}
