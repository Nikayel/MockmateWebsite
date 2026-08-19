import type { DSAScenario } from "../../types"

export const lowestCommonAncestorBinaryTreeScenario: DSAScenario = {
  id: "dsa-lowest-common-ancestor-binary-tree",
  title: "Lowest Common Ancestor of a Binary Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Locate the deepest node that keeps both given nodes among its descendants",
  tags: ["tree", "dfs", "recursion"],
  estimatedTime: 25,
  problemStatement: `You're given the root of a binary tree plus two nodes that live in it, p and q. Their lowest common ancestor (LCA) is the deepest node that counts both p and q among its descendants, and for this purpose every node is treated as a descendant of itself.

Find that ancestor node and return it.

\`\`\`
        9
       / \\
      4   13
     / \\  / \\
    2   7 11 16
       / \\
      6   8
\`\`\`

The LCA of 4 and 13 is 9. For 4 and 8 it is 4 itself, since a node may be its own descendant.`,
  examples: [
    {
      input: "root = [9,4,13,2,7,11,16,null,null,6,8], p = 4, q = 13",
      output: "9",
      explanation: "Nodes 4 and 13 hang from different sides of 9, so 9 is where their paths meet.",
    },
    {
      input: "root = [9,4,13,2,7,11,16,null,null,6,8], p = 4, q = 8",
      output: "4",
      explanation:
        "Node 8 lives inside 4's subtree, and a node counts as its own descendant, so the answer is 4.",
    },
  ],
  constraints: [
    "The tree carries between 2 and 10^5 nodes.",
    "Node values span -10^9 to 10^9.",
    "Every value in the tree is distinct.",
    "p and q are guaranteed to be different nodes.",
    "Both p and q appear somewhere in the tree.",
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
