import type { DSAScenario } from "../../types"

export const maximumDepthBinaryTreeScenario: DSAScenario = {
  id: "dsa-maximum-depth-binary-tree",
  title: "Maximum Depth of Binary Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta", "Apple", "Microsoft", "NVIDIA"],
  description: "Count the nodes on the longest root-to-leaf walk in a binary tree.",
  tags: ["tree", "dfs", "bfs", "recursion"],
  estimatedTime: 10,
  problemStatement: `You're given the root of a binary tree. Its maximum depth counts the nodes on the longest chain you can follow from root straight down, parent to child, before running out at a leaf.

Here's one tree whose answer is 3:

\`\`\`
      8
     / \\
    4  25
       / \\
     12  30
\`\`\`

Walking 8 to 25 to 12 touches 3 nodes, and no downward walk in this tree touches more, so its maximum depth is 3.

Return the maximum depth of the tree hanging from root.`,
  examples: [
    {
      input: "root = [8,4,25,null,null,12,30]",
      output: "3",
    },
    {
      input: "root = [7,null,9]",
      output: "2",
    },
  ],
  constraints: [
    "Anywhere from 0 to 10^4 nodes may be present.",
    "Each node's value sits between -100 and 100.",
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
