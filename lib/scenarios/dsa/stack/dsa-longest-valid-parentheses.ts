import type { DSAScenario } from "../../types"

export const dsaLongestValidParenthesesScenario: DSAScenario = {
  id: "dsa-longest-valid-parentheses",
  title: "Longest Valid Parentheses",
  type: "dsa",
  pattern: "stack",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
  description: "Find the length of the longest valid parentheses substring",
  tags: ["stack", "string", "dynamic-programming"],
  estimatedTime: 30,
  problemStatement: `Given a string containing just the characters '(' and ')', return the length of the longest valid (well-formed) parentheses substring.`,
  examples: [
    {
      input: 's = "(()"',
      output: "2",
      explanation: 'The longest valid parentheses substring is "()".',
    },
    {
      input: 's = ")()())"',
      output: "4",
      explanation: 'The longest valid parentheses substring is "()()".',
    },
    {
      input: 's = ""',
      output: "0",
    },
  ],
  constraints: ["0 <= s.length <= 3 * 10^4", "s[i] is '(' or ')'"],
  hints: [
    "Stack approach: push indices, not characters",
    "Initialize stack with -1 as base for length calculation",
    "On '(': push index. On ')': pop, then calculate length from new top",
    "DP approach: dp[i] = length of valid substring ending at i",
    "Two-pass O(1) space: count left/right passes",
  ],
  starterCode: {
    javascript: `function longestValidParentheses(s) {
  // Write your solution here

}`,
    typescript: `function longestValidParentheses(s: string): number {
  // Write your solution here

}`,
    python: `def longestValidParentheses(s):
    # Write your solution here
    pass`,
    java: `class Solution {
    public int longestValidParentheses(String s) {
        // Write your solution here
        return 0;
    }
}`,
  },
  optimalComplexity: { time: "O(n)", space: "O(n) or O(1) with two-pass" },
  testCases: [
    { input: { s: "(()" }, expected: 2, description: "Simple case" },
    { input: { s: ")()())" }, expected: 4, description: "Valid in middle" },
    { input: { s: "" }, expected: 0, description: "Empty string" },
    { input: { s: "()()" }, expected: 4, description: "Full valid" },
    { input: { s: "(()(()" }, expected: 2, description: "Nested incomplete" },
    { input: { s: "(()()" }, expected: 4, description: "Prefix incomplete" },
  ],
}
