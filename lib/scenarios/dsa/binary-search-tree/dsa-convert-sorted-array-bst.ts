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
  problemStatement: `You're given nums, an integer array already sorted in ascending order. Turn it into a binary search tree that uses every element exactly once, then return the tree's root. One structural requirement applies: the result must be height-balanced, meaning the two subtrees under any node differ in height by at most one.

One height-balanced possibility for nums = [-7, -2, 3, 8, 12]:

\`\`\`
        3
       / \\
     -2   12
     /   /
   -7   8
\`\`\`

The shape is not unique. Your answer is accepted whenever it is a height-balanced BST holding exactly the values of nums.`,
  examples: [
    {
      input: "nums = [-7,-2,3,8,12]",
      output: "[3,-2,12,-7,null,8]",
      explanation:
        "One accepted tree; any other height-balanced arrangement of the same values also passes.",
    },
    {
      input: "nums = [2,6]",
      output: "[6,2] or [2,null,6]",
      explanation: "Both shapes are height-balanced, so either is accepted.",
    },
  ],
  constraints: [
    "nums holds at least 1 and at most 10^4 elements",
    "Each entry satisfies -10^4 <= nums[i] <= 10^4",
    "Entries appear in strictly increasing order, with no repeats",
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
  // `expected` here is ONE correct answer, shown to the candidate when a test fails. Grading
  // uses the balanced-bst-from-sorted property (lib/validators), because several different
  // balanced BSTs are correct depending on which midpoint the candidate picks. These used to
  // read `expected: "valid BST"`, a literal string no real solution could ever return.
  testCases: [
    {
      input: { nums: [-10, -3, 0, 5, 9] },
      expected: [0, -10, 5, null, -3, null, 9],
      description: "Build balanced BST",
    },
    {
      input: { nums: [1, 3] },
      expected: [1, null, 3],
      description: "Two elements",
    },
  ],
}
