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
  problemStatement: `You're handed a headcount and a wiring list: n nodes labeled 0 through n - 1, plus an array edges where each entry edges[i] = [ai, bi] joins nodes ai and bi in both directions.

Those links may or may not tie the whole graph together. Return the number of connected components, where a component is a group of nodes that can all reach one another by walking edges. A node touching no edge counts as a component of its own.`,
  examples: [
    {
      input: "n = 6, edges = [[0,2],[2,4],[1,5]]",
      output: "3",
      explanation: "The three groups are {0,2,4}, {1,5}, and node 3 by itself",
    },
    { input: "n = 4, edges = [[2,3],[0,3],[1,2]]", output: "1" },
  ],
  constraints: [
    "node count stays within 1 <= n <= 2000",
    "the list holds 1 <= edges.length <= 5000 pairs",
    "endpoints stay in range: 0 <= ai, bi < n",
  ],
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
    // Every case above is a forest, where the count is exactly n - len(edges), so both
    // `return n - len(edges)` and a union-find that decremented on every edge without
    // checking whether the two nodes were already joined passed. This one has a cycle.
    {
      input: {
        n: 4,
        edges: [
          [0, 1],
          [1, 2],
          [0, 2],
        ],
      },
      expected: 2,
      description: "Redundant edge closes a cycle: three edges still leave two components",
    },
  ],
}
