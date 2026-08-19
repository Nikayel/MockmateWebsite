import type { DSAScenario } from "../../types"

export const longestPalindromicSubsequenceScenario: DSAScenario = {
  id: "dsa-longest-palindromic-subsequence",
  title: "Longest Palindromic Subsequence",
  type: "dsa",
  pattern: "dp-2d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "LinkedIn", "Microsoft"],
  description: "Find the length of the longest palindromic subsequence",
  tags: ["string", "dynamic-programming"],
  estimatedTime: 30,
  problemStatement: `You're given a string s. Strike out any characters you like (or none at all); the survivors, kept in their original order, form a subsequence of s.

Some subsequences are palindromes, reading the same forward and backward. Return the length of the longest palindromic subsequence hiding inside s.`,
  examples: [
    {
      input: 's = "agbdba"',
      output: "5",
      explanation: 'Striking out the "g" leaves "abdba", which reads the same in both directions.',
    },
    {
      input: 's = "moon"',
      output: "2",
      explanation: 'The best palindromic subsequence available is "oo".',
    },
  ],
  constraints: [
    "s runs between 1 and 1000 characters long",
    "every character of s is a lowercase English letter",
  ],
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
