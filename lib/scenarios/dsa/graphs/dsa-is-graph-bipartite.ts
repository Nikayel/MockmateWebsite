import type { DSAScenario } from "../../types"

export const isGraphBipartiteScenario: DSAScenario = {
  id: "dsa-is-graph-bipartite",
  title: "Is Graph Bipartite?",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "LinkedIn", "Palantir"],
  roles: ["junior", "senior", "swe"],
  description: "Decide whether a graph's nodes split into two independent sets",
  tags: ["graph", "bfs", "dfs", "union-find"],
  estimatedTime: 20,
  problemStatement: `You're analyzing an undirected graph on n nodes, numbered 0 to n - 1 and supplied as an adjacency list: graph[u] contains every node that shares an edge with node u.

The graph counts as bipartite when its nodes can be separated into two groups so that no edge joins two members of the same group; every edge must run between the groups. Return true when such a separation exists, and false when it does not.`,
  examples: [
    {
      input: "graph = [[1,2],[0,2],[0,1,3],[2]]",
      output: "false",
      explanation: "Nodes 0, 1, and 2 form a triangle, which no two-group separation can absorb.",
    },
    {
      input: "graph = [[1,5],[0,2],[1,3],[2,4],[3,5],[4,0]]",
      output: "true",
      explanation: "Groups {0,2,4} and {1,3,5} work: every edge crosses between them.",
    },
  ],
  constraints: [
    "The outer list has one entry per node (graph.length == n).",
    "n is at least 1 and at most 100.",
    "Each graph[u] holds fewer than n neighbors, possibly 0.",
    "Adjacency is symmetric: whenever j appears in graph[i], i also appears in graph[j].",
  ],
  hints: [
    "Try to 2-color the graph",
    "BFS/DFS: alternate colors for neighbors",
    "If neighbor has same color, not bipartite",
    "Handle disconnected components",
  ],
  starterCode: {
    javascript: `function isBipartite(graph) {\n  // Write your solution here\n}`,
    typescript: `function isBipartite(graph: number[][]): boolean {\n  // Write your solution here\n}`,
    python: `def isBipartite(graph: list[list[int]]) -> bool:\n    # Write your solution here\n    pass`,
    java: `class Solution {\n    public boolean isBipartite(int[][] graph) {\n        // Write your solution here\n        return false;\n    }\n}`,
  },
  optimalComplexity: { time: "O(V + E)", space: "O(V)" },
  testCases: [
    {
      input: {
        graph: [
          [1, 2, 3],
          [0, 2],
          [0, 1, 3],
          [0, 2],
        ],
      },
      expected: false,
      description: "Not bipartite",
    },
    {
      input: {
        graph: [
          [1, 3],
          [0, 2],
          [1, 3],
          [0, 2],
        ],
      },
      expected: true,
      description: "Bipartite square",
    },
    // Both cases above are connected and their odd cycle is a triangle, so a
    // triangle-only check, an "every degree is even" heuristic, and a solution that
    // explored only the component containing node 0 all passed.
    {
      input: {
        graph: [
          [1, 4],
          [0, 2],
          [1, 3],
          [2, 4],
          [3, 0],
        ],
      },
      expected: false,
      description: "Five-cycle: an odd cycle with no triangle, every degree even",
    },
    {
      input: {
        graph: [[1], [0], [3, 4], [2, 4], [2, 3]],
      },
      expected: false,
      description: "Second component holds the odd cycle: every component must be checked",
    },
  ],
}
