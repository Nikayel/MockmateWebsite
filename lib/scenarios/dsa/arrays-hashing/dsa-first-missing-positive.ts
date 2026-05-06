import type { DSAScenario } from "../../types"

export const dsaFirstMissingPositiveScenario: DSAScenario = {
  id: "dsa-first-missing-positive",
  title: "First Missing Positive",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta"],
  description: "Find smallest missing positive integer in O(n) time and O(1) space.",
  tags: ["array", "hash-table"],
  estimatedTime: 30,
  problemStatement: `Given an unsorted integer array nums, return the smallest missing positive integer. Must run in O(n) time and use O(1) auxiliary space.`,
  examples: [
    {
      input: "nums = [1,2,0]",
      output: "3",
    },
    {
      input: "nums = [3,4,-1,1]",
      output: "2",
    },
    {
      input: "nums = [7,8,9,11,12]",
      output: "1",
    },
  ],
  constraints: ["1 <= nums.length <= 10^5", "-2^31 <= nums[i] <= 2^31 - 1"],
  hints: [
    "Use array itself as hash table",
    "Place each number n at index n-1 if possible",
    "First index i where nums[i] != i+1 is the answer",
  ],
  starterCode: {
    javascript: `function firstMissingPositive(nums) {
  // Write your solution here

}`,
    typescript: `function firstMissingPositive(nums: number[]): number {
  // Write your solution here

}`,
    python: `def firstMissingPositive(nums):
    # Write your solution here
    pass`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { nums: [1, 2, 0] },
      expected: 3,
      description: "Missing 3 after consecutive 1,2",
    },
    {
      input: { nums: [3, 4, -1, 1] },
      expected: 2,
      description: "Missing 2 with negatives",
    },
    {
      input: { nums: [7, 8, 9, 11, 12] },
      expected: 1,
      description: "Missing 1 (no small positives)",
    },
    {
      input: { nums: [1] },
      expected: 2,
      description: "Single element array",
    },
    {
      input: { nums: [1, 2, 3, 4, 5] },
      expected: 6,
      description: "All consecutive, missing next",
    },
    // Edge cases
    {
      input: { nums: [2, 3, 4] },
      expected: 1,
      description: "Edge: Gap at beginning (missing 1)",
    },
    {
      input: { nums: [-5, -3, -1, 0] },
      expected: 1,
      description: "Edge: All negatives and zero",
    },
  ],
}
