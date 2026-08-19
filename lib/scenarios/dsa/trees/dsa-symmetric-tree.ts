import type { DSAScenario } from "../../types"

export const symmetricTreeScenario: DSAScenario = {
  id: "dsa-symmetric-tree",
  title: "Symmetric Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
  description: "Check whether a tree reads the same flipped left to right.",
  tags: ["tree", "dfs", "bfs", "recursion"],
  estimatedTime: 15,
  problemStatement: `You're given the root of a binary tree. Imagine a vertical line through root and fold the tree across it: the tree is symmetric when the left half lands perfectly on the right half, position for position and value for value. Return true if the tree mirrors itself this way, false if anything fails to line up.

\`\`\`
Symmetric:            Not symmetric:
      5                     5
     / \\                   / \\
    8   8                 8   8
   / \\ / \\                 \\   \\
  2  6 6  2                6    6
\`\`\`

The first tree reads identically from both ends, so it's true. In the second, both 6s lean the same direction, so the fold misses and it's false.`,
  examples: [
    {
      input: "root = [5,8,8,2,6,6,2]",
      output: "true",
    },
    {
      input: "root = [5,8,8,null,6,null,6]",
      output: "false",
    },
  ],
  constraints: [
    "The tree has at least 1 node and at most 1000.",
    "Each value falls between -100 and 100.",
  ],
  hints: [
    "Compare left subtree with right subtree (mirrored)",
    "Two trees are mirrors if: roots equal, left1 mirrors right2, right1 mirrors left2",
    "Can solve iteratively with queue comparing pairs",
  ],
  starterCode: {
    javascript: `function isSymmetric(root) {
// Check if tree is symmetric
}`,
    typescript: `function isSymmetric(root: TreeNode | null): boolean {
// Check if tree is symmetric
}`,
    python: `def isSymmetric(root: Optional[TreeNode]) -> bool:
  # Check if tree is symmetric
  pass`,
    java: `class Solution {
  public boolean isSymmetric(TreeNode root) {
      // Check if tree is symmetric
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
      input: { root: [1, 2, 2, 3, 4, 4, 3] },
      expected: true,
      description: "Symmetric tree",
    },
    {
      input: { root: [1, 2, 2, null, 3, null, 3] },
      expected: false,
      description: "Not symmetric",
    },
    {
      input: { root: [1] },
      expected: true,
      description: "Single node is symmetric",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "Is this problem related to 'Same Tree'? How?",
    "What if the tree has only a root?",
    "Can you solve this iteratively with a queue?",
    "What exactly needs to match for two subtrees to be mirrors?",
  ],

  midCodingProbes: [
    {
      trigger: "helper function",
      question: "What two nodes are you comparing in your helper function?",
    },
    {
      trigger: "comparing children",
      question: "When comparing mirrors, which child of left matches which child of right?",
    },
  ],
}
