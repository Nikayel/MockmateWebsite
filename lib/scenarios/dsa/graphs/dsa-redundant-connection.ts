import type { DSAScenario } from "../../types"

export const redundantConnectionScenario: DSAScenario = {
  id: "dsa-redundant-connection",
  title: "Redundant Connection",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Palantir"],
  roles: ["junior", "senior", "swe"],
  description: "Find the edge that creates a cycle using Union-Find",
  tags: ["graph", "union-find", "dfs"],
  estimatedTime: 25,
  problemStatement: `You are given a graph that started as a tree with n nodes, with one additional edge added. Return an edge that can be removed so that the resulting graph is a tree. If there are multiple answers, return the one that occurs last in the input.`,
  examples: [
    { input: "edges = [[1,2],[1,3],[2,3]]", output: "[2,3]" },
    { input: "edges = [[1,2],[2,3],[3,4],[1,4],[1,5]]", output: "[1,4]" },
  ],
  constraints: ["n == edges.length", "3 <= n <= 1000", "1 <= ai < bi <= n"],
  hints: [
    "Use Union-Find to detect when adding edge creates cycle",
    "Return last edge where both nodes have same root",
  ],
  starterCode: {
    javascript: `function findRedundantConnection(edges) {\n  // Write your solution here\n\n}`,
    typescript: `function findRedundantConnection(edges: number[][]): number[] {\n  // Write your solution here\n\n}`,
    python: `def findRedundantConnection(edges):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n * α(n))", space: "O(n)" },
  testCases: [
    {
      input: {
        edges: [
          [1, 2],
          [1, 3],
          [2, 3],
        ],
      },
      expected: [2, 3],
      description: "Triangle",
    },
    {
      input: {
        edges: [
          [1, 2],
          [2, 3],
          [3, 4],
          [1, 4],
          [1, 5],
        ],
      },
      expected: [1, 4],
      description: "Square with tail",
    },
    // In both cases above the cycle-closing edge also happened to touch the highest-degree
    // nodes, so "return the edge whose endpoints have the most connections" passed. Here
    // the hub (node 1) sits outside the cycle, so that heuristic picks [1, 5] instead.
    {
      input: {
        edges: [
          [1, 2],
          [1, 3],
          [1, 4],
          [1, 5],
          [5, 6],
          [6, 7],
          [5, 7],
        ],
      },
      expected: [5, 7],
      description: "Cycle sits away from the highest-degree node",
    },
  ],
}
