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
  problemStatement: `You're given the root of a binary search tree plus two integers, low and high, which mark out an inclusive band [low, high]. Add up every stored value v satisfying low <= v <= high, endpoints included, and return that total.

Take low = 9 and high = 23 on this tree:

\`\`\`
       16
      /  \\
     9    23
    / \\     \\
   4  12     27
\`\`\`

The values 9, 12, 16, and 23 fall inside the band, so the correct return value is 60.`,
  examples: [
    {
      input: "root = [16,9,23,4,12,null,27], low = 9, high = 23",
      output: "60",
      explanation: "9, 12, 16, and 23 land inside [9, 23]; together they total 60.",
    },
    {
      input: "root = [16,9,23,4,12,20,27,2,null,10], low = 10, high = 16",
      output: "38",
      explanation: "Only 10, 12, and 16 qualify, and 10 + 12 + 16 = 38.",
    },
  ],
  constraints: [
    "Node count runs from 1 up to 2 * 10^4",
    "Each stored value obeys 1 <= Node.val <= 10^5",
    "The band satisfies 1 <= low <= high <= 10^5",
    "No value appears twice in the tree",
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
