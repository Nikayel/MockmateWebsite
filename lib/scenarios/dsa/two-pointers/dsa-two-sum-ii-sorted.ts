import type { DSAScenario } from "../../types"

export const dsaTwoSumIiSortedScenario: DSAScenario = {
  id: "dsa-two-sum-ii-sorted",
  title: "Two Sum II - Input Array Is Sorted",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Find two numbers in sorted array that add up to target",
  tags: ["array", "two-pointers", "binary-search"],
  estimatedTime: 15,
  problemStatement: `Given a 1-indexed array of integers numbers that is already sorted in non-decreasing order, find two numbers such that they add up to a specific target number. Let these two numbers be numbers[index1] and numbers[index2] where 1 <= index1 < index2 <= numbers.length.

Return the indices of the two numbers, index1 and index2, added by one as an integer array [index1, index2] of length 2.

The tests are generated such that there is exactly one solution. You may not use the same element twice.

Your solution must use only constant extra space.`,
  examples: [
    {
      input: "numbers = [2,7,11,15], target = 9",
      output: "[1,2]",
      explanation: "The sum of 2 and 7 is 9. Therefore, index1 = 1, index2 = 2.",
    },
    { input: "numbers = [2,3,4], target = 6", output: "[1,3]" },
    { input: "numbers = [-1,0], target = -1", output: "[1,2]" },
  ],
  constraints: [
    "2 <= numbers.length <= 3 * 10^4",
    "-1000 <= numbers[i] <= 1000",
    "numbers is sorted in non-decreasing order",
    "-1000 <= target <= 1000",
    "The tests are generated such that there is exactly one solution",
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
