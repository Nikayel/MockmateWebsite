import type { DSAScenario } from "../../types"

export const dsaLongestConsecutiveSequenceScenario: DSAScenario = {
  id: "dsa-longest-consecutive-sequence",
  title: "Longest Consecutive Sequence",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "medium",
  companies: ["Google", "Meta", "Amazon", "TikTok", "Snap", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe"],
  description: "Find the length of the longest consecutive elements sequence",
  tags: ["array", "hash-table", "union-find"],
  estimatedTime: 25,
  problemStatement: `Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence.

You must write an algorithm that runs in O(n) time.`,
  examples: [
    {
      input: "nums = [100,4,200,1,3,2]",
      output: "4",
      explanation:
        "The longest consecutive elements sequence is [1, 2, 3, 4]. Therefore its length is 4.",
    },
    {
      input: "nums = [0,3,7,2,5,8,4,6,0,1]",
      output: "9",
    },
  ],
  constraints: ["0 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
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
