import type { DSAScenario } from "../../types"

export const dsaTwoSumIiSortedScenario: DSAScenario = {
  id: "dsa-two-sum-ii-sorted",
  title: "Two Sum II - Input Array Is Sorted",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Locate the one pair in a sorted array summing to the target",
  tags: ["array", "two-pointers", "binary-search"],
  estimatedTime: 15,
  problemStatement: `You're given an integer array numbers arranged in non-decreasing order, together with an integer target. Exactly one pair of entries sums to target, and a pair can't reuse the same position twice.

This problem is 1-indexed. Return the pair's positions as a two-element array [index1, index2], where index1 < index2 and both count from 1.

Solve it without letting your extra space grow past a constant.`,
  examples: [
    {
      input: "numbers = [1,4,8,13], target = 12",
      output: "[2,3]",
      explanation: "4 + 8 = 12, so index1 = 2 and index2 = 3.",
    },
    { input: "numbers = [3,5,6], target = 9", output: "[1,3]" },
    { input: "numbers = [-4,1], target = -3", output: "[1,2]" },
  ],
  constraints: [
    "numbers holds between 2 and 3 * 10^4 entries",
    "each entry lies between -1000 and 1000",
    "the entries of numbers arrive in non-decreasing order",
    "target lies between -1000 and 1000",
    "every test hides exactly one valid pair",
  ],
  hints: [
    "Use two pointers: one at start, one at end",
    "If sum > target, move right pointer left",
    "If sum < target, move left pointer right",
  ],
  starterCode: {
    javascript: `function twoSum(numbers, target) {\n  // Write your solution here\n\n}`,
    typescript: `function twoSum(numbers: number[], target: number): number[] {\n  // Write your solution here\n\n}`,
    python: `def twoSum(numbers, target):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    {
      input: { numbers: [2, 7, 11, 15], target: 9 },
      expected: [1, 2],
      description: "Basic case",
    },
    { input: { numbers: [2, 3, 4], target: 6 }, expected: [1, 3], description: "Sum at ends" },
    {
      input: { numbers: [-1, 0], target: -1 },
      expected: [1, 2],
      description: "Negative numbers",
    },
  ],
}
