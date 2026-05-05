import type { DSAScenario } from "../../types"

export const recoverBstScenario: DSAScenario = {
  id: "dsa-recover-bst",
  title: "Recover Binary Search Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Microsoft", "Bloomberg"],
  description: "Recover BST where exactly two nodes were swapped",
  tags: ["binary-search-tree", "dfs", "inorder", "morris-traversal"],
  estimatedTime: 30,
  problemStatement: `You are given the root of a binary search tree (BST), where the values of exactly two nodes of the tree were swapped by mistake. Recover the tree without changing its structure.`,
  examples: [
    {
      input: "root = [1,3,null,null,2]",
      output: "[3,1,null,null,2]",
      explanation: "3 and 1 are swapped",
    },
    {
      input: "root = [3,1,4,null,null,2]",
      output: "[2,1,4,null,null,3]",
      explanation: "2 and 3 are swapped",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [2, 1000].",
    "-2^31 <= Node.val <= 2^31 - 1",
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
