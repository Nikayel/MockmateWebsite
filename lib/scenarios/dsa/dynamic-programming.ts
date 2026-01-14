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
    companies: ["Amazon", "Meta", "Google", "Apple", "Oracle"],
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
  {
    id: "dsa-longest-common-subsequence",
    title: "Longest Common Subsequence",
    type: "dsa",
    pattern: "dp-lcs",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple", "Salesforce", "Atlassian"],
    description: "Find the length of the longest common subsequence of two strings",
    tags: ["dynamic-programming", "string"],
    estimatedTime: 25,
    problemStatement: `Given two strings text1 and text2, return the length of their longest common subsequence. If there is no common subsequence, return 0.

A subsequence of a string is a new string generated from the original string with some characters (can be none) deleted without changing the relative order of the remaining characters.

For example, "ace" is a subsequence of "abcde".

A common subsequence of two strings is a subsequence that is common to both strings.`,
    examples: [
      {
        input: 'text1 = "abcde", text2 = "ace"',
        output: "3",
        explanation: 'The longest common subsequence is "ace" with length 3.',
      },
      {
        input: 'text1 = "abc", text2 = "abc"',
        output: "3",
        explanation: 'The longest common subsequence is "abc" with length 3.',
      },
      {
        input: 'text1 = "abc", text2 = "def"',
        output: "0",
        explanation: "No common subsequence exists.",
      },
    ],
    constraints: [
      "1 <= text1.length, text2.length <= 1000",
      "text1 and text2 consist of only lowercase English characters.",
    ],
    hints: [
      "Use 2D DP: dp[i][j] = LCS of text1[0..i-1] and text2[0..j-1]",
      "If text1[i-1] == text2[j-1]: dp[i][j] = dp[i-1][j-1] + 1",
      "Else: dp[i][j] = max(dp[i-1][j], dp[i][j-1])",
      "Can optimize space to O(min(m,n)) using 1D array",
    ],
    starterCode: {
      javascript: `function longestCommonSubsequence(text1, text2) {
  // Write your solution here

}`,
      typescript: `function longestCommonSubsequence(text1: string, text2: string): number {
  // Write your solution here

}`,
      python: `def longestCommonSubsequence(text1, text2):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(m * n)", space: "O(min(m, n))" },
    testCases: [
      { input: { text1: "abcde", text2: "ace" }, expected: 3, description: "LCS = 'ace'" },
      { input: { text1: "abc", text2: "abc" }, expected: 3, description: "Identical strings" },
      { input: { text1: "abc", text2: "def" }, expected: 0, description: "No common chars" },
      { input: { text1: "bl", text2: "yby" }, expected: 1, description: "Single char LCS" },
      { input: { text1: "psnw", text2: "vozsh" }, expected: 1, description: "Complex case" },
    ],
  },
  {
    id: "dsa-01-knapsack",
    title: "0/1 Knapsack Problem",
    type: "dsa",
    pattern: "dp-knapsack",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Microsoft", "Goldman Sachs"],
    description: "Maximize value in a knapsack with weight constraint (classic DP problem)",
    tags: ["dynamic-programming", "array"],
    estimatedTime: 30,
    problemStatement: `You are given weights and values of n items. You have a knapsack with a maximum weight capacity W.

Each item can only be selected once (0/1 property). Return the maximum total value that can be put in the knapsack.

For each item, you either include it completely or exclude it (no fractional items).`,
    examples: [
      {
        input: "weights = [1, 2, 3], values = [6, 10, 12], W = 5",
        output: "22",
        explanation: "Select items with weights 2 and 3 (values 10 + 12 = 22)",
      },
      {
        input: "weights = [1, 3, 4, 5], values = [1, 4, 5, 7], W = 7",
        output: "9",
        explanation: "Select items with weights 3 and 4 (values 4 + 5 = 9)",
      },
    ],
    constraints: ["1 <= n <= 100", "1 <= weights[i], values[i] <= 1000", "1 <= W <= 1000"],
    hints: [
      "2D DP: dp[i][w] = max value using first i items with capacity w",
      "For each item: include it (if fits) or exclude it",
      "dp[i][w] = max(dp[i-1][w], dp[i-1][w-weight[i]] + value[i])",
      "Iterate backwards for 1D space optimization",
    ],
    starterCode: {
      javascript: `function knapsack(weights, values, W) {
  // Write your solution here

}`,
      typescript: `function knapsack(weights: number[], values: number[], W: number): number {
  // Write your solution here

}`,
      python: `def knapsack(weights, values, W):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(n * W)", space: "O(W)" },
    testCases: [
      {
        input: { weights: [1, 2, 3], values: [6, 10, 12], W: 5 },
        expected: 22,
        description: "Standard case",
      },
      {
        input: { weights: [1, 3, 4, 5], values: [1, 4, 5, 7], W: 7 },
        expected: 9,
        description: "Medium case",
      },
      { input: { weights: [10], values: [100], W: 5 }, expected: 0, description: "Item too heavy" },
      { input: { weights: [1, 2], values: [5, 6], W: 3 }, expected: 11, description: "Take both" },
      {
        input: { weights: [2, 2, 2], values: [1, 2, 3], W: 4 },
        expected: 5,
        description: "Choose best pair",
      },
    ],
  },
  {
    id: "dsa-partition-equal-subset-sum",
    title: "Partition Equal Subset Sum",
    type: "dsa",
    pattern: "dp-knapsack",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Determine if array can be partitioned into two subsets with equal sum",
    tags: ["dynamic-programming", "array"],
    estimatedTime: 25,
    problemStatement: `Given an integer array nums, return true if you can partition the array into two subsets such that the sum of the elements in both subsets is equal, or false otherwise.`,
    examples: [
      {
        input: "nums = [1,5,11,5]",
        output: "true",
        explanation: "The array can be partitioned as [1, 5, 5] and [11].",
      },
      {
        input: "nums = [1,2,3,5]",
        output: "false",
        explanation: "The array cannot be partitioned into equal sum subsets.",
      },
    ],
    constraints: ["1 <= nums.length <= 200", "1 <= nums[i] <= 100"],
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
    ],
  },
  {
    id: "dsa-regular-expression-matching",
    title: "Regular Expression Matching",
    type: "dsa",
    pattern: "dp-2d",
    difficulty: "hard",
    companies: ["Google", "Amazon", "Meta", "Microsoft", "Apple"],
    description: "Implement regular expression matching with '.' and '*' support",
    tags: ["dynamic-programming", "string", "recursion"],
    estimatedTime: 40,
    problemStatement: `Given an input string s and a pattern p, implement regular expression matching with support for '.' and '*' where:

- '.' Matches any single character.
- '*' Matches zero or more of the preceding element.

The matching should cover the entire input string (not partial).`,
    examples: [
      {
        input: 's = "aa", p = "a"',
        output: "false",
        explanation: '"a" does not match the entire string "aa".',
      },
      {
        input: 's = "aa", p = "a*"',
        output: "true",
        explanation: '"*" means zero or more of the preceding element, "a".',
      },
      {
        input: 's = "ab", p = ".*"',
        output: "true",
        explanation: '".*" means zero or more (*) of any character (.).',
      },
    ],
    constraints: [
      "1 <= s.length <= 20",
      "1 <= p.length <= 20",
      "s contains only lowercase English letters.",
      "p contains only lowercase English letters, '.', and '*'.",
      "It is guaranteed for each '*', there will be a previous valid character to match.",
    ],
    hints: [
      "2D DP: dp[i][j] = true if s[0..i-1] matches p[0..j-1]",
      "If p[j-1] is not '*': dp[i][j] = dp[i-1][j-1] && (s[i-1] matches p[j-1])",
      "If p[j-1] is '*': either use it 0 times (dp[i][j-2]) or use it (match + dp[i-1][j])",
      "'.' matches any single character",
    ],
    starterCode: {
      javascript: `function isMatch(s, p) {
  // Write your solution here

}`,
      typescript: `function isMatch(s: string, p: string): boolean {
  // Write your solution here

}`,
      python: `def isMatch(s, p):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(m * n)", space: "O(m * n)" },
    testCases: [
      { input: { s: "aa", p: "a" }, expected: false, description: "Pattern too short" },
      { input: { s: "aa", p: "a*" }, expected: true, description: "Star matches multiple" },
      { input: { s: "ab", p: ".*" }, expected: true, description: "Dot star matches all" },
      { input: { s: "aab", p: "c*a*b" }, expected: true, description: "c* matches zero c's" },
      {
        input: { s: "mississippi", p: "mis*is*p*." },
        expected: false,
        description: "Complex case",
      },
    ],
  },
  // ==================== NEW HIGH-VALUE ADDITIONS ====================
  {
    id: "dsa-house-robber-ii",
    title: "House Robber II",
    type: "dsa",
    pattern: "dp-1d",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Maximum robbery with circular house arrangement",
    tags: ["dynamic-programming", "array"],
    estimatedTime: 25,
    problemStatement: `You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. All houses at this place are arranged in a circle. That means the first house is the neighbor of the last one. Meanwhile, adjacent houses have a security system connected, and it will automatically contact the police if two adjacent houses were broken into on the same night.

Given an integer array nums representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police.`,
    examples: [
      {
        input: "nums = [2,3,2]",
        output: "3",
        explanation:
          "You cannot rob house 1 (money = 2) and then rob house 3 (money = 2), because they are adjacent houses.",
      },
      {
        input: "nums = [1,2,3,1]",
        output: "4",
        explanation: "Rob house 1 (money = 1) and then rob house 3 (money = 3). Total = 1 + 3 = 4.",
      },
      {
        input: "nums = [1,2,3]",
        output: "3",
      },
    ],
    constraints: ["1 <= nums.length <= 100", "0 <= nums[i] <= 1000"],
    hints: [
      "Since houses are circular, you can't rob both first and last house",
      "Run House Robber I twice: once for houses 0 to n-2, once for houses 1 to n-1",
      "Return max of both results",
    ],
    starterCode: {
      javascript: `function rob(nums) {
  // Write your solution here

}`,
      typescript: `function rob(nums: number[]): number {
  // Write your solution here

}`,
      python: `def rob(nums):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { nums: [2, 3, 2] }, expected: 3, description: "Cannot rob first and last" },
      { input: { nums: [1, 2, 3, 1] }, expected: 4, description: "Rob house 1 and 3" },
      { input: { nums: [1, 2, 3] }, expected: 3, description: "Rob middle house" },
      { input: { nums: [1] }, expected: 1, description: "Single house" },
      { input: { nums: [1, 2] }, expected: 2, description: "Two houses - pick larger" },
    ],
  },
  {
    id: "dsa-decode-ways",
    title: "Decode Ways",
    type: "dsa",
    pattern: "dp-1d",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    description: "Count ways to decode a digit string into letters",
    tags: ["dynamic-programming", "string"],
    estimatedTime: 25,
    problemStatement: `A message containing letters from A-Z can be encoded into numbers using the following mapping:

'A' -> "1"
'B' -> "2"
...
'Z' -> "26"

To decode an encoded message, all the digits must be grouped then mapped back into letters using the reverse of the mapping above (there may be multiple ways).

Given a string s containing only digits, return the number of ways to decode it.`,
    examples: [
      {
        input: 's = "12"',
        output: "2",
        explanation: '"12" could be decoded as "AB" (1 2) or "L" (12).',
      },
      {
        input: 's = "226"',
        output: "3",
        explanation: '"226" could be decoded as "BZ" (2 26), "VF" (22 6), or "BBF" (2 2 6).',
      },
      {
        input: 's = "06"',
        output: "0",
        explanation: '"06" cannot be mapped because leading zeros are invalid.',
      },
    ],
    constraints: [
      "1 <= s.length <= 100",
      "s contains only digits and may contain leading zero(s).",
    ],
    hints: [
      "dp[i] = number of ways to decode s[0:i]",
      "Single digit: if s[i-1] != '0', dp[i] += dp[i-1]",
      "Two digits: if 10 <= s[i-2:i] <= 26, dp[i] += dp[i-2]",
      "Handle leading zeros carefully - '0' alone is invalid",
    ],
    starterCode: {
      javascript: `function numDecodings(s) {
  // Write your solution here

}`,
      typescript: `function numDecodings(s: string): number {
  // Write your solution here

}`,
      python: `def numDecodings(s):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { s: "12" }, expected: 2, description: "AB or L" },
      { input: { s: "226" }, expected: 3, description: "BZ, VF, or BBF" },
      { input: { s: "06" }, expected: 0, description: "Leading zero invalid" },
      { input: { s: "10" }, expected: 1, description: "Only J (10)" },
      { input: { s: "2101" }, expected: 1, description: "Complex with zeros" },
      { input: { s: "11106" }, expected: 2, description: "AAJ F or KJF" },
    ],
  },
  {
    id: "dsa-maximum-product-subarray",
    title: "Maximum Product Subarray",
    type: "dsa",
    pattern: "dp-1d",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "LinkedIn"],
    description: "Find the contiguous subarray with the largest product",
    tags: ["dynamic-programming", "array"],
    estimatedTime: 25,
    problemStatement: `Given an integer array nums, find a subarray that has the largest product, and return the product.

The test cases are generated so that the answer will fit in a 32-bit integer.`,
    examples: [
      {
        input: "nums = [2,3,-2,4]",
        output: "6",
        explanation: "[2,3] has the largest product 6.",
      },
      {
        input: "nums = [-2,0,-1]",
        output: "0",
        explanation: "The result cannot be 2, because [-2,-1] is not a subarray.",
      },
    ],
    constraints: [
      "1 <= nums.length <= 2 * 10^4",
      "-10 <= nums[i] <= 10",
      "The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.",
    ],
    hints: [
      "Track both max and min product ending at each position",
      "Negative * negative can become positive max",
      "When current num is negative, swap max and min",
      "Reset when seeing 0",
    ],
    starterCode: {
      javascript: `function maxProduct(nums) {
  // Write your solution here

}`,
      typescript: `function maxProduct(nums: number[]): number {
  // Write your solution here

}`,
      python: `def maxProduct(nums):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { nums: [2, 3, -2, 4] }, expected: 6, description: "[2,3] = 6" },
      { input: { nums: [-2, 0, -1] }, expected: 0, description: "Zero breaks subarray" },
      { input: { nums: [-2, 3, -4] }, expected: 24, description: "Negative * negative" },
      { input: { nums: [2] }, expected: 2, description: "Single element" },
      { input: { nums: [-2] }, expected: -2, description: "Single negative" },
      { input: { nums: [0, 2] }, expected: 2, description: "Zero at start" },
    ],
  },
  {
    id: "dsa-target-sum",
    title: "Target Sum",
    type: "dsa",
    pattern: "dp-knapsack",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Count ways to assign + and - to reach target sum",
    tags: ["dynamic-programming", "array", "backtracking"],
    estimatedTime: 30,
    problemStatement: `You are given an integer array nums and an integer target.

You want to build an expression out of nums by adding one of the symbols '+' and '-' before each integer in nums and then concatenate all the integers.

Return the number of different expressions that you can build, which evaluates to target.`,
    examples: [
      {
        input: "nums = [1,1,1,1,1], target = 3",
        output: "5",
        explanation: "-1 + 1 + 1 + 1 + 1 = 3, +1 - 1 + 1 + 1 + 1 = 3, etc. There are 5 ways.",
      },
      {
        input: "nums = [1], target = 1",
        output: "1",
      },
    ],
    constraints: [
      "1 <= nums.length <= 20",
      "0 <= nums[i] <= 1000",
      "0 <= sum(nums[i]) <= 1000",
      "-1000 <= target <= 1000",
    ],
    hints: [
      "Let P = sum of positive numbers, N = sum of negative numbers",
      "P - N = target and P + N = sum",
      "So P = (target + sum) / 2 - this is a subset sum problem!",
      "Count subsets with sum P using DP",
    ],
    starterCode: {
      javascript: `function findTargetSumWays(nums, target) {
  // Write your solution here

}`,
      typescript: `function findTargetSumWays(nums: number[], target: number): number {
  // Write your solution here

}`,
      python: `def findTargetSumWays(nums, target):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(n * sum)", space: "O(sum)" },
    testCases: [
      {
        input: { nums: [1, 1, 1, 1, 1], target: 3 },
        expected: 5,
        description: "Five ones to make 3",
      },
      { input: { nums: [1], target: 1 }, expected: 1, description: "Single element" },
      { input: { nums: [1, 0], target: 1 }, expected: 2, description: "Zero can be +0 or -0" },
      { input: { nums: [1, 2, 1], target: 0 }, expected: 2, description: "+1-2+1 or -1+2-1" },
    ],
  },
  {
    id: "dsa-minimum-path-sum",
    title: "Minimum Path Sum",
    type: "dsa",
    pattern: "dp-2d",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Goldman Sachs"],
    description: "Find minimum sum path from top-left to bottom-right in a grid",
    tags: ["dynamic-programming", "array", "matrix"],
    estimatedTime: 20,
    problemStatement: `Given a m x n grid filled with non-negative numbers, find a path from top left to bottom right, which minimizes the sum of all numbers along its path.

Note: You can only move either down or right at any point in time.`,
    examples: [
      {
        input: "grid = [[1,3,1],[1,5,1],[4,2,1]]",
        output: "7",
        explanation: "The path 1 → 3 → 1 → 1 → 1 minimizes the sum.",
      },
      {
        input: "grid = [[1,2,3],[4,5,6]]",
        output: "12",
      },
    ],
    constraints: [
      "m == grid.length",
      "n == grid[i].length",
      "1 <= m, n <= 200",
      "0 <= grid[i][j] <= 200",
    ],
    hints: [
      "dp[i][j] = minimum sum to reach cell (i,j)",
      "dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])",
      "First row/column only have one path to them",
      "Can optimize space to O(n) using 1D array",
    ],
    starterCode: {
      javascript: `function minPathSum(grid) {
  // Write your solution here

}`,
      typescript: `function minPathSum(grid: number[][]): number {
  // Write your solution here

}`,
      python: `def minPathSum(grid):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(m * n)", space: "O(n)" },
    testCases: [
      {
        input: {
          grid: [
            [1, 3, 1],
            [1, 5, 1],
            [4, 2, 1],
          ],
        },
        expected: 7,
        description: "3x3 grid",
      },
      {
        input: {
          grid: [
            [1, 2, 3],
            [4, 5, 6],
          ],
        },
        expected: 12,
        description: "2x3 grid",
      },
      { input: { grid: [[1]] }, expected: 1, description: "Single cell" },
      {
        input: {
          grid: [
            [1, 2],
            [1, 1],
          ],
        },
        expected: 3,
        description: "2x2 grid",
      },
    ],
  },
  {
    id: "dsa-palindromic-substrings",
    title: "Palindromic Substrings",
    type: "dsa",
    pattern: "dp-2d",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Count the number of palindromic substrings",
    tags: ["dynamic-programming", "string", "two-pointers"],
    estimatedTime: 25,
    problemStatement: `Given a string s, return the number of palindromic substrings in it.

A string is a palindrome when it reads the same backward as forward.

A substring is a contiguous sequence of characters within the string.`,
    examples: [
      {
        input: 's = "abc"',
        output: "3",
        explanation: 'Three palindromic substrings: "a", "b", "c".',
      },
      {
        input: 's = "aaa"',
        output: "6",
        explanation: 'Six palindromic substrings: "a", "a", "a", "aa", "aa", "aaa".',
      },
    ],
    constraints: ["1 <= s.length <= 1000", "s consists of lowercase English letters."],
    hints: [
      "Expand around center technique: for each center, expand outward",
      "Two types of centers: single character (odd length) and between characters (even length)",
      "Total 2n-1 possible centers",
      "Or use DP: dp[i][j] = true if s[i:j+1] is palindrome",
    ],
    starterCode: {
      javascript: `function countSubstrings(s) {
  // Write your solution here

}`,
      typescript: `function countSubstrings(s: string): number {
  // Write your solution here

}`,
      python: `def countSubstrings(s):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(n^2)", space: "O(1) with expand around center" },
    testCases: [
      { input: { s: "abc" }, expected: 3, description: "No multi-char palindromes" },
      { input: { s: "aaa" }, expected: 6, description: "All substrings are palindromes" },
      { input: { s: "aba" }, expected: 4, description: "a, b, a, aba" },
      { input: { s: "a" }, expected: 1, description: "Single character" },
    ],
  },
  {
    id: "dsa-longest-palindromic-subsequence",
    title: "Longest Palindromic Subsequence",
    type: "dsa",
    pattern: "dp-2d",
    difficulty: "medium",
    companies: ["Amazon", "Google", "LinkedIn", "Microsoft"],
    description: "Find the length of the longest palindromic subsequence",
    tags: ["dynamic-programming", "string"],
    estimatedTime: 30,
    problemStatement: `Given a string s, find the longest palindromic subsequence's length in s.

A subsequence is a sequence that can be derived from another sequence by deleting some or no elements without changing the order of the remaining elements.`,
    examples: [
      {
        input: 's = "bbbab"',
        output: "4",
        explanation: 'One possible longest palindromic subsequence is "bbbb".',
      },
      {
        input: 's = "cbbd"',
        output: "2",
        explanation: 'One possible longest palindromic subsequence is "bb".',
      },
    ],
    constraints: ["1 <= s.length <= 1000", "s consists only of lowercase English letters."],
    hints: [
      "dp[i][j] = LPS length for s[i:j+1]",
      "If s[i] == s[j]: dp[i][j] = dp[i+1][j-1] + 2",
      "Else: dp[i][j] = max(dp[i+1][j], dp[i][j-1])",
      "Fill diagonal (single chars) first, then expand",
    ],
    starterCode: {
      javascript: `function longestPalindromeSubseq(s) {
  // Write your solution here

}`,
      typescript: `function longestPalindromeSubseq(s: string): number {
  // Write your solution here

}`,
      python: `def longestPalindromeSubseq(s):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(n^2)", space: "O(n^2) or O(n) optimized" },
    testCases: [
      { input: { s: "bbbab" }, expected: 4, description: "bbbb is LPS" },
      { input: { s: "cbbd" }, expected: 2, description: "bb is LPS" },
      { input: { s: "a" }, expected: 1, description: "Single character" },
      { input: { s: "abcba" }, expected: 5, description: "Whole string is palindrome" },
      { input: { s: "abaaba" }, expected: 6, description: "Whole string is palindrome" },
    ],
  },
  {
    id: "dsa-best-time-buy-sell-stock-ii",
    title: "Best Time to Buy and Sell Stock II",
    type: "dsa",
    pattern: "dp-1d",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Maximize profit with unlimited transactions",
    tags: ["dynamic-programming", "array", "greedy"],
    estimatedTime: 20,
    problemStatement: `You are given an integer array prices where prices[i] is the price of a given stock on the ith day.

On each day, you may decide to buy and/or sell the stock. You can only hold at most one share of the stock at any time. However, you can buy it then immediately sell it on the same day.

Find and return the maximum profit you can achieve.`,
    examples: [
      {
        input: "prices = [7,1,5,3,6,4]",
        output: "7",
        explanation:
          "Buy on day 2 (price = 1) and sell on day 3 (price = 5), profit = 4. Then buy on day 4 (price = 3) and sell on day 5 (price = 6), profit = 3. Total = 7.",
      },
      {
        input: "prices = [1,2,3,4,5]",
        output: "4",
        explanation: "Buy on day 1 (price = 1) and sell on day 5 (price = 5), profit = 4.",
      },
      {
        input: "prices = [7,6,4,3,1]",
        output: "0",
        explanation: "No profitable transactions possible.",
      },
    ],
    constraints: ["1 <= prices.length <= 3 * 10^4", "0 <= prices[i] <= 10^4"],
    hints: [
      "Greedy: collect all upward price movements",
      "If prices[i] > prices[i-1], add the difference to profit",
      "Equivalent to buying every valley and selling every peak",
    ],
    starterCode: {
      javascript: `function maxProfit(prices) {
  // Write your solution here

}`,
      typescript: `function maxProfit(prices: number[]): number {
  // Write your solution here

}`,
      python: `def maxProfit(prices):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { prices: [7, 1, 5, 3, 6, 4] }, expected: 7, description: "Two transactions" },
      { input: { prices: [1, 2, 3, 4, 5] }, expected: 4, description: "One long transaction" },
      { input: { prices: [7, 6, 4, 3, 1] }, expected: 0, description: "No profit possible" },
    ],
  },
  {
    id: "dsa-best-time-buy-sell-stock-cooldown",
    title: "Best Time to Buy and Sell Stock with Cooldown",
    type: "dsa",
    pattern: "dp-1d",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta"],
    description: "Maximize profit with cooldown period after selling",
    tags: ["dynamic-programming", "array"],
    estimatedTime: 30,
    problemStatement: `You are given an array prices where prices[i] is the price of a given stock on the ith day.

Find the maximum profit you can achieve. You may complete as many transactions as you like with the following restrictions:

- After you sell your stock, you cannot buy stock on the next day (i.e., cooldown one day).

Note: You may not engage in multiple transactions simultaneously (i.e., you must sell the stock before you buy again).`,
    examples: [
      {
        input: "prices = [1,2,3,0,2]",
        output: "3",
        explanation: "Buy on day 1, sell on day 2. Cooldown on day 3. Buy on day 4, sell on day 5.",
      },
      {
        input: "prices = [1]",
        output: "0",
      },
    ],
    constraints: ["1 <= prices.length <= 5000", "0 <= prices[i] <= 1000"],
    hints: [
      "State machine approach: hold, sold, rest",
      "hold[i] = max(hold[i-1], rest[i-1] - prices[i])",
      "sold[i] = hold[i-1] + prices[i]",
      "rest[i] = max(rest[i-1], sold[i-1])",
    ],
    starterCode: {
      javascript: `function maxProfit(prices) {
  // Write your solution here

}`,
      typescript: `function maxProfit(prices: number[]): number {
  // Write your solution here

}`,
      python: `def maxProfit(prices):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { prices: [1, 2, 3, 0, 2] }, expected: 3, description: "With cooldown" },
      { input: { prices: [1] }, expected: 0, description: "Single day" },
      { input: { prices: [1, 2] }, expected: 1, description: "Simple profit" },
    ],
  },
  {
    id: "dsa-triangle",
    title: "Triangle",
    type: "dsa",
    pattern: "dp-2d",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Microsoft"],
    description: "Find minimum path sum from top to bottom of triangle",
    tags: ["dynamic-programming", "array"],
    estimatedTime: 25,
    problemStatement: `Given a triangle array, return the minimum path sum from top to bottom.

For each step, you may move to an adjacent number of the row below. More formally, if you are on index i on the current row, you may move to either index i or index i + 1 on the next row.`,
    examples: [
      {
        input: "triangle = [[2],[3,4],[6,5,7],[4,1,8,3]]",
        output: "11",
        explanation: "The minimum path sum from top to bottom is 2 + 3 + 5 + 1 = 11.",
      },
      {
        input: "triangle = [[-10]]",
        output: "-10",
      },
    ],
    constraints: [
      "1 <= triangle.length <= 200",
      "triangle[0].length == 1",
      "triangle[i].length == triangle[i - 1].length + 1",
      "-10^4 <= triangle[i][j] <= 10^4",
    ],
    hints: [
      "Work bottom-up: start from second-to-last row",
      "dp[i] = min path sum from row to bottom",
      "dp[i] = triangle[row][i] + min(dp[i], dp[i+1])",
      "O(n) space by reusing bottom row",
    ],
    starterCode: {
      javascript: `function minimumTotal(triangle) {
  // Write your solution here

}`,
      typescript: `function minimumTotal(triangle: number[][]): number {
  // Write your solution here

}`,
      python: `def minimumTotal(triangle):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(n^2)", space: "O(n)" },
    testCases: [
      {
        input: { triangle: [[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]] },
        expected: 11,
        description: "Standard triangle",
      },
      { input: { triangle: [[-10]] }, expected: -10, description: "Single element" },
      { input: { triangle: [[2], [3, 4]] }, expected: 5, description: "Two rows" },
    ],
  },
  {
    id: "dsa-maximal-square",
    title: "Maximal Square",
    type: "dsa",
    pattern: "dp-2d",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Apple"],
    description: "Find the largest square containing only 1's",
    tags: ["dynamic-programming", "matrix"],
    estimatedTime: 25,
    problemStatement: `Given an m x n binary matrix filled with 0's and 1's, find the largest square containing only 1's and return its area.`,
    examples: [
      {
        input:
          'matrix = [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]',
        output: "4",
        explanation: "The largest square has side length 2.",
      },
      {
        input: 'matrix = [["0","1"],["1","0"]]',
        output: "1",
      },
      {
        input: 'matrix = [["0"]]',
        output: "0",
      },
    ],
    constraints: [
      "m == matrix.length",
      "n == matrix[i].length",
      "1 <= m, n <= 300",
      "matrix[i][j] is '0' or '1'.",
    ],
    hints: [
      "dp[i][j] = side length of largest square with bottom-right corner at (i,j)",
      "If matrix[i][j] == '1': dp[i][j] = min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1",
      "Track maximum side length seen",
      "Return maxSide^2",
    ],
    starterCode: {
      javascript: `function maximalSquare(matrix) {
  // Write your solution here

}`,
      typescript: `function maximalSquare(matrix: string[][]): number {
  // Write your solution here

}`,
      python: `def maximalSquare(matrix):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(m * n)", space: "O(n)" },
    testCases: [
      {
        input: {
          matrix: [
            ["1", "0", "1", "0", "0"],
            ["1", "0", "1", "1", "1"],
            ["1", "1", "1", "1", "1"],
            ["1", "0", "0", "1", "0"],
          ],
        },
        expected: 4,
        description: "2x2 square",
      },
      {
        input: {
          matrix: [
            ["0", "1"],
            ["1", "0"],
          ],
        },
        expected: 1,
        description: "1x1 squares only",
      },
      { input: { matrix: [["0"]] }, expected: 0, description: "No 1's" },
      { input: { matrix: [["1"]] }, expected: 1, description: "Single 1" },
    ],
  },
  {
    id: "dsa-min-cost-climbing-stairs",
    title: "Min Cost Climbing Stairs",
    type: "dsa",
    pattern: "dp-1d",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Microsoft"],
    description: "Find minimum cost to reach the top of stairs",
    tags: ["dynamic-programming", "array"],
    estimatedTime: 15,
    problemStatement: `You are given an integer array cost where cost[i] is the cost of ith step on a staircase. Once you pay the cost, you can either climb one or two steps.

You can either start from the step with index 0, or the step with index 1.

Return the minimum cost to reach the top of the floor.`,
    examples: [
      {
        input: "cost = [10,15,20]",
        output: "15",
        explanation: "Start at index 1, pay 15, climb two steps to reach the top.",
      },
      {
        input: "cost = [1,100,1,1,1,100,1,1,100,1]",
        output: "6",
        explanation: "Optimal path: 0 → 2 → 4 → 6 → 7 → 9 → top. Total cost = 1+1+1+1+1+1 = 6.",
      },
    ],
    constraints: ["2 <= cost.length <= 1000", "0 <= cost[i] <= 999"],
    hints: [
      "dp[i] = minimum cost to reach step i",
      "dp[i] = cost[i] + min(dp[i-1], dp[i-2])",
      "Top is step n (one past last index)",
      "Can optimize to O(1) space",
    ],
    starterCode: {
      javascript: `function minCostClimbingStairs(cost) {
  // Write your solution here

}`,
      typescript: `function minCostClimbingStairs(cost: number[]): number {
  // Write your solution here

}`,
      python: `def minCostClimbingStairs(cost):
    # Write your solution here
    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { cost: [10, 15, 20] }, expected: 15, description: "Start at index 1" },
      {
        input: { cost: [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] },
        expected: 6,
        description: "Skip expensive steps",
      },
      { input: { cost: [0, 0, 0, 1] }, expected: 0, description: "Can reach top for free" },
    ],
  },
]

export default dpScenarios
