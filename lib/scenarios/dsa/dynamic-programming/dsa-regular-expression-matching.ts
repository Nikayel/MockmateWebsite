import type { DSAScenario } from "../../types"

export const regularExpressionMatchingScenario: DSAScenario = {
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
}
