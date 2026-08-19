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
  problemStatement: `You're working with n nodes, labeled 0 through n - 1, and a collection edges where each entry edges[i] = [ai, bi] represents a two-way link between nodes ai and bi.

Decide whether these links assemble the nodes into a valid tree, and return true or false. To qualify as a tree, the structure must hang together as one connected piece covering all n nodes, and it must contain no cycle anywhere.`,
  examples: [
    { input: "n = 4, edges = [[0,1],[1,2],[1,3]]", output: "true" },
    {
      input: "n = 5, edges = [[0,1],[1,2],[2,4],[4,1],[0,3]]",
      output: "false",
      explanation: "Nodes 1, 2, and 4 close a loop: 1-2-4-1",
    },
  ],
  constraints: [
    "n lies between 1 and 2000.",
    "edges.length lies between 0 and 5000.",
    "Each edge entry names exactly 2 endpoints.",
    "Endpoints ai and bi are at least 0 and strictly less than n.",
    "A link never joins a node to itself (ai != bi).",
    "Duplicate connections and self-loops never appear.",
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
    // A tree needs BOTH properties: acyclic and connected. The two cases above are decided
    // by the cycle alone, so a cycle-check-only solution and an edge-count-only solution
    // each passed. These split the two properties apart.
    {
      input: {
        n: 4,
        edges: [
          [0, 1],
          [2, 3],
        ],
      },
      expected: false,
      description: "Acyclic but disconnected: a forest is not a tree",
    },
    {
      input: {
        n: 4,
        edges: [
          [0, 1],
          [1, 2],
          [0, 2],
        ],
      },
      expected: false,
      description: "Exactly n-1 edges, but a cycle plus an isolated node",
    },
  ],
}
