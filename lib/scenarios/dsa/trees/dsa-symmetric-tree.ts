import type { DSAScenario } from "../../types"

export const symmetricTreeScenario: DSAScenario = {
  id: "dsa-symmetric-tree",
  title: "Symmetric Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
  description: "Check if a binary tree is a mirror of itself.",
  tags: ["tree", "dfs", "bfs", "recursion"],
  estimatedTime: 15,
  problemStatement: `Given the root of a binary tree, check whether it is a mirror of itself (i.e., symmetric around its center).

Example visualization:

  Symmetric (TRUE):       Not Symmetric (FALSE):
        1                       1
       / \\                     / \\
      2   2                   2   2
     / \\ / \\                   \\   \\
    3  4 4  3                  3    3
        |
     (mirror)`,
  examples: [
    {
      input: "root = [1,2,2,3,4,4,3]",
      output: "true",
    },
    {
      input: "root = [1,2,2,null,3,null,3]",
      output: "false",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [1, 1000].",
    "-100 <= Node.val <= 100",
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
