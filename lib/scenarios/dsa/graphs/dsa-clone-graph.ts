import type { DSAScenario } from "../../types"

export const cloneGraphScenario: DSAScenario = {
  id: "dsa-clone-graph",
  title: "Clone Graph",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Deep clone an undirected graph.",
  tags: ["graph", "dfs", "bfs", "hash-table"],
  estimatedTime: 25,
  problemStatement: `Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph.

Each node in the graph contains a value (int) and a list (List[Node]) of its neighbors.

class Node {
  public int val;
  public List<Node> neighbors;
}

Test case format: For simplicity, each node's value is the same as the node's index (1-indexed). The input is given as an adjacency list where adjList[i] is a list of neighbors for node i+1.

Example visualization:

  Original Graph:          Cloned Graph:
      1 ─── 2                 1' ─── 2'
      │     │       →         │      │
      │     │                 │      │
      4 ─── 3                 4' ─── 3'

  adjList = [[2,4],[1,3],[2,4],[1,3]]

  Use HashMap: oldNode → newNode
  DFS/BFS to traverse and clone`,
  examples: [
    {
      input: "adjList = [[2,4],[1,3],[2,4],[1,3]]",
      output: "[[2,4],[1,3],[2,4],[1,3]]",
      explanation: "4 nodes: node 1 connects to 2,4; node 2 connects to 1,3; etc.",
    },
    {
      input: "adjList = [[]]",
      output: "[[]]",
      explanation: "Single node with no neighbors",
    },
    {
      input: "adjList = []",
      output: "[]",
      explanation: "Empty graph",
    },
  ],
  constraints: [
    "The number of nodes in the graph is in the range [0, 100].",
    "1 <= Node.val <= 100",
    "Node.val is unique for each node.",
    "There are no repeated edges and no self-loops.",
    "The graph is connected.",
  ],
  hints: [
    "Use HashMap to track old to new node mapping",
    "Use DFS or BFS to traverse graph",
    "Create new nodes and clone neighbors recursively",
  ],
  starterCode: {
    javascript: `function cloneGraph(node) {
// Write your solution here
// node has: val, neighbors[]

}`,
    typescript: `function cloneGraph(node: Node | null): Node | null {
// Write your solution here

}`,
    python: `def cloneGraph(node):
  # Write your solution here
  # node has: val, neighbors[]
  pass`,
  },
  optimalComplexity: {
    time: "O(V + E)",
    space: "O(V)",
  },
  testCases: [
    {
      input: {
        adjList: [
          [2, 4],
          [1, 3],
          [2, 4],
          [1, 3],
        ],
      },
      expected: [
        [2, 4],
        [1, 3],
        [2, 4],
        [1, 3],
      ],
      description: "Four-node connected graph",
    },
    {
      input: { adjList: [[]] },
      expected: [[]],
      description: "Single node, no neighbors",
    },
    {
      input: { adjList: [] },
      expected: [],
      description: "Empty graph (null input)",
    },
    {
      input: { adjList: [[2], [1]] },
      expected: [[2], [1]],
      description: "Two connected nodes",
    },
  ],
}
