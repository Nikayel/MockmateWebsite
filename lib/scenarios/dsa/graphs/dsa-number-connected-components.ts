import type { DSAScenario } from "../../types"

export const numberConnectedComponentsScenario: DSAScenario = {
  id: "dsa-number-connected-components",
  title: "Number of Connected Components in an Undirected Graph",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "LinkedIn", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Count connected components using Union-Find or DFS",
  tags: ["graph", "union-find", "dfs", "bfs"],
  estimatedTime: 20,
  problemStatement: `You have a graph of n nodes. You are given an integer n and an array edges where edges[i] = [ai, bi] indicates an undirected edge between ai and bi.

Return the number of connected components in the graph.`,
  examples: [
    {
      input: "n = 5, edges = [[0,1],[1,2],[3,4]]",
      output: "2",
      explanation: "Component 1: {0,1,2}, Component 2: {3,4}",
    },
    { input: "n = 5, edges = [[0,1],[1,2],[2,3],[3,4]]", output: "1" },
  ],
  constraints: ["1 <= n <= 2000", "1 <= edges.length <= 5000", "0 <= ai, bi < n"],
  hints: [
    "Union-Find: Initially n components, decrement when unioning",
    "DFS/BFS: Count traversal starts",
  ],
  starterCode: {
    javascript: `function countComponents(n, edges) {\n  // Write your solution here\n\n}`,
    typescript: `function countComponents(n: number, edges: number[][]): number {\n  // Write your solution here\n\n}`,
    python: `def countComponents(n, edges):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(E * α(n))", space: "O(n)" },
  testCases: [
    {
      input: {
        n: 5,
        edges: [
          [0, 1],
          [1, 2],
          [3, 4],
        ],
      },
      expected: 2,
      description: "Two components",
    },
    {
      input: {
        n: 5,
        edges: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
        ],
      },
      expected: 1,
      description: "One component",
    },
    { input: { n: 5, edges: [] }, expected: 5, description: "No edges" },
  ],
}
