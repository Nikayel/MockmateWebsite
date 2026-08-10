import type { DSAScenario } from "../../types"

export const invertBinaryTreeScenario: DSAScenario = {
  id: "dsa-invert-binary-tree",
  title: "Invert Binary Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "easy",
  companies: ["Google", "Amazon", "Meta", "Apple", "Microsoft"],
  description: "Invert a binary tree (mirror it).",
  tags: ["tree", "dfs", "bfs", "recursion"],
  estimatedTime: 10,
  problemStatement: `Given the root of a binary tree, invert the tree, and return its root.

Inverting a binary tree means swapping the left and right children of all nodes in the tree.

Example:

\`\`\`
Input              Output
     4                4
    / \\              / \\
   2   7            7   2
  / \\ / \\          / \\ / \\
 1  3 6  9        9  6 3  1
\`\`\``,
  examples: [
    {
      input: "root = [4,2,7,1,3,6,9]",
      output: "[4,7,2,9,6,3,1]",
      explanation: "The tree is mirrored around its center.",
    },
    {
      input: "root = [2,1,3]",
      output: "[2,3,1]",
    },
    {
      input: "root = []",
      output: "[]",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [0, 100].",
    "-100 <= Node.val <= 100",
  ],
  hints: [
    "Recursively swap left and right children",
    "Base case: if node is null, return null",
    "Can also solve iteratively with BFS or stack",
  ],
  starterCode: {
    javascript: `function invertTree(root) {
// Swap left and right children recursively
}`,
    typescript: `function invertTree(root: TreeNode | null): TreeNode | null {
// Swap left and right children recursively
}`,
    python: `def invertTree(root: Optional[TreeNode]) -> Optional[TreeNode]:
  # Swap left and right children recursively
  pass`,
    java: `class Solution {
  public TreeNode invertTree(TreeNode root) {
      // Swap left and right children recursively
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
      input: { root: [4, 2, 7, 1, 3, 6, 9] },
      expected: [4, 7, 2, 9, 6, 3, 1],
      description: "Standard tree inversion",
    },
    {
      input: { root: [2, 1, 3] },
      expected: [2, 3, 1],
      description: "Small tree",
    },
    {
      input: { root: [] },
      expected: [],
      description: "Empty tree",
    },
    // Both trees above are perfect, where reversing each level's VALUES in place happens to
    // produce the same array as mirroring the structure. On an asymmetric tree the two come
    // apart: that approach leaves node 4 hanging off the left branch.
    {
      input: { root: [1, 2, 3, 4] },
      expected: [1, 3, 2, null, null, null, 4],
      description: "Asymmetric tree: swapping children is not reversing level values",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What if the tree is empty or has only one node?",
    "Can you do this iteratively instead of recursively?",
    "What's the space complexity of your recursive solution?",
    "Does the order of swapping matter - left first or right first?",
  ],

  midCodingProbes: [
    {
      trigger: "swapping children",
      question: "After swapping at a node, what do you need to do with the children?",
    },
    {
      trigger: "base case",
      question: "What's your base case for the recursion?",
    },
  ],
}
