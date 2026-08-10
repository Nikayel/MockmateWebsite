import type { DSAScenario } from "../../types"

export const wallsAndGatesScenario: DSAScenario = {
  id: "dsa-walls-and-gates",
  title: "Walls and Gates",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "DoorDash", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Fill each empty room with distance to nearest gate using multi-source BFS",
  tags: ["bfs", "matrix", "multi-source-bfs"],
  estimatedTime: 25,
  problemStatement: `You are given an m x n grid rooms initialized with:
- -1: A wall or obstacle
- 0: A gate
- INF (2147483647): An empty room

Fill each empty room with the distance to its nearest gate. If impossible, leave as INF.

Example:

\`\`\`
Input                      Output
┌────┬────┬────┬────┐      ┌────┬────┬────┬────┐
│ INF│ -1 │  0 │ INF│      │  3 │ -1 │  0 │  1 │
├────┼────┼────┼────┤      ├────┼────┼────┼────┤
│ INF│ INF│ INF│ -1 │      │  2 │  2 │  1 │ -1 │
├────┼────┼────┼────┤      ├────┼────┼────┼────┤
│ INF│ -1 │ INF│ -1 │      │  1 │ -1 │  2 │ -1 │
├────┼────┼────┼────┤      ├────┼────┼────┼────┤
│  0 │ -1 │ INF│ INF│      │  0 │ -1 │  3 │  4 │
└────┴────┴────┴────┘      └────┴────┴────┴────┘
\`\`\`

Each room holds its distance to the closest gate, counted through empty rooms only.`,
  examples: [
    {
      input:
        "rooms = [[2147483647,-1,0,2147483647],[2147483647,2147483647,2147483647,-1],[2147483647,-1,2147483647,-1],[0,-1,2147483647,2147483647]]",
      output: "[[3,-1,0,1],[2,2,1,-1],[1,-1,2,-1],[0,-1,3,4]]",
    },
    { input: "rooms = [[-1]]", output: "[[-1]]" },
  ],
  constraints: [
    "m == rooms.length",
    "n == rooms[i].length",
    "1 <= m, n <= 250",
    "rooms[i][j] is -1, 0, or 2147483647",
  ],
  hints: [
    "Start BFS from all gates simultaneously (multi-source BFS)",
    "Add all gates to initial queue",
    "BFS guarantees shortest distance to nearest gate",
    "Only update cells with INF value",
  ],
  starterCode: {
    javascript: `function wallsAndGates(rooms) {\n  // Multi-source BFS from all gates\n}`,
    typescript: `function wallsAndGates(rooms: number[][]): void {\n  // Multi-source BFS from all gates\n}`,
    python: `def wallsAndGates(rooms: list[list[int]]) -> None:\n    # Multi-source BFS from all gates\n    pass`,
    java: `class Solution {\n    public void wallsAndGates(int[][] rooms) {\n        // Multi-source BFS from all gates\n    }\n}`,
  },
  optimalComplexity: { time: "O(m * n)", space: "O(m * n)" },
  testCases: [
    {
      input: {
        rooms: [
          [2147483647, -1, 0, 2147483647],
          [2147483647, 2147483647, 2147483647, -1],
          [2147483647, -1, 2147483647, -1],
          [0, -1, 2147483647, 2147483647],
        ],
      },
      expected: [
        [3, -1, 0, 1],
        [2, 2, 1, -1],
        [1, -1, 2, -1],
        [0, -1, 3, 4],
      ],
      description: "Standard grid",
    },
  ],
}
