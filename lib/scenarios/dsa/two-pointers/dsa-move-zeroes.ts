import type { DSAScenario } from "../../types"

export const dsaMoveZeroesScenario: DSAScenario = {
  id: "dsa-move-zeroes",
  title: "Move Zeroes",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "easy",
  companies: ["Meta", "Amazon", "Apple", "Microsoft"],
  description: "Send every zero to the back while the other values keep their order",
  tags: ["array", "two-pointers"],
  estimatedTime: 15,
  problemStatement: `You're given an integer array nums. Shift every 0 it contains to the tail of the array, keeping the remaining values in the same relative order they started in.

Work inside nums itself; building a copy of the array is off limits. Return nums when you're done.`,
  examples: [
    {
      input: "nums = [6,0,0,5,9]",
      output: "[6,5,9,0,0]",
    },
    {
      input: "nums = [0,0]",
      output: "[0,0]",
    },
  ],
  constraints: [
    "nums holds between 1 and 10^4 values",
    "each nums[i] lies in the range -2^31 to 2^31 - 1",
  ],
  hints: [
    "Use two pointers: one for next non-zero position, one to scan",
    "Swap non-zero elements to the front",
    "All zeroes naturally end up at the end",
  ],
  starterCode: {
    javascript: `function moveZeroes(nums) {
  // Write your solution here

}`,
    typescript: `function moveZeroes(nums: number[]): number[] {
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
