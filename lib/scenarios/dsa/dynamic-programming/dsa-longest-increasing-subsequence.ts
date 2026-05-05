import type { DSAScenario } from "../../types"

export const longestIncreasingSubsequenceScenario: DSAScenario = {
  id: "dsa-longest-increasing-subsequence",
  title: "Longest Increasing Subsequence",
  type: "dsa",
  pattern: "dp-1d",
  difficulty: "medium",
  companies: ["Google", "Amazon", "Microsoft", "Meta"],
  description: "Find the length of the longest strictly increasing subsequence",
  tags: ["array", "binary-search", "dynamic-programming"],
  estimatedTime: 25,
  problemStatement: `Given an integer array nums, return the length of the longest strictly increasing subsequence.

A subsequence is a sequence that can be derived from an array by deleting some or no elements without changing the order of the remaining elements.`,
  examples: [
    {
      input: "nums = [10,9,2,5,3,7,101,18]",
      output: "4",
      explanation: "The longest increasing subsequence is [2,3,7,101], therefore the length is 4.",
    },
    {
      input: "nums = [0,1,0,3,2,3]",
      output: "4",
    },
    {
      input: "nums = [7,7,7,7,7,7,7]",
      output: "1",
    },
  ],
  constraints: ["1 <= nums.length <= 2500", "-10^4 <= nums[i] <= 10^4"],
  hints: [
    "DP solution: dp[i] = length of longest subsequence ending at i",
    "For better complexity, use binary search with patience sorting",
    "Maintain array of smallest tail elements for each length",
  ],
  starterCode: {
    javascript: `function lengthOfLIS(nums) {
// Write your solution here

}`,
    typescript: `function lengthOfLIS(nums: number[]): number {
// Write your solution here

}`,
    python: `def lengthOfLIS(nums):
  # Write your solution here
  pass`,
    java: `class Solution {
  public int lengthOfLIS(int[] nums) {
      // Write your solution here
      return 0;
  }
}`,
    cpp: `class Solution {
public:
  int lengthOfLIS(vector<int>& nums) {
      // Write your solution here
      return 0;
  }
};`,
    csharp: `public class Solution {
  public int LengthOfLIS(int[] nums) {
      // Write your solution here
      return 0;
  }
}`,
    go: `func lengthOfLIS(nums []int) int {
  // Write your solution here
  return 0
}`,
    rust: `impl Solution {
  pub fn length_of_lis(nums: Vec<i32>) -> i32 {
      // Write your solution here
      0
  }
}`,
  },
  optimalComplexity: {
    time: "O(n log n)",
    space: "O(n)",
  },
  testCases: [
    {
      input: { nums: [10, 9, 2, 5, 3, 7, 101, 18] },
      expected: 4,
      description: "Example with multiple subsequences",
    },
    {
      input: { nums: [0, 1, 0, 3, 2, 3] },
      expected: 4,
      description: "Subsequence with duplicates nearby",
    },
    {
      input: { nums: [7, 7, 7, 7, 7, 7, 7] },
      expected: 1,
      description: "All same elements",
    },
    {
      input: { nums: [1, 3, 6, 7, 9, 4, 10, 5, 6] },
      expected: 6,
      description: "Complex pattern",
    },
  ],
}
