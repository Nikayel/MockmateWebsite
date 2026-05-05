import type { DSAScenario } from "../../types"

export const lowestCommonAncestorBinaryTreeScenario: DSAScenario = {
  id: "dsa-lowest-common-ancestor-binary-tree",
  title: "Lowest Common Ancestor of a Binary Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
  description: "Find the lowest common ancestor of two nodes in a binary tree",
  tags: ["tree", "dfs", "recursion"],
  estimatedTime: 25,
  problemStatement: `Given a binary tree, find the lowest common ancestor (LCA) of two given nodes in the tree.

According to the definition of LCA on Wikipedia: "The lowest common ancestor is defined between two nodes p and q as the lowest node in T that has both p and q as descendants (where we allow a node to be a descendant of itself)."

Example visualization:

          3       ← LCA of (5,1) = 3
         / \\
       [5]  [1]   ← p=5, q=1
       / \\  / \\
      6   2 0   8
         / \\
        7   4

  LCA of (5, 4) = 5  (5 is ancestor of itself)
  LCA of (5, 1) = 3  (3 is first common ancestor)`,
  examples: [
    {
      input: "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1",
      output: "3",
      explanation: "The LCA of nodes 5 and 1 is 3.",
    },
    {
      input: "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 4",
      output: "5",
      explanation: "The LCA of nodes 5 and 4 is 5, since a node can be a descendant of itself.",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [2, 10^5].",
    "-10^9 <= Node.val <= 10^9",
    "All Node.val are unique.",
    "p != q",
    "p and q will exist in the tree.",
  ],
  hints: [
    "Recursively search left and right subtrees for p and q",
    "If both left and right return non-null, current node is LCA",
    "If one side returns null, LCA is on the other side",
    "Base case: if current node is p or q, return it",
  ],
  starterCode: {
    javascript: `function lowestCommonAncestor(root, p, q) {
// Find LCA using recursion
}`,
    typescript: `function lowestCommonAncestor(root: TreeNode | null, p: TreeNode, q: TreeNode): TreeNode | null {
// Find LCA using recursion
}`,
    python: `def lowestCommonAncestor(root: TreeNode, p: TreeNode, q: TreeNode) -> TreeNode:
  # Find LCA using recursion
  pass`,
    java: `class Solution {
  public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
      // Find LCA using recursion
      return null;
  }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(h) where h is height",
  },
  testCases: [
    {
      input: { root: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 5, q: 1 },
      expected: 3,
      description: "LCA is root",
    },
    {
      input: { root: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 5, q: 4 },
      expected: 5,
      description: "LCA is one of the nodes",
    },
    {
      input: { root: [1, 2], p: 1, q: 2 },
      expected: 1,
      description: "Two node tree",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What if one node is an ancestor of the other?",
    "What if p and q are the same node?",
    "How is this different from LCA in a BST?",
    "Could you solve this if you had parent pointers?",
  ],

  midCodingProbes: [
    {
      trigger: "base case returning node",
      question: "Why return the node if it equals p or q?",
    },
    {
      trigger: "checking left and right returns",
      question: "What does it mean if both left and right return non-null?",
    },
  ],
}
