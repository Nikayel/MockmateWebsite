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
  problemStatement: `Given a bi-directional graph with n vertices and edges, determine if there is a valid path from source to destination.`,
  examples: [
    {
      input: "n = 3, edges = [[0,1],[1,2],[2,0]], source = 0, destination = 2",
      output: "true",
      explanation: "Path 0 -> 1 -> 2 or 0 -> 2",
    },
    {
      input: "n = 6, edges = [[0,1],[0,2],[3,5],[5,4],[4,3]], source = 0, destination = 5",
      output: "false",
      explanation: "No path from 0 to 5",
    },
  ],
  constraints: [
    "1 <= n <= 2 * 10^5",
    "0 <= edges.length <= 2 * 10^5",
    "0 <= source, destination <= n - 1",
  ],
  hints: [
    "Build adjacency list",
    "BFS or DFS from source",
    "Union-Find also works",
    "Track visited nodes",
  ],
  starterCode: {
    javascript: `function validPath(n, edges, source, destination) {\n  // BFS/DFS from source\n}`,
    typescript: `function validPath(n: number, edges: number[][], source: number, destination: number): boolean {\n  // BFS/DFS from source\n}`,
    python: `def validPath(n: int, edges: list[list[int]], source: int, destination: int) -> bool:\n    # BFS/DFS from source\n    pass`,
    java: `class Solution {\n    public boolean validPath(int n, int[][] edges, int source, int destination) {\n        // BFS/DFS from source\n        return false;\n    }\n}`,
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
  ],
}
