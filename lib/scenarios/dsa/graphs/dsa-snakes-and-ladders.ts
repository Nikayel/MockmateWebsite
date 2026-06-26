import type { DSAScenario } from "../../types"

export const snakesAndLaddersScenario: DSAScenario = {
  id: "dsa-snakes-and-ladders",
  title: "Snakes and Ladders",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe", "fdse"],
  description: "Find minimum moves to reach end of snakes and ladders board",
  tags: ["bfs", "matrix", "simulation"],
  estimatedTime: 30,
  problemStatement: `You are given an n x n board labeled from 1 to n^2 in Boustrophedon style (alternating left-to-right and right-to-left per row, starting from bottom-left). board[r][c] = -1 means no snake/ladder, otherwise it's the destination square.

Return minimum number of moves to reach square n^2 starting from 1, or -1 if impossible.`,
  examples: [
    {
      input:
        "board = [[-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1],[-1,35,-1,-1,13,-1],[-1,-1,-1,-1,-1,-1],[-1,15,-1,-1,-1,-1]]",
      output: "4",
      explanation: "1 -> 2 -> 15 -> 35 -> 36",
    },
    { input: "board = [[-1,-1],[-1,3]]", output: "1" },
  ],
  constraints: [
    "n == board.length == board[i].length",
    "2 <= n <= 20",
    "board[i][j] is -1 or in [1, n^2]",
  ],
  hints: [
    "BFS from square 1",
    "Convert square number to (row, col) considering Boustrophedon",
    "For each move, try all dice rolls 1-6",
    "Follow snake/ladder if present",
  ],
  starterCode: {
    javascript: `function snakesAndLadders(board) {\n  // BFS with board position conversion\n}`,
    typescript: `function snakesAndLadders(board: number[][]): number {\n  // BFS with board position conversion\n}`,
    python: `def snakesAndLadders(board: list[list[int]]) -> int:\n    # BFS with board position conversion\n    pass`,
    java: `class Solution {\n    public int snakesAndLadders(int[][] board) {\n        // BFS with board position conversion\n        return -1;\n    }\n}`,
  },
  optimalComplexity: { time: "O(n^2)", space: "O(n^2)" },
  testCases: [
    {
      input: {
        board: [
          [-1, -1, -1, -1, -1, -1],
          [-1, -1, -1, -1, -1, -1],
          [-1, -1, -1, -1, -1, -1],
          [-1, 35, -1, -1, 13, -1],
          [-1, -1, -1, -1, -1, -1],
          [-1, 15, -1, -1, -1, -1],
        ],
      },
      expected: 4,
      description: "With ladders",
    },
  ],
}
