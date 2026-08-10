import type { DSAScenario } from "../../types"

export const subtreeOfAnotherTreeScenario: DSAScenario = {
  id: "dsa-subtree-of-another-tree",
  title: "Subtree of Another Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Check if a tree is a subtree of another tree.",
  tags: ["tree", "dfs", "recursion", "string-matching"],
  estimatedTime: 20,
  problemStatement: `Given the roots of two binary trees root and subRoot, return true if there is a subtree of root with the same structure and node values of subRoot and false otherwise.

A subtree of a binary tree tree is a tree that consists of a node in tree and all of this node's descendants.

Example:

\`\`\`
root              subRoot
    3                4
   / \\              / \\
  4   5            1   2
 / \\
1   2
\`\`\`

The subtree rooted at 4 has the same shape and values as subRoot, so the answer is true.`,
  examples: [
    {
      input: "root = [3,4,5,1,2], subRoot = [4,1,2]",
      output: "true",
    },
    {
      input: "root = [3,4,5,1,2,null,null,null,null,0], subRoot = [4,1,2]",
      output: "false",
    },
  ],
  constraints: [
    "The number of nodes in root is in the range [1, 2000].",
    "The number of nodes in subRoot is in the range [1, 1000].",
    "-10^4 <= root.val <= 10^4",
    "-10^4 <= subRoot.val <= 10^4",
  ],
  hints: [
    "For each node in root, check if it matches subRoot using isSameTree",
    "Recursively check: current matches OR left subtree contains OR right subtree contains",
    "Can also serialize both trees and use string matching",
  ],
  starterCode: {
    javascript: `function isSubtree(root, subRoot) {
// Check if subRoot is a subtree of root
}`,
    typescript: `function isSubtree(root: TreeNode | null, subRoot: TreeNode | null): boolean {
// Check if subRoot is a subtree of root
}`,
    python: `def isSubtree(root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
  # Check if subRoot is a subtree of root
  pass`,
    java: `class Solution {
  public boolean isSubtree(TreeNode root, TreeNode subRoot) {
      // Check if subRoot is a subtree of root
      return false;
  }
}`,
  },
  optimalComplexity: {
    time: "O(m * n)",
    space: "O(h) where h is height",
  },
  testCases: [
    {
      input: { root: [3, 4, 5, 1, 2], subRoot: [4, 1, 2] },
      expected: true,
      description: "Subtree exists",
    },
    {
      input: { root: [3, 4, 5, 1, 2, null, null, null, null, 0], subRoot: [4, 1, 2] },
      expected: false,
      description: "Not exact match due to extra node",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What's the difference between subtree check and 'same tree' check?",
    "What if subRoot has additional children that the main tree doesn't?",
    "Could you optimize using tree serialization and string matching?",
    "What's the time complexity of your approach?",
  ],

  midCodingProbes: [
    {
      trigger: "calling isSameTree",
      question: "At which nodes do you call isSameTree?",
    },
    {
      trigger: "recursion structure",
      question: "If current node doesn't match, where else do you look?",
    },
  ],
}
