import type { DSAScenario } from "../../types"

export const binaryTreeInorderScenario: DSAScenario = {
  id: "dsa-binary-tree-inorder",
  title: "Binary Tree Inorder Traversal",
  type: "dsa",
  pattern: "trees",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta"],
  description: "Produce a binary tree's left-node-right (inorder) visiting sequence.",
  tags: ["tree", "stack", "dfs", "recursion"],
  estimatedTime: 15,
  problemStatement: `You're given the root of a binary tree. Report its inorder traversal: for any node, everything in its left subtree is listed first, then the node's own value, then everything in its right subtree. Return the values in that visiting order.`,
  examples: [
    {
      input: "root = [4,null,7,6]",
      output: "[4,6,7]",
    },
    {
      input: "root = []",
      output: "[]",
    },
    {
      input: "root = [9]",
      output: "[9]",
    },
  ],
  constraints: ["The tree has between 0 and 100 nodes.", "Values stay within -100 to 100."],
  hints: [
    "Inorder: left -> root -> right",
    "Can solve recursively or iteratively with stack",
    "Morris traversal for O(1) space",
  ],
  starterCode: {
    javascript: `function inorderTraversal(root) {
// Write your solution here

}`,
    typescript: `function inorderTraversal(root: TreeNode | null): number[] {
// Write your solution here

}`,
    python: `def inorderTraversal(root):
  # Write your solution here
  pass`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(n) recursive, O(1) Morris",
  },
  testCases: [
    {
      input: { root: [1, null, 2, 3] },
      expected: [1, 3, 2],
      description: "Standard tree",
    },
    {
      input: { root: [] },
      expected: [],
      description: "Empty tree",
    },
    {
      input: { root: [1] },
      expected: [1],
      description: "Single node",
    },
    {
      input: { root: [1, 2, 3, 4, 5] },
      expected: [4, 2, 5, 1, 3],
      description: "Complete tree",
    },
  ],
}
