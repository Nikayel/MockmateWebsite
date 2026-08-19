import type { DSAScenario } from "../../types"

export const sameTreeScenario: DSAScenario = {
  id: "dsa-same-tree",
  title: "Same Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
  description: "Check whether two binary trees match in shape and values.",
  tags: ["tree", "dfs", "bfs", "recursion"],
  estimatedTime: 10,
  problemStatement: `You're given two binary trees by their roots, p and q. Decide whether they're carbon copies of each other: every position that holds a node in one must hold a node in the other, and matching positions must carry equal values. Return true for a perfect match, false for any difference in shape or contents.

\`\`\`
  p:          q:
     7           7
    / \\         / \\
   4   9       4   9
\`\`\`

These two agree everywhere, so the answer is true. If q instead hung its 4 on the right side while p kept it on the left, the values alone wouldn't save it: the shapes differ, so the answer would be false.`,
  examples: [
    {
      input: "p = [7,4,9], q = [7,4,9]",
      output: "true",
    },
    {
      input: "p = [7,4], q = [7,null,4]",
      output: "false",
    },
    {
      input: "p = [5,8,5], q = [5,5,8]",
      output: "false",
    },
  ],
  constraints: ["Each tree holds from 0 to 100 nodes.", "Node values lie between -10^4 and 10^4."],
  hints: [
    "Compare nodes recursively: value, left subtree, right subtree",
    "Base case: both null = true, one null = false",
    "Two nodes are same if values match AND subtrees match",
  ],
  starterCode: {
    javascript: `function isSameTree(p, q) {
// Write your solution here
}`,
    typescript: `function isSameTree(p: TreeNode | null, q: TreeNode | null): boolean {
// Write your solution here
}`,
    python: `def isSameTree(p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
  # Write your solution here
  pass`,
    java: `class Solution {
  public boolean isSameTree(TreeNode p, TreeNode q) {
      // Write your solution here
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
