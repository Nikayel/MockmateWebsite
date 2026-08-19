import type { DSAScenario } from "../../types"

export const palindromicSubstringsScenario: DSAScenario = {
  id: "dsa-palindromic-substrings",
  title: "Palindromic Substrings",
  type: "dsa",
  pattern: "dp-2d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Count how many slices of a string read identically in both directions",
  tags: ["dynamic-programming", "string", "two-pointers"],
  estimatedTime: 25,
  problemStatement: `You're handed a string s and asked to count its palindromic substrings.

A substring is any unbroken slice of s, and it qualifies as a palindrome when reversing it changes nothing. Count every occurrence on its own: slices taken from different positions count separately even when their letters look identical.

Return the total count.`,
  examples: [
    {
      input: 's = "xyz"',
      output: "3",
      explanation: 'Only the one-letter slices qualify: "x", "y", and "z".',
    },
    {
      input: 's = "zzzz"',
      output: "10",
      explanation: 'Four of "z", three of "zz", two of "zzz", and one "zzzz" makes 10.',
    },
  ],
  constraints: ["s runs from 1 to 1000 characters.", "Only lowercase English letters appear in s."],
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
