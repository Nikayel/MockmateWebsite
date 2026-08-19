import type { DSAScenario } from "../../types"

export const surroundedRegionsScenario: DSAScenario = {
  id: "dsa-surrounded-regions",
  title: "Surrounded Regions",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Flip enclosed regions of 'O' cells to 'X' while border-connected regions survive",
  tags: ["array", "matrix", "dfs", "bfs", "union-find"],
  estimatedTime: 25,
  problemStatement: `You're editing an m x n character board named board, where every cell shows 'X' or 'O'. The 'O' cells clump together into regions: two 'O' cells belong to the same region when they share an edge, meaning one sits directly up, down, left, or right from the other.

A region counts as captured when 'X' cells hem it in completely and none of its cells lies on the outer border of the board. Rewrite every captured region entirely to 'X', modifying board in place. A region that includes even one border cell escapes capture and keeps all of its 'O's.

\`\`\`
Input                     Output
┌───┬───┬───┬───┐         ┌───┬───┬───┬───┐
│ X │ O │ X │ X │         │ X │ O │ X │ X │
├───┼───┼───┼───┤         ├───┼───┼───┼───┤
│ X │ O │ X │ X │         │ X │ O │ X │ X │
├───┼───┼───┼───┤         ├───┼───┼───┼───┤
│ X │ X │ O │ X │         │ X │ X │ X │ X │
├───┼───┼───┼───┤         ├───┼───┼───┼───┤
│ X │ X │ X │ X │         │ X │ X │ X │ X │
└───┴───┴───┴───┘         └───┴───┴───┴───┘
\`\`\`

The single 'O' in the third row is hemmed in on all four sides, so it flips. The column of two 'O's reaches the top edge, so that region survives untouched.`,
  examples: [
    {
      input: 'board = [["X","O","X","X"],["X","O","X","X"],["X","X","O","X"],["X","X","X","X"]]',
      output: '[["X","O","X","X"],["X","O","X","X"],["X","X","X","X"],["X","X","X","X"]]',
      explanation: "The enclosed 'O' flips to 'X'; the two 'O's linked to the top border are safe.",
    },
  ],
  constraints: [
    "board measures m rows by n columns, where 1 <= m, n <= 200",
    "each cell holds either 'X' or 'O'",
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
    // Neither case above has an interior O that survives, so flipping every interior cell,
    // and sparing only the O's sitting ON the border rather than those connected to one,
    // both passed. Here the middle O is interior but reaches the edge through (0, 1).
    {
      input: {
        board: [
          ["X", "O", "X"],
          ["X", "O", "X"],
          ["X", "X", "X"],
        ],
      },
      expected: [
        ["X", "O", "X"],
        ["X", "O", "X"],
        ["X", "X", "X"],
      ],
      description: "Interior O connected to the border survives",
    },
  ],
}
