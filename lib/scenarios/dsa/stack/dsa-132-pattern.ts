import type { DSAScenario } from "../../types"

export const dsa132PatternScenario: DSAScenario = {
  id: "dsa-132-pattern",
  title: "132 Pattern",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Microsoft", "Apple"],
  description: "Decide whether any three positions of an array form a 132 pattern",
  tags: ["stack", "array", "monotonic-stack"],
  estimatedTime: 25,
  problemStatement: `You're given an integer array nums holding n values. A 132 pattern is any three positions i < j < k where nums[i] < nums[k] < nums[j]: the earliest of the three values is the smallest, the middle position carries the largest, and the final value lands strictly between them.

Return true if nums hides at least one such triple, and false if none exists.`,
  examples: [
    { input: "nums = [5,6,7,8]", output: "false", explanation: "No 132 pattern exists." },
    {
      input: "nums = [2,5,4,1]",
      output: "true",
      explanation: "There is a 132 pattern: [2, 5, 4].",
    },
    {
      input: "nums = [-2,6,3,1]",
      output: "true",
      explanation: "There are three 132 patterns: [-2, 6, 3], [-2, 6, 1] and [-2, 3, 1].",
    },
  ],
  constraints: [
    "nums holds exactly n entries",
    "n stays between 1 and 2 * 10^5",
    "every nums[i] lies within [-10^9, 10^9]",
  ],
  hints: [
    "Iterate from right to left",
    "Use stack to track potential 'k' values (the '2' in 132)",
    "Track the largest popped value as potential 'k'",
    "If current value < k, we found a valid i (the '1')",
  ],
  starterCode: {
    javascript: `function find132pattern(nums) {\n  // Write your solution here\n}`,
    typescript: `function find132pattern(nums: number[]): boolean {\n  // Write your solution here\n}`,
    python: `def find132pattern(nums: list[int]) -> bool:\n    # Write your solution here\n    pass`,
    java: `class Solution {\n    public boolean find132pattern(int[] nums) {\n        // Write your solution here\n        return false;\n    }\n}`,
  },
  optimalComplexity: { time: "O(n)", space: "O(n)" },
  testCases: [
    { input: { nums: [1, 2, 3, 4] }, expected: false, description: "Strictly increasing" },
    { input: { nums: [3, 1, 4, 2] }, expected: true, description: "Has 132 pattern" },
    { input: { nums: [-1, 3, 2, 0] }, expected: true, description: "Multiple patterns" },
    // In both true cases the three elements sat next to each other, so scanning consecutive
    // triples found them. Here the pattern is 1 (index 0), 4 (index 1), 3 (index 3).
    {
      input: { nums: [1, 4, 0, 3] },
      expected: true,
      description: "Pattern spans non-adjacent indices",
    },
    // And every false case was strictly increasing, so "does the array ever go down" passed.
    // A decreasing array goes down constantly and still has no 132 pattern.
    { input: { nums: [3, 2, 1] }, expected: false, description: "Decreasing, so still no pattern" },
  ],
}
