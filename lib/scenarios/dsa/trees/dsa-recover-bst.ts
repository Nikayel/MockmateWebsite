import type { DSAScenario } from "../../types"

export const recoverBstScenario: DSAScenario = {
  id: "dsa-recover-bst",
  title: "Recover Binary Search Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Microsoft", "Bloomberg"],
  description: "Swap back the two values that broke a BST",
  tags: ["binary-search-tree", "dfs", "inorder", "morris-traversal"],
  estimatedTime: 30,
  problemStatement: `You're handed the root of a binary search tree that was damaged in one specific way: the values of exactly two of its nodes got traded with each other. Nothing else moved, and the tree's shape is still the intended one.

Recall what a healthy BST promises: inside any node's left subtree every value stays strictly below that node's value, and inside its right subtree every value stays strictly above it. Restore that promise by putting the two traded values back where they belong. Adjust values only; every parent-child link must remain exactly as it is.`,
  examples: [
    {
      input: "root = [2,6,null,null,4]",
      output: "[6,2,null,null,4]",
      explanation: "6 and 2 traded places",
    },
    {
      input: "root = [7,2,9,null,null,5]",
      output: "[5,2,9,null,null,7]",
      explanation: "7 and 5 traded places",
    },
  ],
  constraints: [
    "Node count sits between 2 and 1000.",
    "Values can be as low as -2^31 and as high as 2^31 - 1.",
  ],
  hints: [
    "Inorder traversal should be sorted",
    "Find two nodes out of place",
    "First bad: prev > curr (prev is first swap)",
    "Second bad: prev > curr again (curr is second swap)",
    "Morris traversal for O(1) space",
  ],
  starterCode: {
    javascript: `function recoverTree(root) {\n  // Find and swap two nodes\n}`,
    typescript: `function recoverTree(root: TreeNode | null): void {\n  // Find and swap two nodes\n}`,
    python: `def recoverTree(root: Optional[TreeNode]) -> None:\n    # Find and swap two nodes\n    pass`,
    java: `class Solution {\n    public void recoverTree(TreeNode root) {\n        // Find and swap two nodes\n    }\n}`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1) with Morris" },
  testCases: [
    {
      input: { root: [1, 3, null, null, 2] },
      expected: [3, 1, null, null, 2],
      description: "Adjacent swap",
    },
    {
      input: { root: [3, 1, 4, null, null, 2] },
      expected: [2, 1, 4, null, null, 3],
      description: "Non-adjacent swap",
    },
  ],
}
