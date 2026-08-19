import type { DSAScenario } from "../../types"

export const snakesAndLaddersScenario: DSAScenario = {
  id: "dsa-snakes-and-ladders",
  title: "Snakes and Ladders",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe", "fdse"],
  description: "Count the fewest die moves needed to finish a snakes and ladders board",
  tags: ["bfs", "matrix", "simulation"],
  estimatedTime: 30,
  problemStatement: `You're playing a solo round of snakes and ladders on an n x n matrix named board. Its squares carry labels 1 through n^2 laid out in a back-and-forth pattern: label 1 occupies the bottom left corner, the bottom row is numbered left to right, the row above it right to left, and the direction keeps flipping on every row up the board.

\`\`\`
36 35 34 33 32 31
25 26 27 28 29 30
24 23 22 21 20 19
13 14 15 16 17 18
12 11 10  9  8  7
 1  2  3  4  5  6
\`\`\`

Your piece begins on square 1. Each move, you advance it to any square labeled curr+1 through min(curr+6, n^2), as though you rolled a six-sided die and chose how far to go. Whenever the square you stop on stores a value other than -1, a snake or ladder lives there, and it immediately carries your piece to the square that value names; a -1 marks a plain square. At most one snake or ladder is followed per move, so if one delivers you onto the mouth of another, the second stays unused until a later move lands there again.

Return the fewest moves that put your piece exactly on square n^2, or -1 if that square can never be reached.`,
  examples: [
    {
      input:
        "board = [[-1,-1,-1,-1,-1,-1],[-1,-1,9,-1,-1,-1],[-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1],[-1,-1,22,-1,-1,-1]]",
      output: "4",
      explanation:
        "Move onto square 3 and ride its ladder up to 22, then stop on 28, 34, and finally 36.",
    },
    { input: "board = [[-1,4],[-1,-1]]", output: "1" },
  ],
  constraints: [
    "board is square, with 2 <= n <= 20 rows and columns",
    "every square stores -1 or a label between 1 and n^2",
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
    // The board above places its ladders where the row-reversal does not change which
    // square a cell holds, so a solution that numbered the board left-to-right on every
    // row (instead of boustrophedon) still passed. Here the only ladder sits on square 8,
    // which the naive numbering reads as square 5: reachable one roll sooner, so that
    // solution answers 1 instead of 2.
    {
      input: {
        board: [
          [-1, -1, -1, -1],
          [-1, -1, -1, -1],
          [16, -1, -1, -1],
          [-1, -1, -1, -1],
        ],
      },
      expected: 2,
      description: "Ladder placement depends on the boustrophedon numbering",
    },
  ],
}
