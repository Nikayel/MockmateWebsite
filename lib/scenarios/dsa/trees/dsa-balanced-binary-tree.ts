import type { DSAScenario } from "../../types"

export const balancedBinaryTreeScenario: DSAScenario = {
  id: "dsa-balanced-binary-tree",
  title: "Balanced Binary Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta", "Apple"],
  description:
    "Decide whether a binary tree keeps every node's subtree heights within 1 of each other.",
  tags: ["tree", "dfs", "recursion"],
  estimatedTime: 15,
  problemStatement: `You're given the root of a binary tree. Decide whether the tree is height-balanced and answer with true or false.

A tree earns the height-balanced label when, at every node in it, the heights of the left subtree and the right subtree differ by at most 1.

Example:

\`\`\`
Balanced (true)      Not balanced (false)
      7                    10
     / \\                  /  \\
    4   9                 5    16
   /     \\               / \\
  2       11             3   8
                        /
                       1
\`\`\``,
  examples: [
    {
      input: "root = [7,4,9,2,null,null,11]",
      output: "true",
    },
    {
      input: "root = [10,5,16,3,8,null,null,1]",
      output: "false",
    },
    {
      input: "root = []",
      output: "true",
    },
  ],
  constraints: [
    "Anywhere from 0 to 5000 nodes may be present.",
    "Each value sits between -10^4 and 10^4.",
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
    // Every unbalanced case above is unbalanced AT THE ROOT, so comparing just the root's
    // two subtree heights passed. Here the root's subtrees differ by one, which looks fine,
    // while node 2 is where the imbalance actually lives.
    {
      input: { root: [1, 2, 3, 4, null, 7, null, 6] },
      expected: false,
      description: "Root looks balanced; the imbalance is deeper in the left subtree",
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
