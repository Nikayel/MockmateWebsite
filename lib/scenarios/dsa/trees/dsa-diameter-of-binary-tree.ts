import type { DSAScenario } from "../../types"

export const diameterOfBinaryTreeScenario: DSAScenario = {
  id: "dsa-diameter-of-binary-tree",
  title: "Diameter of Binary Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta", "Apple"],
  description: "Measure the longest node-to-node path in a binary tree, counted in edges",
  tags: ["tree", "dfs", "recursion"],
  estimatedTime: 20,
  problemStatement: `You're given the root of a binary tree. Its diameter is the length of the longest path connecting any two nodes in the tree, and nothing forces that path to run through the root.

Measure a path's length by the number of edges it uses, then return the diameter.

\`\`\`
        8
       / \\
      5   9
     /     \\
    2       12
   /
  1
\`\`\`

The longest path here is 1 - 2 - 5 - 8 - 9 - 12. It uses 5 edges, so the diameter is 5.`,
  examples: [
    {
      input: "root = [8,5,9,2,null,null,12,1]",
      output: "5",
      explanation: "The longest path is [1,2,5,8,9,12], crossing 5 edges.",
    },
    {
      input: "root = [4,7]",
      output: "1",
    },
  ],
  constraints: [
    "Between 1 and 10^4 nodes make up the tree.",
    "Each carries a value from -100 to 100.",
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
