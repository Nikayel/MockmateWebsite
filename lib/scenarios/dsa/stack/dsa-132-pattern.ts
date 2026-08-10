import type { DSAScenario } from "../../types"

export const dsa132PatternScenario: DSAScenario = {
  id: "dsa-132-pattern",
  title: "132 Pattern",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Microsoft", "Apple"],
  description: "Find if there exists a 132 pattern in array",
  tags: ["stack", "array", "monotonic-stack"],
  estimatedTime: 25,
  problemStatement: `Given an array of n integers nums, a 132 pattern is a subsequence of three integers nums[i], nums[j] and nums[k] such that i < j < k and nums[i] < nums[k] < nums[j].

Return true if there is a 132 pattern in nums, otherwise, return false.`,
  examples: [
    { input: "nums = [1,2,3,4]", output: "false", explanation: "No 132 pattern exists." },
    {
      input: "nums = [3,1,4,2]",
      output: "true",
      explanation: "There is a 132 pattern: [1, 4, 2].",
    },
    {
      input: "nums = [-1,3,2,0]",
      output: "true",
      explanation: "There are three 132 patterns: [-1, 3, 2], [-1, 3, 0] and [-1, 2, 0].",
    },
  ],
  constraints: ["n == nums.length", "1 <= n <= 2 * 10^5", "-10^9 <= nums[i] <= 10^9"],
  hints: [
    "Iterate from right to left",
    "Use stack to track potential 'k' values (the '2' in 132)",
    "Track the largest popped value as potential 'k'",
    "If current value < k, we found a valid i (the '1')",
  ],
  starterCode: {
    javascript: `function find132pattern(nums) {\n  // Use stack, iterate right to left\n}`,
    typescript: `function find132pattern(nums: number[]): boolean {\n  // Use stack, iterate right to left\n}`,
    python: `def find132pattern(nums: list[int]) -> bool:\n    # Use stack, iterate right to left\n    pass`,
    java: `class Solution {\n    public boolean find132pattern(int[] nums) {\n        // Use stack, iterate right to left\n        return false;\n    }\n}`,
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
