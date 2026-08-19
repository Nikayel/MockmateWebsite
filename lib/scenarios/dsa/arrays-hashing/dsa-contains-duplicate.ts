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
  problemStatement: `You're given an integer array nums. Decide whether any value shows up more than once: return true if some entry repeats anywhere in nums, and false when all entries are unique.`,
  examples: [
    {
      input: "nums = [5,9,2,9]",
      output: "true",
    },
    {
      input: "nums = [7,3,8,5]",
      output: "false",
    },
    {
      input: "nums = [6,6,6,2,2,8,2,4,8,4]",
      output: "true",
    },
  ],
  constraints: [
    "nums contains between 1 and 10^5 entries.",
    "Each entry falls somewhere between -10^9 and 10^9.",
  ],
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
