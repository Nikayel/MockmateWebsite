import type { DSAScenario } from "../../types"

export const dsaLongestPalindromicSubstringScenario: DSAScenario = {
  id: "dsa-longest-palindromic-substring",
  title: "Longest Palindromic Substring",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Find the longest palindromic substring in a string.",
  tags: ["string", "dynamic-programming", "two-pointers"],
  estimatedTime: 25,
  problemStatement: `Given a string s, return the longest palindromic substring in s.

A palindromic string reads the same backward as forward.`,
  examples: [
    {
      input: 's = "babad"',
      output: '"bab"',
      explanation: '"aba" is also a valid answer',
    },
    {
      input: 's = "cbbd"',
      output: '"bb"',
    },
  ],
  constraints: ["1 <= s.length <= 1000", "s consist of only digits and English letters"],
  hints: [
    "Expand around center for each possible center",
    "Consider both odd and even length palindromes",
    "Track the longest palindrome found",
  ],
  starterCode: {
    javascript: `function longestPalindrome(s) {
  // Your code here
}`,
    python: `def longestPalindrome(s):
    # Your code here
    pass`,
  },
  optimalComplexity: {
    time: "O(n²)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { s: "babad" },
      expected: "bab",
      description: "Multiple valid answers (bab or aba)",
      orderMatters: false,
    },
    {
      input: { s: "cbbd" },
      expected: "bb",
      description: "Even length palindrome",
    },
    // A popular wrong approach takes the longest substring that also appears in the reversed
    // string, which is not always a palindrome. Every case above happened to agree with it.
    // Here it returns "aaca", which reads the same in reverse only by coincidence.
    {
      input: { s: "aacabdkacaa" },
      expected: "aca",
      description: "Longest shared substring with the reverse is not a palindrome",
    },
    {
      input: { s: "a" },
      expected: "a",
      description: "Single character",
    },
    {
      input: { s: "ac" },
      expected: "a",
      description: "Multiple valid answers (a or c)",
      orderMatters: false,
    },
  ],
}
