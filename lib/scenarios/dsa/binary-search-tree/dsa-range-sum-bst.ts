import type { DSAScenario } from "../../types"

export const dsaRangeSumBstScenario: DSAScenario = {
  id: "dsa-range-sum-bst",
  title: "Range Sum of BST",
  type: "dsa",
  pattern: "binary-search-tree",
  difficulty: "easy",
  companies: ["Meta", "Amazon", "Google"],
  description: "Calculate sum of values within a range in BST",
  tags: ["tree", "bst", "dfs"],
  estimatedTime: 15,
  problemStatement: `Given the root node of a binary search tree and two integers low and high, return the sum of values of all nodes with a value in the inclusive range [low, high].

Example, with low = 7 and high = 15:

\`\`\`
       10
      /  \\
     5   15
    / \\    \\
   3   7    18
\`\`\`

The values inside the range are 7, 10 and 15, so the answer is 32.`,
  examples: [
    {
      input: "root = [10,5,15,3,7,null,18], low = 7, high = 15",
      output: "32",
      explanation: "Nodes 7, 10, and 15 are in range [7, 15]. 7 + 10 + 15 = 32.",
    },
    {
      input: "root = [10,5,15,3,7,13,18,1,null,6], low = 6, high = 10",
      output: "23",
      explanation: "Nodes 6, 7, and 10 are in range [6, 10]. 6 + 7 + 10 = 23.",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in range [1, 2 * 10^4]",
    "1 <= Node.val <= 10^5",
    "1 <= low <= high <= 10^5",
    "All Node.val are unique",
  ],
  hints: [
    "Use BST property to prune search space",
    "If node value < low, only search right subtree",
    "If node value > high, only search left subtree",
  ],
  starterCode: {
    javascript: `function rangeSumBST(root, low, high) {
  // Write your solution here

}`,
    typescript: `function rangeSumBST(root: TreeNode | null, low: number, high: number): number {
  // Write your solution here

}`,
    python: `def range_sum_bst(root, low, high):
    # Write your solution here
    pass`,
    java: `class Solution {
    public int rangeSumBST(TreeNode root, int low, int high) {
        // Write your solution here
        return 0;
    }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(h)",
  },
  testCases: [
    {
      input: { root: [10, 5, 15, 3, 7, null, 18], low: 7, high: 15 },
      expected: 32,
      description: "Standard range",
    },
    {
      input: { root: [10, 5, 15, 3, 7, 13, 18, 1, null, 6], low: 6, high: 10 },
      expected: 23,
      description: "Another range",
    },
  ],
}
