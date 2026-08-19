import type { DSAScenario } from "../../types"

export const subtreeOfAnotherTreeScenario: DSAScenario = {
  id: "dsa-subtree-of-another-tree",
  title: "Subtree of Another Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Decide whether one tree appears intact inside another.",
  tags: ["tree", "dfs", "recursion", "string-matching"],
  estimatedTime: 20,
  problemStatement: `You're given two binary trees by their roots, root and subRoot. Pick any node inside root and take everything hanging from it, that node plus all of its descendants, and you have one of root's subtrees; the whole of root counts as one too. Return true if any such subtree is an exact copy of subRoot, matching in both shape and values, and false if none is.

A match can't stop partway down: whatever dangles below the chosen node is part of the comparison.

\`\`\`
root              subRoot
    8                6
   / \\              / \\
  6   9            3   7
 / \\
3   7
\`\`\`

The node 6 inside root carries precisely the shape and values of subRoot, so this pair gives true.`,
  examples: [
    {
      input: "root = [8,6,9,3,7], subRoot = [6,3,7]",
      output: "true",
    },
    {
      input: "root = [8,6,9,3,7,null,null,null,null,1], subRoot = [6,3,7]",
      output: "false",
    },
  ],
  constraints: [
    "root brings between 1 and 2000 nodes.",
    "subRoot brings between 1 and 1000 nodes.",
    "Every value in root fits within -10^4 to 10^4.",
    "Every value in subRoot fits within -10^4 to 10^4.",
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
