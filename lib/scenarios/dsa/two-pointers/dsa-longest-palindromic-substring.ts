import type { DSAScenario } from "../../types"

export const dsaLongestPalindromicSubstringScenario: DSAScenario = {
  id: "dsa-longest-palindromic-substring",
  title: "Longest Palindromic Substring",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Find the longest stretch of a string that reads the same in both directions.",
  tags: ["string", "dynamic-programming", "two-pointers"],
  estimatedTime: 25,
  problemStatement: `You're given a string s. Return its longest palindromic substring.

A palindrome reads identically in both directions. When two or more substrings tie for the greatest length, any one of them is an accepted answer.`,
  examples: [
    {
      input: 's = "momon"',
      output: '"mom"',
      explanation: '"omo" is also a valid answer',
    },
    {
      input: 's = "feeg"',
      output: '"ee"',
    },
  ],
  constraints: [
    "s holds between 1 and 1000 characters",
    "every character of s is a digit or an English letter",
  ],
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
