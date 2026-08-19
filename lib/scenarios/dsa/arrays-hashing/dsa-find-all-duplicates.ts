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
  problemStatement: `You're given an integer array nums with n entries, and every value sits in the range [1, n]. No value shows up more than twice: each one appears either once or twice.

Collect every value that occurs two times and return those values as an array. Your solution needs to run in O(n) time while using only constant extra space.`,
  examples: [
    { input: "nums = [5,4,6,1,1,6,3,8]", output: "[1,6]" },
    { input: "nums = [2,3,3]", output: "[3]" },
    { input: "nums = [2,1]", output: "[]" },
  ],
  constraints: [
    "n is the size of nums",
    "n ranges from 1 to 10^5",
    "Every entry is at least 1 and at most n",
    "No value occurs more than two times; each shows up once or twice",
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
      // The statement sets no output order, so a first-seen-order answer ([3,2] from a
      // counting pass) is just as correct. Without this it was exact-compared and failed.
      compareAsSet: true,
      description: "Multiple duplicates",
    },
    { input: { nums: [1, 1, 2] }, expected: [1], description: "Single duplicate" },
    { input: { nums: [1] }, expected: [], description: "No duplicates" },
  ],
}
