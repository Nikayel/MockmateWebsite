import type { DSAScenario } from "../../types"

export const allNodesDistanceKScenario: DSAScenario = {
  id: "dsa-all-nodes-distance-k",
  title: "All Nodes Distance K in Binary Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Palantir"],
  roles: ["junior", "senior", "swe"],
  description: "Collect every node exactly k edges away from a chosen target node",
  tags: ["binary-tree", "graph", "bfs", "dfs"],
  estimatedTime: 30,
  problemStatement: `You're given the root of a binary tree, the value target of a node somewhere inside it, and an integer k. All values in the tree are distinct. Treat the distance between two nodes as the number of edges on the route that connects them.

Collect the values of every node sitting exactly k edges away from target, and return them as an array. Any ordering is acceptable.`,
  examples: [
    {
      input: "root = [6,2,9,1,4,8,11,null,null,3,5], target = 2, k = 2",
      output: "[3,5,9]",
      explanation:
        "Two edges from node 2: its grandchildren 3 and 5, plus node 9 reached up through the root.",
    },
    { input: "root = [7], target = 7, k = 4", output: "[]" },
  ],
  constraints: [
    "The tree holds at least 1 and at most 500 nodes.",
    "Node values run from 0 to 500.",
    "No two nodes share the same value.",
    "target always matches a node that exists in the tree.",
    "k is between 0 and 1000.",
  ],
  hints: [
    "Convert tree to undirected graph (add parent pointers)",
    "Then BFS from target node for k levels",
    "Or DFS to find path to target, then explore at each level",
    "Track visited nodes to avoid cycles",
  ],
  starterCode: {
    javascript: `function distanceK(root, target, k) {\n  // Write your solution here\n\n}`,
    typescript: `function distanceK(root: TreeNode | null, target: number, k: number): number[] {\n  // Write your solution here\n\n}`,
    python: `def distanceK(root: TreeNode, target: int, k: int) -> list[int]:\n    # Write your solution here\n    pass`,
    java: `class Solution {\n    public List<Integer> distanceK(TreeNode root, int target, int k) {\n        // Write your solution here\n        return new ArrayList<>();\n    }\n}`,
  },
  optimalComplexity: { time: "O(n)", space: "O(n)" },
  testCases: [
    {
      input: { root: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], target: 5, k: 2 },
      expected: [7, 4, 1],
      // The statement accepts any ordering, so a collection that enqueues the parent
      // first answers [1,7,4] and is equally correct.
      compareAsSet: true,
      description: "Multiple nodes at distance K",
    },
    {
      input: { root: [1], target: 1, k: 3 },
      expected: [],
      description: "No nodes at distance K",
    },
  ],
}
