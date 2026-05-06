import type { DSAScenario } from "../../types"

export const dsaSortColorsScenario: DSAScenario = {
  id: "dsa-sort-colors",
  title: "Sort Colors",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "medium",
  companies: ["Amazon", "Microsoft", "Meta", "Apple", "NVIDIA"],
  description: "Sort array with only 0, 1, 2 in one pass (Dutch National Flag)",
  tags: ["array", "two-pointers", "sorting"],
  estimatedTime: 20,
  problemStatement: `Given an array nums with n objects colored red, white, or blue, sort them in-place so that objects of the same color are adjacent, with the colors in the order red, white, and blue.

We will use the integers 0, 1, and 2 to represent the color red, white, and blue, respectively.

You must solve this problem without using the library's sort function.

Follow up: Could you come up with a one-pass algorithm using only constant extra space?`,
  examples: [
    {
      input: "nums = [2,0,2,1,1,0]",
      output: "[0,0,1,1,2,2]",
    },
    {
      input: "nums = [2,0,1]",
      output: "[0,1,2]",
    },
  ],
  constraints: ["n == nums.length", "1 <= n <= 300", "nums[i] is either 0, 1, or 2"],
  hints: [
    "Use three pointers: low, mid, high",
    "All 0s should be before low, all 2s after high",
    "Dutch National Flag algorithm by Dijkstra",
  ],
  starterCode: {
    javascript: `function sortColors(nums) {
  // Write your solution here

}`,
    typescript: `function sortColors(nums: number[]): void {
  // Write your solution here

}`,
    python: `def sort_colors(nums):
    # Write your solution here
    pass`,
    java: `class Solution {
    public void sortColors(int[] nums) {
        // Write your solution here
    }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { nums: [2, 0, 2, 1, 1, 0] },
      expected: [0, 0, 1, 1, 2, 2],
      description: "Standard case",
    },
    { input: { nums: [2, 0, 1] }, expected: [0, 1, 2], description: "Three elements" },
  ],
}
