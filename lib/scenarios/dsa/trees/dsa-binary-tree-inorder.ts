import type { DSAScenario } from "../../types"

export const binaryTreeInorderScenario: DSAScenario = {
  id: "dsa-binary-tree-inorder",
  title: "Binary Tree Inorder Traversal",
  type: "dsa",
  pattern: "trees",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta"],
  description: "Return the inorder traversal of a binary tree's nodes' values.",
  tags: ["tree", "dfs", "stack", "recursion"],
  estimatedTime: 15,
  problemStatement: `Given the root of a binary tree, return the inorder traversal of its nodes' values.`,
  examples: [
    {
      input: "root = [1,null,2,3]",
      output: "[1,3,2]",
    },
    {
      input: "root = []",
      output: "[]",
    },
    {
      input: "root = [1]",
      output: "[1]",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [0, 100].",
    "-100 <= Node.val <= 100",
  ],
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
