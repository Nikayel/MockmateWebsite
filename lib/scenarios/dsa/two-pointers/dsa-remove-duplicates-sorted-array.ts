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
  problemStatement: `Given an integer array nums sorted in non-decreasing order, remove the duplicates in-place such that each unique element appears only once. The relative order of the elements should be kept the same. Then return the number of unique elements in nums.

Consider the number of unique elements of nums to be k. To get accepted, you need to:
- Change the array nums such that the first k elements contain the unique elements in the order they were present originally.
- Return k.`,
  examples: [
    {
      input: "nums = [1,1,2]",
      output: "2, nums = [1,2,_]",
      explanation: "Function returns k = 2, with first two elements being 1 and 2.",
    },
    {
      input: "nums = [0,0,1,1,1,2,2,3,3,4]",
      output: "5, nums = [0,1,2,3,4,_,_,_,_,_]",
      explanation: "Function returns k = 5.",
    },
  ],
  constraints: [
    "1 <= nums.length <= 3 * 10^4",
    "-100 <= nums[i] <= 100",
    "nums is sorted in non-decreasing order",
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
