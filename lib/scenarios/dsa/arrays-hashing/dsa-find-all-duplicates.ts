import type { DSAScenario } from "../../types"

export const dsaFindAllDuplicatesScenario: DSAScenario = {
  id: "dsa-find-all-duplicates",
  title: "Find All Duplicates in an Array",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Find all duplicates in O(n) time and O(1) extra space",
  tags: ["array", "hash-table"],
  estimatedTime: 20,
  problemStatement: `Given an integer array nums of length n where all the integers of nums are in the range [1, n] and each integer appears once or twice, return an array of all the integers that appear twice.

You must write an algorithm that runs in O(n) time and uses only constant extra space.`,
  examples: [
    { input: "nums = [4,3,2,7,8,2,3,1]", output: "[2,3]" },
    { input: "nums = [1,1,2]", output: "[1]" },
    { input: "nums = [1]", output: "[]" },
  ],
  constraints: [
    "n == nums.length",
    "1 <= n <= 10^5",
    "1 <= nums[i] <= n",
    "Each element in nums appears once or twice",
  ],
  hints: [
    "Use the array itself as a hash table",
    "For each num, mark nums[abs(num)-1] as negative",
    "If already negative, it is a duplicate",
  ],
  starterCode: {
    javascript: `function findDuplicates(nums) {\n  // Write your solution here\n\n}`,
    typescript: `function findDuplicates(nums: number[]): number[] {\n  // Write your solution here\n\n}`,
    python: `def findDuplicates(nums):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    {
      input: { nums: [4, 3, 2, 7, 8, 2, 3, 1] },
      expected: [2, 3],
      description: "Multiple duplicates",
    },
    { input: { nums: [1, 1, 2] }, expected: [1], description: "Single duplicate" },
    { input: { nums: [1] }, expected: [], description: "No duplicates" },
  ],
}
