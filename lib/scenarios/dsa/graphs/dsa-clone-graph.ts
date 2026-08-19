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
  tags: ["graph", "hash-table", "dfs", "bfs"],
  estimatedTime: 25,
  problemStatement: `You're handed a reference to one node of a connected undirected graph, and your task is to construct a complete deep copy of it. Every node in the copy must be a freshly created object; handing back nodes from the original structure, or wiring a cloned node to an original neighbor, does not count.

Each node stores an integer val alongside a neighbors list holding its adjacent nodes:

\`\`\`
class Node {
  public int val;
  public List<Node> neighbors;
}
\`\`\`

For testing, graphs are serialized as adjacency lists. Nodes are numbered starting at 1 and each node's val equals its number, so adjList[i] holds the neighbor numbers of the node numbered i + 1, and your clone is read back out in the same shape. For instance, this three-way star:

\`\`\`
  2 ─── 1 ─── 3
        │
        4

adjList = [[2,3,4],[1],[1],[1]]
\`\`\``,
  examples: [
    {
      input: "adjList = [[2,3,4],[1],[1],[1]]",
      output: "[[2,3,4],[1],[1],[1]]",
      explanation:
        "Node 1 sits at the center with edges to 2, 3, and 4; each outer node links back only to 1.",
    },
    {
      input: "adjList = [[]]",
      output: "[[]]",
      explanation: "A lone node whose neighbor list is empty",
    },
    {
      input: "adjList = []",
      output: "[]",
      explanation: "No nodes exist, so the copy has none either",
    },
  ],
  constraints: [
    "Node count sits anywhere in the range [0, 100].",
    "Each value obeys 1 <= Node.val <= 100.",
    "No two nodes carry the same val.",
    "Neither repeated edges nor self-loops appear.",
    "Every node can reach every other node.",
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
