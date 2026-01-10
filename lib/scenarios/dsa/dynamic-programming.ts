/**
 * Dynamic Programming DSA Scenarios
 * Patterns: dp-1d, dp-2d, dp-knapsack
 */

import type { DSAScenario } from "../types"

export const dpScenarios: DSAScenario[] = [
  // dp-1d scenarios
  {
    id: "dsa-maximum-subarray",
    title: "Maximum Subarray (Kadane's Algorithm)",
    type: "dsa",
    pattern: "dp-1d",
    difficulty: "medium",
    companies: ["Amazon", "Microsoft", "Meta", "Apple"],
    description: "Find the contiguous subarray with the largest sum",
    tags: ["array", "dynamic-programming", "divide-and-conquer"],
    estimatedTime: 20,
    problemStatement: `Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.

A subarray is a contiguous part of an array.`,
    examples: [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        output: "6",
        explanation: "The subarray [4,-1,2,1] has the largest sum 6.",
      },
      {
        input: "nums = [1]",
        output: "1",
      },
      {
        input: "nums = [5,4,-1,7,8]",
        output: "23",
      },
    ],
    constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
    hints: [
      "Use Kadane's Algorithm",
      "Keep track of the current sum and maximum sum",
      "Reset current sum to 0 if it becomes negative",
    ],
    starterCode: {
      javascript: `function maxSubArray(nums) {
  // Write your solution here

}`,
      typescript: `function maxSubArray(nums: number[]): number {
  // Write your solution here

}`,
      python: `def maxSubArray(nums):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] },
        expected: 6,
        description: "Classic case: [4,-1,2,1] subarray sum = 6",
      },
      {
        input: { nums: [1] },
        expected: 1,
        description: "Single element",
      },
      {
        input: { nums: [5, 4, -1, 7, 8] },
        expected: 23,
        description: "All positive sum",
      },
      {
        input: { nums: [-1, -2, -3, -4] },
        expected: -1,
        description: "All negative: return largest negative",
      },
      {
        input: { nums: [1, 2, -1, -2, 2, 1, -2, 1] },
        expected: 3,
        description: "Mixed positive and negative",
      },
    ],
  },
  {
    id: "dsa-climbing-stairs",
    title: "Climbing Stairs",
    type: "dsa",
    pattern: "dp-1d",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Meta", "Apple"],
    description: "Calculate number of ways to climb stairs",
    tags: ["dynamic-programming", "math", "memoization"],
    estimatedTime: 15,
    problemStatement: `You are climbing a staircase. It takes n steps to reach the top.

Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?`,
    examples: [
      {
        input: "n = 2",
        output: "2",
        explanation: "There are two ways to climb to the top: 1. 1 step + 1 step, 2. 2 steps",
      },
      {
        input: "n = 3",
        output: "3",
        explanation: "There are three ways: 1. 1+1+1, 2. 1+2, 3. 2+1",
      },
    ],
    constraints: ["1 <= n <= 45"],
    hints: [
      "This is a Fibonacci sequence problem",
      "dp[i] = dp[i-1] + dp[i-2]",
      "You can optimize space to O(1) by only keeping track of the last two values",
    ],
    starterCode: {
      javascript: `function climbStairs(n) {
  // Write your solution here

}`,
      typescript: `function climbStairs(n: number): number {
  // Write your solution here

}`,
      python: `def climbStairs(n):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { n: 2 },
        expected: 2,
        description: "2 steps: [1+1, 2]",
      },
      {
        input: { n: 3 },
        expected: 3,
        description: "3 steps: [1+1+1, 1+2, 2+1]",
      },
      {
        input: { n: 1 },
        expected: 1,
        description: "Single step",
      },
      {
        input: { n: 5 },
        expected: 8,
        description: "5 steps: Fibonacci(5) = 8",
      },
      {
        input: { n: 10 },
        expected: 89,
        description: "10 steps: Fibonacci(10) = 89",
      },
    ],
  },
  {
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
        explanation:
          "The longest increasing subsequence is [2,3,7,101], therefore the length is 4.",
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
  },
  {
    id: "dsa-word-break",
    title: "Word Break",
    type: "dsa",
    pattern: "dp-1d",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta"],
    description: "Determine if string can be segmented into dictionary words.",
    tags: ["dynamic-programming", "hash-table", "string"],
    estimatedTime: 25,
    problemStatement: `Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.`,
    examples: [
      {
        input: "s = leetcode, wordDict = [leet,code]",
        output: "true",
        explanation: "leetcode can be segmented as leet code",
      },
      {
        input: "s = applepenapple, wordDict = [apple,pen]",
        output: "true",
      },
      {
        input: "s = catsandog, wordDict = [cats,dog,sand,and,cat]",
        output: "false",
      },
    ],
    constraints: [
      "1 <= s.length <= 300",
      "1 <= wordDict.length <= 1000",
      "All strings consist of lowercase English letters.",
    ],
    hints: [
      "1D DP: dp[i] = true if s[0..i] can be segmented",
      "For each position, check all possible words ending there",
      "Use HashSet for O(1) word lookup",
    ],
    starterCode: {
      javascript: `function wordBreak(s, wordDict) {
  // Write your solution here

}`,
      python: `def wordBreak(s: str, wordDict: list[str]) -> bool:
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(n^2)",
      space: "O(n)",
    },
    testCases: [
      {
        input: { s: "leetcode", wordDict: ["leet", "code"] },
        expected: true,
        description: "leetcode = leet + code",
      },
      {
        input: { s: "applepenapple", wordDict: ["apple", "pen"] },
        expected: true,
        description: "apple + pen + apple",
      },
      {
        input: { s: "catsandog", wordDict: ["cats", "dog", "sand", "and", "cat"] },
        expected: false,
        description: "Cannot segment catsandog",
      },
      {
        input: { s: "a", wordDict: ["a"] },
        expected: true,
        description: "Single character match",
      },
      {
        input: { s: "aaaaaaa", wordDict: ["a", "aa", "aaa"] },
        expected: true,
        description: "Multiple ways to segment",
      },
    ],
  },
  {
    id: "dsa-house-robber",
    title: "House Robber",
    type: "dsa",
    pattern: "dp-1d",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta"],
    description: "Maximize amount robbed without robbing adjacent houses.",
    tags: ["dynamic-programming", "array"],
    estimatedTime: 20,
    problemStatement: `You are a robber planning to rob houses along a street. Each house has money, but adjacent houses have security that alerts police. Return the maximum amount you can rob without alerting police.`,
    examples: [
      {
        input: "nums = [1,2,3,1]",
        output: "4",
        explanation: "Rob house 1 and 3",
      },
      {
        input: "nums = [2,7,9,3,1]",
        output: "12",
        explanation: "Rob houses 1, 3, and 5",
      },
    ],
    constraints: ["1 <= nums.length <= 100", "0 <= nums[i] <= 400"],
    hints: [
      "1D DP: dp[i] = max money robbing up to house i",
      "Choice: rob current (nums[i] + dp[i-2]) or skip (dp[i-1])",
      "Can optimize space to O(1) using two variables",
    ],
    starterCode: {
      javascript: `function rob(nums) {
  // Write your solution here

}`,
      python: `def rob(nums: list[int]) -> int:
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { nums: [1, 2, 3, 1] },
        expected: 4,
        description: "Rob house 1 and 3: 1 + 3 = 4",
      },
      {
        input: { nums: [2, 7, 9, 3, 1] },
        expected: 12,
        description: "Rob houses 1, 3, 5: 2 + 9 + 1 = 12",
      },
      {
        input: { nums: [1] },
        expected: 1,
        description: "Single house",
      },
      {
        input: { nums: [2, 1] },
        expected: 2,
        description: "Two houses, pick larger",
      },
      {
        input: { nums: [1, 2, 3, 4, 5, 6] },
        expected: 12,
        description: "Rob even indexed houses: 2 + 4 + 6 = 12",
      },
    ],
  },

  // dp-2d scenarios
  {
    id: "dsa-unique-paths",
    title: "Unique Paths",
    type: "dsa",
    pattern: "dp-2d",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta"],
    description: "Count unique paths from top-left to bottom-right in grid.",
    tags: ["dynamic-programming", "math", "combinatorics"],
    estimatedTime: 20,
    problemStatement: `There is a robot on an m x n grid. The robot starts at the top-left corner and wants to reach the bottom-right corner. The robot can only move down or right. How many unique paths are there?`,
    examples: [
      {
        input: "m = 3, n = 7",
        output: "28",
      },
      {
        input: "m = 3, n = 2",
        output: "3",
      },
    ],
    constraints: ["1 <= m, n <= 100"],
    hints: [
      "2D DP: dp[i][j] = paths to reach cell (i,j)",
      "dp[i][j] = dp[i-1][j] + dp[i][j-1]",
      "Can optimize space to O(n) using 1D array",
    ],
    starterCode: {
      javascript: `function uniquePaths(m, n) {
  // Write your solution here

}`,
      python: `def uniquePaths(m: int, n: int) -> int:
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(m * n)",
      space: "O(n)",
    },
    testCases: [
      {
        input: { m: 3, n: 7 },
        expected: 28,
        description: "3x7 grid",
      },
      {
        input: { m: 3, n: 2 },
        expected: 3,
        description: "3x2 grid: down-down-right, down-right-down, right-down-down",
      },
      {
        input: { m: 1, n: 1 },
        expected: 1,
        description: "Single cell grid",
      },
      {
        input: { m: 3, n: 3 },
        expected: 6,
        description: "3x3 grid",
      },
      {
        input: { m: 7, n: 3 },
        expected: 28,
        description: "7x3 grid (same as 3x7)",
      },
    ],
  },
  {
    id: "dsa-edit-distance",
    title: "Edit Distance",
    type: "dsa",
    pattern: "dp-2d",
    difficulty: "hard",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Find minimum edit distance to convert one string to another.",
    tags: ["dynamic-programming", "string"],
    estimatedTime: 35,
    problemStatement: `Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2. You can insert, delete, or replace any character.`,
    examples: [
      {
        input: "word1 = horse, word2 = ros",
        output: "3",
        explanation: "horse -> rorse -> rose -> ros",
      },
      {
        input: "word1 = intention, word2 = execution",
        output: "5",
      },
    ],
    constraints: [
      "0 <= word1.length, word2.length <= 500",
      "word1 and word2 consist of lowercase English letters.",
    ],
    hints: [
      "2D DP: dp[i][j] = min operations to convert word1[0..i] to word2[0..j]",
      "If chars match: dp[i][j] = dp[i-1][j-1]",
      "Else: min of insert, delete, replace operations",
    ],
    starterCode: {
      javascript: `function minDistance(word1, word2) {
  // Write your solution here

}`,
      python: `def minDistance(word1: str, word2: str) -> int:
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(m * n)",
      space: "O(m * n)",
    },
    testCases: [
      {
        input: { word1: "horse", word2: "ros" },
        expected: 3,
        description: "horse -> rorse -> rose -> ros",
      },
      {
        input: { word1: "intention", word2: "execution" },
        expected: 5,
        description: "Classic example",
      },
      {
        input: { word1: "", word2: "" },
        expected: 0,
        description: "Both empty strings",
      },
      {
        input: { word1: "abc", word2: "abc" },
        expected: 0,
        description: "Identical strings",
      },
      {
        input: { word1: "abc", word2: "" },
        expected: 3,
        description: "Delete all characters",
      },
    ],
  },

  // dp-knapsack scenarios
  {
    id: "dsa-coin-change",
    title: "Coin Change",
    type: "dsa",
    pattern: "dp-knapsack",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Apple"],
    description: "Find minimum number of coins needed to make amount",
    tags: ["dynamic-programming", "breadth-first-search"],
    estimatedTime: 25,
    problemStatement: `You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.

You may assume that you have an infinite number of each kind of coin.`,
    examples: [
      {
        input: "coins = [1,2,5], amount = 11",
        output: "3",
        explanation: "11 = 5 + 5 + 1",
      },
      {
        input: "coins = [2], amount = 3",
        output: "-1",
      },
      {
        input: "coins = [1], amount = 0",
        output: "0",
      },
    ],
    constraints: ["1 <= coins.length <= 12", "1 <= coins[i] <= 2^31 - 1", "0 <= amount <= 10^4"],
    hints: [
      "Use dynamic programming with dp[i] = minimum coins for amount i",
      "For each amount, try all coin denominations",
      "dp[i] = min(dp[i], dp[i-coin] + 1)",
    ],
    starterCode: {
      javascript: `function coinChange(coins, amount) {
  // Write your solution here

}`,
      typescript: `function coinChange(coins: number[], amount: number): number {
  // Write your solution here

}`,
      python: `def coinChange(coins, amount):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(amount * coins.length)",
      space: "O(amount)",
    },
    testCases: [
      {
        input: { coins: [1, 2, 5], amount: 11 },
        expected: 3,
        description: "11 = 5 + 5 + 1",
      },
      {
        input: { coins: [2], amount: 3 },
        expected: -1,
        description: "Cannot make amount 3 with only coin 2",
      },
      {
        input: { coins: [1], amount: 0 },
        expected: 0,
        description: "Amount 0 requires 0 coins",
      },
      {
        input: { coins: [1, 2, 5], amount: 100 },
        expected: 20,
        description: "100 = 20 coins of 5",
      },
      {
        input: { coins: [1, 3, 4, 5], amount: 7 },
        expected: 2,
        description: "7 = 3 + 4",
      },
    ],
  },
]

export default dpScenarios
