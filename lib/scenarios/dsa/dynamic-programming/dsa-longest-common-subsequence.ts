import type { DSAScenario } from "../../types"

export const longestCommonSubsequenceScenario: DSAScenario = {
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
}
