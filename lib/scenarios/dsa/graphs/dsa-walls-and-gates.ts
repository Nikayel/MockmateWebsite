import type { DSAScenario } from "../../types"

export const wallsAndGatesScenario: DSAScenario = {
  id: "dsa-walls-and-gates",
  title: "Walls and Gates",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "DoorDash", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description:
    "Stamp every open room in a floor plan with its walking distance to the nearest gate",
  tags: ["matrix", "bfs", "multi-source-bfs"],
  estimatedTime: 25,
  problemStatement: `You're annotating the floor plan of a building, stored as an m x n grid called rooms. Every cell starts out as one of three values: -1 marks an impassable wall, 0 marks a gate, and 2147483647 (the largest 32-bit integer, drawn below as INF) marks an open room.

Update each open room in place so it holds the length of the shortest route from that room to any gate. A route moves one cell at a time to a cell sharing an edge (up, down, left, or right) and may pass through open rooms and gates but never through walls. An open room that no gate can reach keeps the value 2147483647.

\`\`\`
Input                      Output
┌────┬────┬────┬────┐      ┌────┬────┬────┬────┐
│ INF│ INF│ -1 │  0 │      │  2 │  3 │ -1 │  0 │
├────┼────┼────┼────┤      ├────┼────┼────┼────┤
│ INF│ -1 │ INF│ INF│      │  1 │ -1 │  2 │  1 │
├────┼────┼────┼────┤      ├────┼────┼────┼────┤
│  0 │ INF│ INF│ -1 │      │  0 │  1 │  2 │ -1 │
├────┼────┼────┼────┤      ├────┼────┼────┼────┤
│ INF│ INF│ INF│ INF│      │  1 │  2 │  3 │  4 │
└────┴────┴────┴────┘      └────┴────┴────┴────┘
\`\`\`

After the update, each open room shows the step count to its closest gate, while walls and gates keep their own markers.`,
  examples: [
    {
      input:
        "rooms = [[2147483647,2147483647,-1,0],[2147483647,-1,2147483647,2147483647],[0,2147483647,2147483647,-1],[2147483647,2147483647,2147483647,2147483647]]",
      output: "[[2,3,-1,0],[1,-1,2,1],[0,1,2,-1],[1,2,3,4]]",
    },
    {
      input: "rooms = [[2147483647]]",
      output: "[[2147483647]]",
      explanation: "A lone room with no gate anywhere keeps its INF value.",
    },
  ],
  constraints: [
    "rooms spans m rows and n columns, where 1 <= m, n <= 250",
    "each cell of rooms holds -1, 0, or 2147483647",
  ],
  hints: [
    "Start BFS from all gates simultaneously (multi-source BFS)",
    "Add all gates to initial queue",
    "BFS guarantees shortest distance to nearest gate",
    "Only update cells with INF value",
  ],
  starterCode: {
    javascript: `function wallsAndGates(rooms) {\n  // Write your solution here\n}`,
    typescript: `function wallsAndGates(rooms: number[][]): void {\n  // Write your solution here\n}`,
    python: `def wallsAndGates(rooms: list[list[int]]) -> None:\n    # Write your solution here\n    pass`,
    java: `class Solution {\n    public void wallsAndGates(int[][] rooms) {\n        // Write your solution here\n    }\n}`,
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
