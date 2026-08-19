import type { DSAScenario } from "../../types"

export const dsaKthSmallestBstScenario: DSAScenario = {
  id: "dsa-kth-smallest-bst",
  title: "Kth Smallest Element in BST",
  type: "dsa",
  pattern: "binary-search-tree",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Find the kth smallest element in a BST.",
  tags: ["tree", "bst", "dfs"],
  estimatedTime: 20,
  problemStatement: `You're given the root of a binary search tree and an integer k. Rank every value stored in the tree from smallest to largest, then return the value holding rank k, where k = 1 names the smallest.

\`\`\`
        20
       /  \\
     12    26
    /  \\
   8   16
  /
 6
\`\`\`

For the tree above, k = 1 gives 6 and k = 3 gives 12.`,
  examples: [
    {
      input: "root = [8,5,9,null,7], k = 1",
      output: "5",
    },
    {
      input: "root = [20,12,26,8,16,null,null,6], k = 3",
      output: "12",
    },
  ],
  constraints: [
    "Let n be the tree's node count.",
    "k satisfies 1 <= k <= n <= 10^4",
    "Values stay within 0 <= Node.val <= 10^4",
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
