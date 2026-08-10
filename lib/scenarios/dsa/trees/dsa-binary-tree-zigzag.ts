import type { DSAScenario } from "../../types"

export const binaryTreeZigzagScenario: DSAScenario = {
  id: "dsa-binary-tree-zigzag",
  title: "Binary Tree Zigzag Level Order Traversal",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "Apple", "Bloomberg"],
  description: "Level order traversal alternating left-to-right and right-to-left",
  tags: ["binary-tree", "bfs", "deque"],
  estimatedTime: 25,
  problemStatement: `Given the root of a binary tree, return the zigzag level order traversal of its nodes' values. (i.e., from left to right, then right to left for the next level and alternate between).

Example visualization:

        3        Level 0: [3]     → left to right
       / \\
      9  20      Level 1: [20,9]  ← right to left
         / \\
        15  7    Level 2: [15,7]  → left to right

  Output: [[3], [20, 9], [15, 7]]`,
  examples: [
    { input: "root = [3,9,20,null,null,15,7]", output: "[[3],[20,9],[15,7]]" },
    { input: "root = [1]", output: "[[1]]" },
    { input: "root = []", output: "[]" },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [0, 2000].",
    "-100 <= Node.val <= 100",
  ],
  hints: [
    "Use BFS with level tracking",
    "Alternate direction each level",
    "Can reverse every other level, or use deque to add from different ends",
    "Track even/odd levels",
  ],
  starterCode: {
    javascript: `function zigzagLevelOrder(root) {\n  // BFS with alternating direction\n}`,
    typescript: `function zigzagLevelOrder(root: TreeNode | null): number[][] {\n  // BFS with alternating direction\n}`,
    python: `def zigzagLevelOrder(root: Optional[TreeNode]) -> list[list[int]]:\n    # BFS with alternating direction\n    pass`,
    java: `class Solution {\n    public List<List<Integer>> zigzagLevelOrder(TreeNode root) {\n        // BFS with alternating direction\n        return new ArrayList<>();\n    }\n}`,
  },
  optimalComplexity: { time: "O(n)", space: "O(n)" },
  testCases: [
    {
      input: { root: [3, 9, 20, null, null, 15, 7] },
      expected: [[3], [20, 9], [15, 7]],
      description: "Standard zigzag",
    },
    { input: { root: [1] }, expected: [[1]], description: "Single node" },
    { input: { root: [] }, expected: [], description: "Empty tree" },
    // The standard tree has only one node with children on its second level, so reversing
    // the order children are ENQUEUED looks the same as reversing the level's values. On a
    // full three-level tree the two come apart: that approach yields [6,7,4,5] here.
    {
      input: { root: [1, 2, 3, 4, 5, 6, 7] },
      expected: [[1], [3, 2], [4, 5, 6, 7]],
      description: "Full tree: reversing child order is not the same as reversing the level",
    },
  ],
}
