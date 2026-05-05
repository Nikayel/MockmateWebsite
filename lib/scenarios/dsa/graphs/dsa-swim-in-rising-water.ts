import type { DSAScenario } from "../../types"

export const swimInRisingWaterScenario: DSAScenario = {
  id: "dsa-swim-in-rising-water",
  title: "Swim in Rising Water",
  type: "dsa",
  pattern: "graphs",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta"],
  description: "Find minimum time to swim from top-left to bottom-right",
  tags: ["graph", "binary-search", "heap", "union-find"],
  estimatedTime: 35,
  problemStatement: `At time t, water depth everywhere is t. You can swim between adjacent cells if both elevations <= t. Return minimum time to reach (n-1, n-1) from (0, 0).`,
  examples: [{ input: "grid = [[0,2],[1,3]]", output: "3" }],
  constraints: ["n == grid.length", "1 <= n <= 50", "0 <= grid[i][j] < n^2"],
  hints: ["Binary search + DFS/BFS", "Dijkstra with max elevation", "Union-Find by elevation"],
  starterCode: {
    javascript: `function swimInWater(grid) {\n  // Write your solution here\n\n}`,
    typescript: `function swimInWater(grid: number[][]): number {\n  // Write your solution here\n\n}`,
    python: `def swimInWater(grid):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n^2 log n)", space: "O(n^2)" },
  testCases: [
    {
      input: {
        grid: [
          [0, 2],
          [1, 3],
        ],
      },
      expected: 3,
      description: "2x2 grid",
    },
    { input: { grid: [[0]] }, expected: 0, description: "Single cell" },
  ],
}
