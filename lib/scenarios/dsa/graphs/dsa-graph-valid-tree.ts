import type { DSAScenario } from "../../types"

export const graphValidTreeScenario: DSAScenario = {
  id: "dsa-graph-valid-tree",
  title: "Graph Valid Tree",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Determine if an undirected graph is a valid tree",
  tags: ["graph", "dfs", "bfs", "union-find"],
  estimatedTime: 25,
  problemStatement: `You have a graph of n nodes labeled from 0 to n - 1. You are given n and a list of edges where edges[i] = [ai, bi] indicates an undirected edge between nodes ai and bi. Return true if the edges form a valid tree, and false otherwise.`,
  examples: [
    { input: "n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]", output: "true" },
    {
      input: "n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]",
      output: "false",
      explanation: "There is a cycle: 1-2-3-1",
    },
  ],
  constraints: [
    "1 <= n <= 2000",
    "0 <= edges.length <= 5000",
    "edges[i].length == 2",
    "0 <= ai, bi < n",
    "ai != bi",
    "There are no self-loops or repeated edges",
  ],
  hints: [
    "A valid tree has exactly n-1 edges and is connected",
    "Check for cycles using DFS or Union-Find",
    "Verify all nodes are reachable from any starting node",
  ],
  starterCode: {
    javascript: `function validTree(n, edges) {\n  // Write your solution here\n\n}`,
    typescript: `function validTree(n: number, edges: number[][]): boolean {\n  // Write your solution here\n\n}`,
    python: `def validTree(n, edges):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(V + E)", space: "O(V + E)" },
  testCases: [
    {
      input: {
        n: 5,
        edges: [
          [0, 1],
          [0, 2],
          [0, 3],
          [1, 4],
        ],
      },
      expected: true,
      description: "Valid tree",
    },
    {
      input: {
        n: 5,
        edges: [
          [0, 1],
          [1, 2],
          [2, 3],
          [1, 3],
          [1, 4],
        ],
      },
      expected: false,
      description: "Has cycle",
    },
  ],
}
