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
  problemStatement: `Given the root of a binary search tree and an integer k, return true if there exist two elements in the BST such that their sum is equal to k, or false otherwise.`,
  examples: [
    {
      input: "root = [5,3,6,2,4,null,7], k = 9",
      output: "true",
      explanation: "2 + 7 = 9 or 3 + 6 = 9",
    },
    {
      input: "root = [5,3,6,2,4,null,7], k = 28",
      output: "false",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in range [1, 10^4]",
    "-10^4 <= Node.val <= 10^4",
    "root is guaranteed to be a valid binary search tree",
    "-10^5 <= k <= 10^5",
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
  ],
}
