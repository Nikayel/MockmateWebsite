import type { DSAScenario } from "../../types"

export const findPathExistsScenario: DSAScenario = {
  id: "dsa-find-path-exists",
  title: "Find if Path Exists in Graph",
  type: "dsa",
  pattern: "graphs",
  difficulty: "easy",
  companies: ["Amazon", "Google", "LinkedIn", "Palantir"],
  roles: ["intern", "new-grad", "junior", "swe"],
  description: "Check if path exists between two nodes in undirected graph",
  tags: ["graph", "bfs", "dfs", "union-find"],
  estimatedTime: 15,
  problemStatement: `You're exploring a network of n vertices numbered 0 to n - 1. Its wiring is the array edges, where edges[i] = [ui, vi] connects vertices ui and vi, and every connection can be traveled in both directions. Some vertices may have no connections at all.

Figure out whether some sequence of edges leads from vertex source to vertex destination, and return true or false accordingly.`,
  examples: [
    {
      input: "n = 4, edges = [[0,1],[1,2],[2,3],[3,0]], source = 1, destination = 3",
      output: "true",
      explanation: "Travel 1 -> 2 -> 3, or go the long way around through 0",
    },
    {
      input: "n = 7, edges = [[0,1],[1,2],[2,0],[3,4],[4,5]], source = 2, destination = 5",
      output: "false",
      explanation: "Vertices 0, 1, 2 form one cluster and 3, 4, 5 another; no edge bridges them",
    },
  ],
  constraints: [
    "n can be as small as 1 and as large as 2 * 10^5.",
    "edges.length tops out at 2 * 10^5 and may be 0.",
    "Both source and destination are valid vertex labels between 0 and n - 1.",
  ],
  hints: [
    "Build adjacency list",
    "BFS or DFS from source",
    "Union-Find also works",
    "Track visited nodes",
  ],
  starterCode: {
    javascript: `function validPath(n, edges, source, destination) {\n  // Write your solution here\n}`,
    typescript: `function validPath(n: number, edges: number[][], source: number, destination: number): boolean {\n  // Write your solution here\n}`,
    python: `def validPath(n: int, edges: list[list[int]], source: int, destination: int) -> bool:\n    # Write your solution here\n    pass`,
    java: `class Solution {\n    public boolean validPath(int n, int[][] edges, int source, int destination) {\n        // Write your solution here\n        return false;\n    }\n}`,
  },
  optimalComplexity: { time: "O(V + E)", space: "O(V + E)" },
  testCases: [
    {
      input: {
        n: 3,
        edges: [
          [0, 1],
          [1, 2],
          [2, 0],
        ],
        source: 0,
        destination: 2,
      },
      expected: true,
      description: "Connected",
    },
    {
      input: {
        n: 6,
        edges: [
          [0, 1],
          [0, 2],
          [3, 5],
          [5, 4],
          [4, 3],
        ],
        source: 0,
        destination: 5,
      },
      expected: false,
      description: "Disconnected",
    },
    // Both cases above are reachable within two hops along edges listed source-first, so a
    // solution that treated the edges as DIRECTED, and one that only checked one and two
    // hops, both passed. Here every edge is listed in reverse and the path is three hops.
    {
      input: {
        n: 4,
        edges: [
          [1, 0],
          [2, 1],
          [3, 2],
        ],
        source: 0,
        destination: 3,
      },
      expected: true,
      description: "Three hops, every edge listed in reverse: edges are undirected",
    },
    {
      input: { n: 1, edges: [], source: 0, destination: 0 },
      expected: true,
      description: "Source is the destination",
    },
  ],
}
