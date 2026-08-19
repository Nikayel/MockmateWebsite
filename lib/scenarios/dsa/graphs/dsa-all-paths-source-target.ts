import type { DSAScenario } from "../../types"

export const allPathsSourceTargetScenario: DSAScenario = {
  id: "dsa-all-paths-source-target",
  title: "All Paths From Source to Target",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Bloomberg", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Enumerate every route through a DAG from node 0 to node n-1",
  tags: ["graph", "dfs", "backtracking"],
  estimatedTime: 25,
  problemStatement: `You're working with a directed acyclic graph of n nodes numbered 0 through n - 1. Its wiring comes as graph, where graph[i] holds every node that a directed edge leads to from node i.

Collect every distinct path that begins at node 0 and finishes at node n - 1, and return them as a list of paths; the paths may appear in whatever sequence you like.`,
  examples: [
    {
      input: "graph = [[1,2],[3],[3],[4],[]]",
      output: "[[0,1,3,4],[0,2,3,4]]",
      explanation: "Two routes exist: 0 -> 1 -> 3 -> 4 and 0 -> 2 -> 3 -> 4.",
    },
    {
      input: "graph = [[1,2,4],[2,3],[3],[4],[]]",
      output: "[[0,1,2,3,4],[0,1,3,4],[0,2,3,4],[0,4]]",
    },
  ],
  constraints: [
    "graph.length equals n",
    "n stays between 2 and 15",
    "every listed target satisfies 0 <= graph[i][j] < n",
    "no node lists itself: graph[i][j] != i",
    "within graph[i], no target repeats",
    "the graph you receive is always acyclic (a DAG)",
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
      // The statement lets paths come back in any sequence; test 2 already set this and
      // test 1 did not, so a different neighbour iteration order failed here only.
      compareAsSet: true,
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
