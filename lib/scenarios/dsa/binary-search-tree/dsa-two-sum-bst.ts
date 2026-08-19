import type { DSAScenario } from "../../types"

export const dsaTwoSumBstScenario: DSAScenario = {
  id: "dsa-two-sum-bst",
  title: "Two Sum IV - Input is a BST",
  type: "dsa",
  pattern: "binary-search-tree",
  difficulty: "easy",
  companies: ["Amazon", "Meta", "Google"],
  description: "Find if two nodes in BST sum to target value",
  tags: ["tree", "bst", "two-pointers", "hash-table"],
  estimatedTime: 20,
  problemStatement: `You're given the root of a binary search tree and an integer k. Decide whether two nodes in the tree hold values that sum to exactly k, returning true when such a pair exists and false otherwise.

The pair must consist of two distinct nodes. A single node never pairs with itself, so a value only contributes twice when the tree genuinely stores it on two nodes.`,
  examples: [
    {
      input: "root = [11,6,14,3,8,null,17], k = 17",
      output: "true",
      explanation: "3 + 14 = 17, and 6 + 11 = 17 works as well.",
    },
    {
      input: "root = [11,6,14,3,8,null,17], k = 33",
      output: "false",
    },
  ],
  constraints: [
    "Between 1 and 10^4 nodes are present",
    "Stored values satisfy -10^4 <= Node.val <= 10^4",
    "The tree rooted at root is always a valid binary search tree",
    "The target obeys -10^5 <= k <= 10^5",
  ],
  hints: [
    "Use inorder traversal to get sorted array, then use two pointers",
    "Alternative: use a hash set during traversal",
    "For each node, check if (k - node.val) exists in the tree",
  ],
  starterCode: {
    javascript: `function findTarget(root, k) {
  // Write your solution here

}`,
    typescript: `function findTarget(root: TreeNode | null, k: number): boolean {
  // Write your solution here

}`,
    python: `def find_target(root, k):
    # Write your solution here
    pass`,
    java: `class Solution {
    public boolean findTarget(TreeNode root, int k) {
        // Write your solution here
        return false;
    }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(n)",
  },
  testCases: [
    {
      input: { root: [5, 3, 6, 2, 4, null, 7], k: 9 },
      expected: true,
      description: "Target exists",
    },
    {
      input: { root: [5, 3, 6, 2, 4, null, 7], k: 28 },
      expected: false,
      description: "Target does not exist",
    },
    // Two cases were not enough to pin the problem down. k = 9 happens to be both the
    // smallest plus the largest value AND a pair of neighbours in sorted order, so
    // "check min + max" and "check adjacent pairs only" both passed; and no case asked for
    // a k that a single node could reach on its own.
    {
      input: { root: [5, 3, 6, 2, 4, null, 7], k: 4 },
      expected: false,
      description: "2 + 2 would reach k, but one node cannot be used twice",
    },
    {
      input: { root: [5, 3, 6, 2, 4, null, 7], k: 10 },
      expected: true,
      description: "The pair (3, 7) is neither adjacent in order nor the min and max",
    },
  ],
}
