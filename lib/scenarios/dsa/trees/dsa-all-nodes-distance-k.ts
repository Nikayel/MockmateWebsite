import type { DSAScenario } from "../../types"

export const allNodesDistanceKScenario: DSAScenario = {
  id: "dsa-all-nodes-distance-k",
  title: "All Nodes Distance K in Binary Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Palantir"],
  roles: ["junior", "senior", "swe"],
  description: "Find all nodes at distance K from a target node",
  tags: ["binary-tree", "bfs", "dfs", "graph"],
  estimatedTime: 30,
  problemStatement: `Given the root of a binary tree, the value of a target node target, and an integer k, return an array of the values of all nodes that have a distance k from the target node.

You can return the answer in any order.`,
  examples: [
    {
      input: "root = [3,5,1,6,2,0,8,null,null,7,4], target = 5, k = 2",
      output: "[7,4,1]",
      explanation: "Nodes at distance 2 from node 5 are 7, 4, and 1.",
    },
    { input: "root = [1], target = 1, k = 3", output: "[]" },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [1, 500].",
    "0 <= Node.val <= 500",
    "All Node.val are unique.",
    "target is a value of a node in the tree.",
    "0 <= k <= 1000",
  ],
  hints: [
    "Convert tree to undirected graph (add parent pointers)",
    "Then BFS from target node for k levels",
    "Or DFS to find path to target, then explore at each level",
    "Track visited nodes to avoid cycles",
  ],
  starterCode: {
    javascript: `function distanceK(root, target, k) {\n  // Convert to graph + BFS\n}`,
    typescript: `function distanceK(root: TreeNode | null, target: TreeNode | null, k: number): number[] {\n  // Convert to graph + BFS\n}`,
    python: `def distanceK(root: TreeNode, target: TreeNode, k: int) -> list[int]:\n    # Convert to graph + BFS\n    pass`,
    java: `class Solution {\n    public List<Integer> distanceK(TreeNode root, TreeNode target, int k) {\n        // Convert to graph + BFS\n        return new ArrayList<>();\n    }\n}`,
  },
  optimalComplexity: { time: "O(n)", space: "O(n)" },
  testCases: [
    {
      input: { root: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], target: 5, k: 2 },
      expected: [7, 4, 1],
      description: "Multiple nodes at distance K",
    },
    {
      input: { root: [1], target: 1, k: 3 },
      expected: [],
      description: "No nodes at distance K",
    },
  ],
}
