import type { DSAScenario } from "../../types"

export const balancedBinaryTreeScenario: DSAScenario = {
  id: "dsa-balanced-binary-tree",
  title: "Balanced Binary Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta", "Apple"],
  description: "Check if a binary tree is height-balanced.",
  tags: ["tree", "dfs", "recursion"],
  estimatedTime: 15,
  problemStatement: `Given a binary tree, determine if it is height-balanced.

A height-balanced binary tree is a binary tree in which the depth of the two subtrees of every node never differs by more than one.

Example visualization:

  Balanced (TRUE):        Not Balanced (FALSE):
        3                       1
       / \\                     / \\
      9  20                   2   2
         / \\                 / \\
        15  7               3   3     ← height diff = 1
                           / \\
                          4   4       ← height diff = 2 at node 1`,
  examples: [
    {
      input: "root = [3,9,20,null,null,15,7]",
      output: "true",
    },
    {
      input: "root = [1,2,2,3,3,null,null,4,4]",
      output: "false",
    },
    {
      input: "root = []",
      output: "true",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [0, 5000].",
    "-10^4 <= Node.val <= 10^4",
  ],
  hints: [
    "For each node: |left_height - right_height| <= 1",
    "AND both subtrees must also be balanced",
    "Return -1 to indicate unbalanced, otherwise return height",
  ],
  starterCode: {
    javascript: `function isBalanced(root) {
// Check if tree is height-balanced
}`,
    typescript: `function isBalanced(root: TreeNode | null): boolean {
// Check if tree is height-balanced
}`,
    python: `def isBalanced(root: Optional[TreeNode]) -> bool:
  # Check if tree is height-balanced
  pass`,
    java: `class Solution {
  public boolean isBalanced(TreeNode root) {
      // Check if tree is height-balanced
      return false;
  }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(h) where h is height",
  },
  testCases: [
    {
      input: { root: [3, 9, 20, null, null, 15, 7] },
      expected: true,
      description: "Balanced tree",
    },
    {
      input: { root: [1, 2, 2, 3, 3, null, null, 4, 4] },
      expected: false,
      description: "Unbalanced tree",
    },
    {
      input: { root: [] },
      expected: true,
      description: "Empty tree is balanced",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What's the naive O(n²) approach and why is it suboptimal?",
    "How can you check balanced in O(n) time?",
    "What does returning -1 signify in the optimized approach?",
    "Is a completely empty tree considered balanced?",
  ],

  midCodingProbes: [
    {
      trigger: "calculating heights",
      question: "Are you calculating height multiple times for the same node?",
    },
    {
      trigger: "early termination",
      question: "If you find an unbalanced subtree, do you need to check the rest?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Only checking root's children heights",
      codeSignals: ["only check root", "left - right"],
      intervention:
        "You're checking if root is balanced, but what about all the subtrees? Each node needs to be balanced.",
    },
  ],
}
