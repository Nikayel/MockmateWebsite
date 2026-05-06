import type { DSAScenario } from "../../types"

export const dsaMoveZeroesScenario: DSAScenario = {
  id: "dsa-move-zeroes",
  title: "Move Zeroes",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "easy",
  companies: ["Meta", "Amazon", "Apple", "Microsoft"],
  description: "Move all zeroes to end while maintaining order",
  tags: ["array", "two-pointers"],
  estimatedTime: 15,
  problemStatement: `Given an integer array nums, move all 0's to the end of it while maintaining the relative order of the non-zero elements.

Note that you must do this in-place without making a copy of the array.`,
  examples: [
    {
      input: "nums = [0,1,0,3,12]",
      output: "[1,3,12,0,0]",
    },
    {
      input: "nums = [0]",
      output: "[0]",
    },
  ],
  constraints: ["1 <= nums.length <= 10^4", "-2^31 <= nums[i] <= 2^31 - 1"],
  hints: [
    "Use two pointers: one for next non-zero position, one to scan",
    "Swap non-zero elements to the front",
    "All zeroes naturally end up at the end",
  ],
  starterCode: {
    javascript: `function moveZeroes(nums) {
  // Write your solution here

}`,
    typescript: `function moveZeroes(nums: number[]): void {
  // Write your solution here

}`,
    python: `def move_zeroes(nums):
    # Write your solution here
    pass`,
    java: `class Solution {
    public void moveZeroes(int[] nums) {
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
      input: { nums: [0, 1, 0, 3, 12] },
      expected: [1, 3, 12, 0, 0],
      description: "Standard case",
    },
    { input: { nums: [0] }, expected: [0], description: "Single zero" },
  ],
}
