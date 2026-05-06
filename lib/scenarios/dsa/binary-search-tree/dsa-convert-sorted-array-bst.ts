import type { DSAScenario } from "../../types"

export const dsaConvertSortedArrayBstScenario: DSAScenario = {
  id: "dsa-convert-sorted-array-bst",
  title: "Convert Sorted Array to Binary Search Tree",
  type: "dsa",
  pattern: "binary-search-tree",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Microsoft", "Apple"],
  description: "Convert sorted array to height-balanced BST",
  tags: ["tree", "bst", "divide-and-conquer", "array"],
  estimatedTime: 20,
  problemStatement: `Given an integer array nums where the elements are sorted in ascending order, convert it to a height-balanced binary search tree.

A height-balanced binary tree is a binary tree in which the depth of the two subtrees of every node never differs by more than one.

Example visualization:

    nums = [-10, -3, 0, 5, 9]
                    ↑
                  middle

    Choose middle as root, recursively build:

              0          ← middle of [-10,-3,0,5,9]
             / \\
           -3   9        ← middles of halves
           /   /
        -10   5

    Result: Balanced BST with height ≈ log(n)`,
  examples: [
    {
      input: "nums = [-10,-3,0,5,9]",
      output: "[0,-3,9,-10,null,5]",
      explanation: "One valid BST is [0,-3,9,-10,null,5].",
    },
    {
      input: "nums = [1,3]",
      output: "[3,1] or [1,null,3]",
      explanation: "Either tree is valid.",
    },
  ],
  constraints: [
    "1 <= nums.length <= 10^4",
    "-10^4 <= nums[i] <= 10^4",
    "nums is sorted in strictly increasing order",
  ],
  hints: [
    "Choose middle element as root for balance",
    "Recursively build left subtree from left half",
    "Recursively build right subtree from right half",
  ],
  starterCode: {
    javascript: `function sortedArrayToBST(nums) {
  // Write your solution here

}`,
    typescript: `function sortedArrayToBST(nums: number[]): TreeNode | null {
  // Write your solution here

}`,
    python: `def sorted_array_to_bst(nums):
    # Write your solution here
    pass`,
    java: `class Solution {
    public TreeNode sortedArrayToBST(int[] nums) {
        // Write your solution here
        return null;
    }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(log n)",
  },
  testCases: [
    {
      input: { nums: [-10, -3, 0, 5, 9] },
      expected: "valid BST",
      description: "Build balanced BST",
    },
    { input: { nums: [1, 3] }, expected: "valid BST", description: "Two elements" },
  ],
}
