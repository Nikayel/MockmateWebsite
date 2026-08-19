import type { DSAScenario } from "../../types"

export const minCostConnectPointsScenario: DSAScenario = {
  id: "dsa-min-cost-connect-points",
  title: "Min Cost to Connect All Points",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Microsoft", "Palantir"],
  roles: ["junior", "senior", "swe"],
  description: "Connect all points at minimum total Manhattan-distance cost",
  tags: ["graph", "union-find", "minimum-spanning-tree"],
  estimatedTime: 30,
  problemStatement: `You're laying wire between locations on a 2D plane. Each points[i] = [xi, yi] gives one location's integer coordinates, no two locations share a spot, and joining two locations costs their Manhattan distance: |xi - xj| + |yi - yj|, the horizontal gap plus the vertical gap.

Wire the network so that every location can reach every other, directly or through intermediate locations, with exactly one simple route between any pair. Return the smallest total cost of wire that achieves this.`,
  examples: [{ input: "points = [[0,0],[3,0],[3,4],[7,4],[0,3]]", output: "14" }],
  constraints: [
    "points holds between 1 and 1000 locations.",
    "Every coordinate xi, yi lies in the range -10^6 to 10^6.",
  ],
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
