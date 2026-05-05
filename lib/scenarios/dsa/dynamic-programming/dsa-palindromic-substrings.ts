import type { DSAScenario } from "../../types"

export const palindromicSubstringsScenario: DSAScenario = {
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
}
