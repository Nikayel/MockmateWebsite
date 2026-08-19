import type { DSAScenario } from "../../types"

export const dsaLongestValidParenthesesScenario: DSAScenario = {
  id: "dsa-longest-valid-parentheses",
  title: "Longest Valid Parentheses",
  type: "dsa",
  pattern: "stack",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
  description: "Measure the longest well-formed parentheses run inside a string",
  tags: ["stack", "string", "dynamic-programming"],
  estimatedTime: 30,
  problemStatement: `You're working with a string s made up solely of '(' and ')' characters. Somewhere in s lives its longest contiguous stretch of parentheses that is fully balanced and properly nested.

Return the length of that stretch.`,
  examples: [
    {
      input: 's = "((())"',
      output: "4",
      explanation: 'The trailing "(())" is the longest well-formed stretch.',
    },
    {
      input: 's = ")()(())("',
      output: "6",
      explanation: 'Characters 1 through 6 form "()(())", six balanced characters in a row.',
    },
    {
      input: 's = ""',
      output: "0",
    },
  ],
  constraints: ["s.length ranges from 0 to 3 * 10^4", "every character of s is '(' or ')'"],
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
