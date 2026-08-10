import type { DSAScenario } from "../../types"

export const diameterOfBinaryTreeScenario: DSAScenario = {
  id: "dsa-diameter-of-binary-tree",
  title: "Diameter of Binary Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta", "Apple"],
  description: "Find the diameter (longest path) of a binary tree",
  tags: ["tree", "dfs", "recursion"],
  estimatedTime: 20,
  problemStatement: `Given the root of a binary tree, return the length of the diameter of the tree.

The diameter of a binary tree is the length of the longest path between any two nodes in a tree. This path may or may not pass through the root.

The length of a path between two nodes is represented by the number of edges between them.

Example visualization:

        1
       / \\
      2   3
     / \\
    4   5

  Longest path: 4 → 2 → 1 → 3  OR  5 → 2 → 1 → 3
  Diameter = 3 edges`,
  examples: [
    {
      input: "root = [1,2,3,4,5]",
      output: "3",
      explanation: "The longest path is [4,2,1,3] or [5,2,1,3] with 3 edges.",
    },
    {
      input: "root = [1,2]",
      output: "1",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [1, 10^4].",
    "-100 <= Node.val <= 100",
  ],
  hints: [
    "Diameter through a node = left_height + right_height",
    "Use DFS to compute height and update max diameter",
    "Height of a node = 1 + max(left_height, right_height)",
  ],
  starterCode: {
    javascript: `function diameterOfBinaryTree(root) {
// Find diameter using DFS
}`,
    typescript: `function diameterOfBinaryTree(root: TreeNode | null): number {
// Find diameter using DFS
}`,
    python: `def diameterOfBinaryTree(root: Optional[TreeNode]) -> int:
  # Find diameter using DFS
  pass`,
    java: `class Solution {
  public int diameterOfBinaryTree(TreeNode root) {
      // Find diameter using DFS
      return 0;
  }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(h) where h is height",
  },
  testCases: [
    {
      input: { root: [1, 2, 3, 4, 5] },
      expected: 3,
      description: "Diameter through root",
    },
    {
      input: { root: [1, 2] },
      expected: 1,
      description: "Two nodes",
    },
    {
      input: { root: [1] },
      expected: 0,
      description: "Single node - no edges",
    },
    // Every case above has its longest path running through the root, so adding the root's
    // two subtree heights passed. Here the root has one child, and the longest path (four
    // edges, 6-4-2-5-7) lives entirely inside that subtree.
    {
      input: { root: [1, 2, null, 4, 5, 6, null, null, 7] },
      expected: 4,
      description: "Longest path does not pass through the root",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "Does the diameter always pass through the root?",
    "What's the relationship between diameter and height?",
    "How is this similar to the max path sum problem?",
    "What if the longest path is entirely in a subtree?",
  ],

  midCodingProbes: [
    {
      trigger: "calculating diameter at a node",
      question: "For a given node, what's the diameter passing through it?",
    },
    {
      trigger: "global variable for max",
      question: "Why do you need a global/outer variable instead of just returning?",
    },
  ],
}
