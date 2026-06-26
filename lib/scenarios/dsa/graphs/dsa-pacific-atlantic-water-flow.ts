import type { DSAScenario } from "../../types"

export const pacificAtlanticWaterFlowScenario: DSAScenario = {
  id: "dsa-pacific-atlantic-water-flow",
  title: "Pacific Atlantic Water Flow",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Find cells that can flow to both Pacific and Atlantic oceans",
  tags: ["array", "dfs", "bfs", "matrix"],
  estimatedTime: 30,
  problemStatement: `There is an m x n rectangular island that borders both the Pacific Ocean and Atlantic Ocean. The Pacific Ocean touches the top and left edges. The Atlantic Ocean touches the bottom and right edges. You are given an m x n integer matrix heights where heights[r][c] is the height above sea level. Water can flow from a cell to adjacent cells (up, down, left, right) if the adjacent cell's height is <= the current cell's height. Return a list of all cells that can flow to both the Pacific and Atlantic oceans.`,
  examples: [
    {
      input: "heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]",
      output: "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]",
    },
  ],
  constraints: [
    "m == heights.length",
    "n == heights[r].length",
    "1 <= m, n <= 200",
    "0 <= heights[r][c] <= 10^5",
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
