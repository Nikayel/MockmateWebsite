import type { DSAScenario } from "../../types"

export const maximumDepthBinaryTreeScenario: DSAScenario = {
  id: "dsa-maximum-depth-binary-tree",
  title: "Maximum Depth of Binary Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta", "Apple", "Microsoft", "NVIDIA"],
  description: "Find the maximum depth of a binary tree.",
  tags: ["tree", "dfs", "bfs", "recursion"],
  estimatedTime: 10,
  problemStatement: `Given the root of a binary tree, return its maximum depth.

A binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.

Example:

\`\`\`
      3
     / \\
    9  20
       / \\
      15  7
\`\`\`

The longest root-to-leaf path passes 3 nodes, so the maximum depth is 3.`,
  examples: [
    {
      input: "root = [3,9,20,null,null,15,7]",
      output: "3",
    },
    {
      input: "root = [1,null,2]",
      output: "2",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [0, 10^4].",
    "-100 <= Node.val <= 100",
  ],
  hints: [
    "Depth = 1 + max(left_depth, right_depth)",
    "Base case: null node has depth 0",
    "Can solve with BFS counting levels too",
  ],
  starterCode: {
    javascript: `function maxDepth(root) {
// Find max depth recursively
}`,
    typescript: `function maxDepth(root: TreeNode | null): number {
// Find max depth recursively
}`,
    python: `def maxDepth(root: Optional[TreeNode]) -> int:
  # Find max depth recursively
  pass`,
    java: `class Solution {
  public int maxDepth(TreeNode root) {
      // Find max depth recursively
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
      input: { root: [3, 9, 20, null, null, 15, 7] },
      expected: 3,
      description: "Standard tree",
    },
    {
      input: { root: [1, null, 2] },
      expected: 2,
      description: "Skewed tree",
    },
    {
      input: { root: [] },
      expected: 0,
      description: "Empty tree",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What's the difference between depth and height of a tree?",
    "What if the tree is completely skewed (like a linked list)?",
    "Could you solve this with BFS? What would that look like?",
    "What's the space complexity for a balanced vs unbalanced tree?",
  ],

  midCodingProbes: [
    {
      trigger: "returning depth",
      question: "Why add 1 to the max of left and right depths?",
    },
    {
      trigger: "base case",
      question: "What should you return for a null node - 0 or -1?",
    },
  ],
}
