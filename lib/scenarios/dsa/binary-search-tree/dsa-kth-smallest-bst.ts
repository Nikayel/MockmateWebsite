import type { DSAScenario } from "../../types"

export const dsaKthSmallestBstScenario: DSAScenario = {
  id: "dsa-kth-smallest-bst",
  title: "Kth Smallest Element in BST",
  type: "dsa",
  pattern: "binary-search-tree",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Find the kth smallest element in a BST.",
  tags: ["tree", "dfs", "bst"],
  estimatedTime: 20,
  problemStatement: `Given the root of a binary search tree, and an integer k, return the kth smallest value (1-indexed) of all the values of the nodes in the tree.

Example visualization:

          5
         / \\
        3   6
       / \\
      2   4
     /
    1

    Inorder traversal (sorted): [1, 2, 3, 4, 5, 6]
                                 ↑  ↑  ↑
                                k=1 k=2 k=3

    k=1 → return 1
    k=3 → return 3`,
  examples: [
    {
      input: "root = [3,1,4,null,2], k = 1",
      output: "1",
    },
    {
      input: "root = [5,3,6,2,4,null,null,1], k = 3",
      output: "3",
    },
  ],
  constraints: [
    "The number of nodes in the tree is n.",
    "1 <= k <= n <= 10^4",
    "0 <= Node.val <= 10^4",
  ],
  hints: [
    "Inorder traversal of BST gives sorted order",
    "Return the kth element during inorder traversal",
    "Can optimize with counter variable",
  ],
  starterCode: {
    javascript: `function kthSmallest(root, k) {
  // Write your solution here

}`,
    typescript: `function kthSmallest(root: TreeNode | null, k: number): number {
  // Write your solution here

}`,
    python: `def kthSmallest(root, k):
    # Write your solution here
    pass`,
  },
  optimalComplexity: {
    time: "O(h + k)",
    space: "O(h)",
  },
  testCases: [
    {
      input: { root: [3, 1, 4, null, 2], k: 1 },
      expected: 1,
      description: "k=1, return smallest",
    },
    {
      input: { root: [5, 3, 6, 2, 4, null, null, 1], k: 3 },
      expected: 3,
      description: "k=3, third smallest",
    },
    {
      input: { root: [1], k: 1 },
      expected: 1,
      description: "Single node",
    },
    {
      input: { root: [2, 1, 3], k: 2 },
      expected: 2,
      description: "Root is kth smallest",
    },
  ],
}
