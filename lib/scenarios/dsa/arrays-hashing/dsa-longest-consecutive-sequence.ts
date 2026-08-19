import type { DSAScenario } from "../../types"

export const dsaLongestConsecutiveSequenceScenario: DSAScenario = {
  id: "dsa-longest-consecutive-sequence",
  title: "Longest Consecutive Sequence",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "medium",
  companies: ["Google", "Meta", "Amazon", "TikTok", "Snap", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Measure the longest run of consecutive integers present in an array",
  tags: ["array", "hash-table", "union-find"],
  estimatedTime: 25,
  problemStatement: `You're given an integer array nums, not sorted in any way. Find the longest stretch of consecutive integers, values that follow one another with no gaps, where every value in the stretch appears somewhere in nums. Return the length of that stretch.

Your solution needs to finish in O(n) time.`,
  examples: [
    {
      input: "nums = [7,52,6,400,5,9]",
      output: "3",
      explanation:
        "The longest run of consecutive values present is [5, 6, 7], so the answer is 3.",
    },
    {
      input: "nums = [4,7,1,6,2,5,3,7,8]",
      output: "8",
    },
  ],
  constraints: [
    "nums can hold anywhere from 0 to 10^5 entries.",
    "Values range from -10^9 to 10^9.",
  ],
  hints: [
    "Use a Set for O(1) lookups",
    "For each number, check if it's the start of a sequence (num-1 not in set)",
    "If it's a start, count the consecutive numbers",
  ],
  starterCode: {
    javascript: `function longestConsecutive(nums) {
  // Write your solution here

}`,
    typescript: `function longestConsecutive(nums: number[]): number {
  // Write your solution here

}`,
    python: `def longestConsecutive(nums):
    # Write your solution here
    pass`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(n)",
  },
  testCases: [
    {
      input: { nums: [100, 4, 200, 1, 3, 2] },
      expected: 4,
      description: "Unsorted with sequence [1,2,3,4]",
    },
    {
      input: { nums: [0, 3, 7, 2, 5, 8, 4, 6, 0, 1] },
      expected: 9,
      description: "Long sequence with duplicates",
    },
    {
      input: { nums: [1, 2, 0, 1] },
      expected: 3,
      description: "Sequence [0,1,2] with duplicate",
    },
    {
      input: { nums: [] },
      expected: 0,
      description: "Empty array",
    },
    {
      input: { nums: [9, 1, 4, 7, 3, 2, 8, 5, 6] },
      expected: 9,
      description: "Full consecutive sequence [1-9]",
    },
  ],
}
