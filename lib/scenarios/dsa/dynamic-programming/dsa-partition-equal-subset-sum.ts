import type { DSAScenario } from "../../types"

export const partitionEqualSubsetSumScenario: DSAScenario = {
  id: "dsa-partition-equal-subset-sum",
  title: "Partition Equal Subset Sum",
  type: "dsa",
  pattern: "dp-knapsack",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Decide whether an array splits into two groups with matching totals",
  tags: ["dynamic-programming", "array"],
  estimatedTime: 25,
  problemStatement: `You're given an integer array nums and asked whether it splits cleanly in two. Specifically: can you place every entry into one of two groups so that both groups add up to the same total? Each entry must land in exactly one group, and a group keeps no notion of order.

Return true when such a split exists and false when it doesn't.`,
  examples: [
    {
      input: "nums = [3,1,4,2,2]",
      output: "true",
      explanation: "[4, 2] and [3, 1, 2] both total 6.",
    },
    {
      input: "nums = [2,3,4]",
      output: "false",
      explanation: "The entries total 9, and an odd amount can never break into two equal halves.",
    },
  ],
  constraints: ["nums holds between 1 and 200 entries.", "Each entry sits in the range 1 to 100."],
  hints: [
    "If total sum is odd, impossible to partition equally",
    "Reduces to: can we find subset with sum = totalSum/2?",
    "This is a 0/1 Knapsack problem variant",
    "dp[i] = true if sum i is achievable",
  ],
  starterCode: {
    javascript: `function canPartition(nums) {
// Write your solution here

}`,
    typescript: `function canPartition(nums: number[]): boolean {
// Write your solution here

}`,
    python: `def canPartition(nums):
  # Write your solution here
  pass`,
  },
  optimalComplexity: { time: "O(n * sum)", space: "O(sum)" },
  testCases: [
    { input: { nums: [1, 5, 11, 5] }, expected: true, description: "[1,5,5] and [11]" },
    { input: { nums: [1, 2, 3, 5] }, expected: false, description: "Cannot partition" },
    { input: { nums: [1, 2, 3, 4] }, expected: true, description: "[1,4] and [2,3]" },
    { input: { nums: [2, 2, 1, 1] }, expected: true, description: "[2,1] and [2,1]" },
    { input: { nums: [1, 1, 1, 1, 1] }, expected: false, description: "Odd count of 1s" },
    // Both false cases above have an ODD total, so `sum(nums) % 2 == 0` passed. An even
    // total is necessary but not sufficient: nothing here adds up to 6.
    {
      input: { nums: [2, 2, 3, 5] },
      expected: false,
      description: "Even total that still cannot be split",
    },
    // And every true case could be built by repeatedly taking the largest value that still
    // fits. Here that rule stalls at 9 (5 then 4), while 5 + 3 + 2 reaches 10.
    {
      input: { nums: [5, 4, 4, 3, 2, 2] },
      expected: true,
      description: "Largest-first packing stalls, but a different subset reaches the half",
    },
  ],
}
