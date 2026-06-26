import type { DSAScenario } from "../../types"

export const minCostConnectPointsScenario: DSAScenario = {
  id: "dsa-min-cost-connect-points",
  title: "Min Cost to Connect All Points",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Microsoft", "Palantir"],
  roles: ["junior", "senior", "swe"],
  description: "Find minimum spanning tree cost using Prim's or Kruskal's",
  tags: ["graph", "union-find", "minimum-spanning-tree"],
  estimatedTime: 30,
  problemStatement: `Return the minimum cost to make all points connected using Manhattan distance.`,
  examples: [{ input: "points = [[0,0],[2,2],[3,10],[5,2],[7,0]]", output: "20" }],
  constraints: ["1 <= points.length <= 1000", "-10^6 <= xi, yi <= 10^6"],
  hints: ["MST problem - use Prim's or Kruskal's algorithm"],
  starterCode: {
    javascript: `function minCostConnectPoints(points) {\n  // Write your solution here\n\n}`,
    typescript: `function minCostConnectPoints(points: number[][]): number {\n  // Write your solution here\n\n}`,
    python: `def minCostConnectPoints(points):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n^2 log n)", space: "O(n^2)" },
  testCases: [
    {
      input: {
        points: [
          [0, 0],
          [2, 2],
          [3, 10],
          [5, 2],
          [7, 0],
        ],
      },
      expected: 20,
      description: "Five points",
    },
    {
      input: {
        points: [
          [0, 0],
          [1, 1],
        ],
      },
      expected: 2,
      description: "Two points",
    },
  ],
}
