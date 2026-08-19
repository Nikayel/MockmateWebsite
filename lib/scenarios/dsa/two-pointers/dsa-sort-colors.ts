import type { DSAScenario } from "../../types"

export const dsaSortColorsScenario: DSAScenario = {
  id: "dsa-sort-colors",
  title: "Sort Colors",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "medium",
  companies: ["Amazon", "Microsoft", "Meta", "Apple", "NVIDIA"],
  description: "Sort an array of 0s, 1s, and 2s in place without a library sort",
  tags: ["array", "sorting", "two-pointers"],
  estimatedTime: 20,
  problemStatement: `You're given an array nums describing n objects, each painted red, white, or blue. The colors are encoded as integers: 0 for red, 1 for white, 2 for blue. Rearrange nums in place until objects sharing a color sit side by side, reds first, whites next, blues last, then return nums.

Calling your language's built-in sort is off the table.

Follow up: can you finish the job in a single pass while keeping extra memory constant?`,
  examples: [
    {
      input: "nums = [2,1,0,1,0,1]",
      output: "[0,0,1,1,1,2]",
    },
    {
      input: "nums = [0,2,1,2]",
      output: "[0,1,2,2]",
    },
  ],
  constraints: [
    "n equals the length of nums",
    "n lies between 1 and 300",
    "each entry of nums is 0, 1, or 2",
  ],
  hints: [
    "Use three pointers: low, mid, high",
    "All 0s should be before low, all 2s after high",
    "Dutch National Flag algorithm by Dijkstra",
  ],
  starterCode: {
    javascript: `function sortColors(nums) {
  // Write your solution here

}`,
    typescript: `function sortColors(nums: number[]): number[] {
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
