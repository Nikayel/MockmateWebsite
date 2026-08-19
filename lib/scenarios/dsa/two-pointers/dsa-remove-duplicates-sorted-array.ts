import type { DSAScenario } from "../../types"

export const dsaRemoveDuplicatesSortedArrayScenario: DSAScenario = {
  id: "dsa-remove-duplicates-sorted-array",
  title: "Remove Duplicates from Sorted Array",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Remove duplicates in-place from sorted array",
  tags: ["array", "two-pointers"],
  estimatedTime: 15,
  problemStatement: `You're given an integer array nums arranged in non-decreasing order. Compact it in place so every distinct value keeps exactly one occurrence, with those values staying in the order they first appeared. Then report how many distinct values nums holds.

Call that count k. A correct submission leaves the first k slots of nums holding the distinct values in their original order, and returns k. Whatever sits past those first k slots is ignored by the grader.`,
  examples: [
    {
      input: "nums = [4,4,7]",
      output: "2, nums = [4,7,_]",
      explanation: "The function returns k = 2, and the first two slots hold 4 and 7.",
    },
    {
      input: "nums = [2,2,3,5,5,5,6,6,8,8]",
      output: "5, nums = [2,3,5,6,8,_,_,_,_,_]",
      explanation: "The function returns k = 5.",
    },
  ],
  constraints: [
    "nums holds between 1 and 3 * 10^4 values",
    "each value lies between -100 and 100",
    "the values of nums arrive in non-decreasing order",
  ],
  hints: [
    "Use two pointers: slow for unique position, fast to scan",
    "When fast finds new element, copy to slow position",
    "Return slow + 1 as the count of unique elements",
  ],
  starterCode: {
    javascript: `function removeDuplicates(nums) {
  // Write your solution here

}`,
    typescript: `function removeDuplicates(nums: number[]): number {
  // Write your solution here

}`,
    python: `def remove_duplicates(nums):
    # Write your solution here
    pass`,
    java: `class Solution {
    public int removeDuplicates(int[] nums) {
        // Write your solution here
        return 0;
    }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(1)",
  },
  testCases: [
    { input: { nums: [1, 1, 2] }, expected: 2, description: "Simple case" },
    {
      input: { nums: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4] },
      expected: 5,
      description: "Multiple duplicates",
    },
  ],
}
