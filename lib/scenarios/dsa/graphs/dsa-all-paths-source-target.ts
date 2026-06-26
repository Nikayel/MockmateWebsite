import type { DSAScenario } from "../../types"

export const allPathsSourceTargetScenario: DSAScenario = {
  id: "dsa-all-paths-source-target",
  title: "All Paths From Source to Target",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Bloomberg", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Find all paths from source (0) to target (n-1) in a DAG",
  tags: ["graph", "dfs", "backtracking"],
  estimatedTime: 25,
  problemStatement: `Given a directed acyclic graph (DAG) of n nodes labeled from 0 to n - 1, find all possible paths from node 0 to node n - 1 and return them in any order.

The graph is given as follows: graph[i] is a list of all nodes you can visit from node i (i.e., there is a directed edge from node i to node graph[i][j]).`,
  examples: [
    {
      input: "graph = [[1,2],[3],[3],[]]",
      output: "[[0,1,3],[0,2,3]]",
      explanation: "There are two paths: 0 -> 1 -> 3 and 0 -> 2 -> 3.",
    },
    {
      input: "graph = [[4,3,1],[3,2,4],[3],[4],[]]",
      output: "[[0,4],[0,3,4],[0,1,3,4],[0,1,2,3,4],[0,1,4]]",
    },
  ],
  constraints: [
    "n == graph.length",
    "2 <= n <= 15",
    "0 <= graph[i][j] < n",
    "graph[i][j] != i (no self-loops)",
    "All the elements of graph[i] are unique.",
    "The input graph is guaranteed to be a DAG.",
  ],
  hints: [
    "Use DFS/backtracking from source to explore all paths",
    "When you reach target (n-1), add current path to result",
    "Since it's a DAG, no need to track visited nodes",
    "Can also use BFS with path tracking",
  ],
  starterCode: {
    javascript: `function allPathsSourceTarget(graph) {
// Write your solution here

}`,
    typescript: `function allPathsSourceTarget(graph: number[][]): number[][] {
// Write your solution here

}`,
    python: `def allPathsSourceTarget(graph):
  # Write your solution here
  pass`,
  },
  optimalComplexity: { time: "O(2^n * n)", space: "O(n) for recursion" },
  testCases: [
    {
      input: { graph: [[1, 2], [3], [3], []] },
      expected: [
        [0, 1, 3],
        [0, 2, 3],
      ],
      description: "Two paths",
    },
    {
      input: { graph: [[4, 3, 1], [3, 2, 4], [3], [4], []] },
      expected: [
        [0, 4],
        [0, 3, 4],
        [0, 1, 3, 4],
        [0, 1, 2, 3, 4],
        [0, 1, 4],
      ],
      description: "Multiple paths",
      compareAsSet: true,
    },
    { input: { graph: [[1], []] }, expected: [[0, 1]], description: "Single path" },
  ],
}
