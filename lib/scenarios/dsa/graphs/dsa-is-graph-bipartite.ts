import type { DSAScenario } from "../../types"

export const isGraphBipartiteScenario: DSAScenario = {
  id: "dsa-is-graph-bipartite",
  title: "Is Graph Bipartite?",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "LinkedIn", "Palantir"],
  roles: ["junior", "senior", "swe"],
  description: "Check if graph can be colored with two colors (bipartite)",
  tags: ["graph", "bfs", "dfs", "union-find"],
  estimatedTime: 20,
  problemStatement: `Given an undirected graph, return true if it is bipartite. A graph is bipartite if nodes can be divided into two independent sets such that every edge connects a node in set A to one in set B.`,
  examples: [
    {
      input: "graph = [[1,2,3],[0,2],[0,1,3],[0,2]]",
      output: "false",
      explanation: "No way to partition nodes into two sets.",
    },
    {
      input: "graph = [[1,3],[0,2],[1,3],[0,2]]",
      output: "true",
      explanation: "Sets {0,2} and {1,3}.",
    },
  ],
  constraints: [
    "graph.length == n",
    "1 <= n <= 100",
    "0 <= graph[u].length < n",
    "Graph is undirected (if j in graph[i], then i in graph[j])",
  ],
  hints: [
    "Try to 2-color the graph",
    "BFS/DFS: alternate colors for neighbors",
    "If neighbor has same color, not bipartite",
    "Handle disconnected components",
  ],
  starterCode: {
    javascript: `function isBipartite(graph) {\n  // BFS/DFS with 2-coloring\n}`,
    typescript: `function isBipartite(graph: number[][]): boolean {\n  // BFS/DFS with 2-coloring\n}`,
    python: `def isBipartite(graph: list[list[int]]) -> bool:\n    # BFS/DFS with 2-coloring\n    pass`,
    java: `class Solution {\n    public boolean isBipartite(int[][] graph) {\n        // BFS/DFS with 2-coloring\n        return false;\n    }\n}`,
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
