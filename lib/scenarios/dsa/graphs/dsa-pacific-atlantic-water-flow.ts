import type { DSAScenario } from "../../types"

export const pacificAtlanticWaterFlowScenario: DSAScenario = {
  id: "dsa-pacific-atlantic-water-flow",
  title: "Pacific Atlantic Water Flow",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Find every cell whose rainwater can drain to the Pacific and to the Atlantic",
  tags: ["array", "matrix", "dfs", "bfs"],
  estimatedTime: 30,
  problemStatement: `You're surveying a rectangular island whose terrain sits in an m x n integer matrix heights, where heights[r][c] gives the elevation of that cell above the sea. The Pacific washes the island's top and left coastlines, and the Atlantic meets the bottom and right ones.

Rain landing on a cell drains toward neighboring cells that share an edge with it (up, down, left, or right), but it can only move into a neighbor whose elevation is lower than or equal to the elevation it is leaving. Runoff that crosses the top or left boundary ends up in the Pacific; runoff that crosses the bottom or right boundary ends up in the Atlantic.

\`\`\`
Pacific ~ ~ ~ ~ ~ ~ ~ ~
      ~ ┌───┬───┬───┬───┐
      ~ │ 2 │ 3 │ 1 │ 4 │ ~
      ~ ├───┼───┼───┼───┤ ~
      ~ │ 5 │ 4 │ 3 │ 3 │ ~
      ~ ├───┼───┼───┼───┤ ~
      ~ │ 1 │ 6 │ 5 │ 2 │ ~
      ~ ├───┼───┼───┼───┤ ~
      ~ │ 3 │ 2 │ 7 │ 6 │ ~
        └───┴───┴───┴───┘ ~
        ~ ~ ~ ~ ~ ~ Atlantic
\`\`\`

Return the coordinates of every cell whose rain can finish in both oceans, each as a pair [r, c]. In the terrain above, the cell at [1, 0] qualifies: it already sits on the Pacific coast, and its runoff can step 5 to 4 to 3 to 3 across its row and spill into the Atlantic.`,
  examples: [
    {
      input: "heights = [[2,3,1,4],[5,4,3,3],[1,6,5,2],[3,2,7,6]]",
      output: "[[0,3],[1,0],[1,1],[1,2],[1,3],[2,1],[2,2],[3,0],[3,2]]",
    },
  ],
  constraints: [
    "heights has m rows and n columns, where 1 <= m, n <= 200",
    "every elevation obeys 0 <= heights[r][c] <= 10^5",
  ],
  hints: [
    "Start DFS/BFS from ocean borders instead of every cell",
    "Find cells reachable from Pacific, then from Atlantic",
    "Return intersection of both sets",
  ],
  starterCode: {
    javascript: `function pacificAtlantic(heights) {\n  // Write your solution here\n\n}`,
    typescript: `function pacificAtlantic(heights: number[][]): number[][] {\n  // Write your solution here\n\n}`,
    python: `def pacificAtlantic(heights):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(m * n)", space: "O(m * n)" },
  testCases: [
    {
      input: {
        heights: [
          [1, 2, 2, 3, 5],
          [3, 2, 3, 4, 4],
          [2, 4, 5, 3, 1],
          [6, 7, 1, 4, 5],
          [5, 1, 1, 2, 4],
        ],
      },
      expected: [
        [0, 4],
        [1, 3],
        [1, 4],
        [2, 2],
        [3, 0],
        [3, 1],
        [4, 0],
      ],
      description: "Multiple valid cells",
      compareAsSet: true,
    },
  ],
}
