import type { DSAScenario } from "../../types"

export const dsaTopKFrequentElementsScenario: DSAScenario = {
  id: "dsa-top-k-frequent-elements",
  title: "Top K Frequent Elements",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Apple", "Spotify", "TikTok", "Reddit", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe", "fdse"],
  description: "Find k most frequent elements in an array",
  tags: ["array", "hash-table", "heap", "bucket-sort"],
  estimatedTime: 25,
  problemStatement: `You're given an integer array nums and an integer k. Work out which k distinct values occur most often in nums and return those k values. Any ordering of them is fine.`,
  examples: [
    { input: "nums = [7,7,7,4,4,9], k = 2", output: "[7,4]" },
    { input: "nums = [5], k = 1", output: "[5]" },
  ],
  constraints: [
    "nums holds between 1 and 10^5 values.",
    "Each value lies between -10^4 and 10^4.",
    "k never exceeds the number of distinct values, and it is at least 1.",
    "Exactly one correct set of k values exists for each input.",
  ],
  hints: [
    "Count frequencies with a HashMap",
    "Use bucket sort: index = frequency, value = list of nums",
    "Alternative: min-heap of size k for O(n log k)",
  ],
  starterCode: {
    javascript: `function topKFrequent(nums, k) {\n  // Write your solution here\n\n}`,
    typescript: `function topKFrequent(nums: number[], k: number): number[] {\n  // Write your solution here\n\n}`,
    python: `def topKFrequent(nums, k):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(n)" },
  // Every case is compared as a set: the answer may be returned in any order, so a heap-based
  // solution that emits [2,1] is as correct as a count-sorted one that emits [1,2].
  //
  // The first three cases also shared a flaw: the k most frequent values happened to be the
  // first k distinct values AND the k smallest, so "take the first k you see" and
  // "take the k smallest" both passed. The last case separates all three.
  testCases: [
    {
      input: { nums: [1, 1, 1, 2, 2, 3], k: 2 },
      expected: [1, 2],
      description: "Top 2 frequent",
      compareAsSet: true,
    },
    { input: { nums: [1], k: 1 }, expected: [1], description: "Single element" },
    {
      input: { nums: [1, 2], k: 2 },
      expected: [1, 2],
      description: "All unique, same frequency",
      compareAsSet: true,
    },
    {
      input: { nums: [1, 2, 2, 3, 3, 3], k: 2 },
      expected: [3, 2],
      description: "Most frequent are neither the first seen nor the smallest",
      compareAsSet: true,
    },
  ],
}
