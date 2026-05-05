import type { DSAScenario } from "../../types"

export const sameTreeScenario: DSAScenario = {
  id: "dsa-same-tree",
  title: "Same Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
  description: "Check if two binary trees are structurally identical.",
  tags: ["tree", "dfs", "bfs", "recursion"],
  estimatedTime: 10,
  problemStatement: `Given the roots of two binary trees p and q, write a function to check if they are the same or not.

Two binary trees are considered the same if they are structurally identical, and the nodes have the same value.

Example visualization:

  Tree p:     Tree q:      Result:
     1           1
    / \\         / \\        TRUE ✓
   2   3       2   3       (identical)

  Tree p:     Tree q:      Result:
     1           1
    /             \\        FALSE ✗
   2               2       (different structure)`,
  examples: [
    {
      input: "p = [1,2,3], q = [1,2,3]",
      output: "true",
    },
    {
      input: "p = [1,2], q = [1,null,2]",
      output: "false",
    },
    {
      input: "p = [1,2,1], q = [1,1,2]",
      output: "false",
    },
  ],
  constraints: [
    "The number of nodes in both trees is in the range [0, 100].",
    "-10^4 <= Node.val <= 10^4",
  ],
  hints: [
    "Compare nodes recursively: value, left subtree, right subtree",
    "Base case: both null = true, one null = false",
    "Two nodes are same if values match AND subtrees match",
  ],
  starterCode: {
    javascript: `function isSameTree(p, q) {
// Compare trees recursively
}`,
    typescript: `function isSameTree(p: TreeNode | null, q: TreeNode | null): boolean {
// Compare trees recursively
}`,
    python: `def isSameTree(p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
  # Compare trees recursively
  pass`,
    java: `class Solution {
  public boolean isSameTree(TreeNode p, TreeNode q) {
      // Compare trees recursively
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
      input: { p: [1, 2, 3], q: [1, 2, 3] },
      expected: true,
      description: "Identical trees",
    },
    {
      input: { p: [1, 2], q: [1, null, 2] },
      expected: false,
      description: "Different structure",
    },
    {
      input: { p: [1, 2, 1], q: [1, 1, 2] },
      expected: false,
      description: "Different values",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What if both trees are empty?",
    "What if one tree is empty and the other isn't?",
    "How many comparisons do you need in the worst case?",
    "Could two different trees have the same inorder traversal?",
  ],

  midCodingProbes: [
    {
      trigger: "checking null conditions",
      question: "What are all the cases for null comparisons?",
    },
    {
      trigger: "comparing values",
      question: "If values match, is that enough to say the trees are the same?",
    },
  ],
}
