import type { DSAScenario } from "../../types"

export const longestPalindromicSubsequenceScenario: DSAScenario = {
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
}
