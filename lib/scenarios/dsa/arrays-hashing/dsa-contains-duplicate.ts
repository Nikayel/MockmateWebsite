import type { DSAScenario } from "../../types"

export const dsaContainsDuplicateScenario: DSAScenario = {
  id: "dsa-contains-duplicate",
  title: "Contains Duplicate",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Apple", "TikTok", "Reddit", "ZipRecruiter"],
  description: "Determine if an array contains any duplicates",
  tags: ["array", "hash-table", "sorting"],
  estimatedTime: 10,
  problemStatement: `Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.`,
  examples: [
    {
      input: "nums = [1,2,3,1]",
      output: "true",
    },
    {
      input: "nums = [1,2,3,4]",
      output: "false",
    },
    {
      input: "nums = [1,1,1,3,3,4,3,2,4,2]",
      output: "true",
    },
  ],
  constraints: ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
  hints: [
    "Use a Set to track seen numbers",
    "As you iterate, check if the number is already in the set",
  ],
  starterCode: {
    javascript: `function containsDuplicate(nums) {
  // Write your solution here

}`,
    typescript: `function containsDuplicate(nums: number[]): boolean {
  // Write your solution here

}`,
    python: `def containsDuplicate(nums):
    # Write your solution here
    pass`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(n)",
  },
  testCases: [
    {
      input: { nums: [1, 2, 3, 1] },
      expected: true,
      description: "Basic case with duplicate: [1,2,3,1]",
    },
    {
      input: { nums: [1, 2, 3, 4] },
      expected: false,
      description: "No duplicates: [1,2,3,4]",
    },
    {
      input: { nums: [1, 1, 1, 3, 3, 4, 3, 2, 4, 2] },
      expected: true,
      description: "Multiple duplicates",
    },
    {
      input: { nums: [1] },
      expected: false,
      description: "Single element",
    },
    {
      input: { nums: [1, 1] },
      expected: true,
      description: "Two identical elements",
    },
  ],
}
