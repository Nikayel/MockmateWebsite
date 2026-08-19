import type { DSAScenario } from "../../types"

export const regularExpressionMatchingScenario: DSAScenario = {
  id: "dsa-regular-expression-matching",
  title: "Regular Expression Matching",
  type: "dsa",
  pattern: "dp-2d",
  difficulty: "hard",
  companies: ["Google", "Amazon", "Meta", "Microsoft", "Apple"],
  description:
    "Build a matcher where '.' takes any one character and '*' repeats the element before it",
  tags: ["string", "dynamic-programming", "recursion"],
  estimatedTime: 40,
  problemStatement: `You're building a tiny pattern matcher. It receives a string s and a pattern p, and it must decide whether p matches all of s.

Two characters in p carry special meaning. A '.' stands in for exactly one character of s, whatever that character happens to be. A '*' never acts alone: it attaches to the element directly before it and lets that element occur any number of times in a row, including not at all. Every other character in p matches only itself.

Partial coverage doesn't count. Return true only when the pattern accounts for s from its first character through its last; otherwise return false.`,
  examples: [
    {
      input: 's = "bbb", p = "bb"',
      output: "false",
      explanation:
        'The pattern covers "bb" and leaves the third letter dangling, so the match fails.',
    },
    {
      input: 's = "ccc", p = "c*"',
      output: "true",
      explanation: '"c*" stretches to any run of the letter c, three in a row included.',
    },
    {
      input: 's = "xy", p = ".*"',
      output: "true",
      explanation: '".*" pairs a dot with a star, so it can swallow any string, this one included.',
    },
  ],
  constraints: [
    "s is between 1 and 20 characters long.",
    "p is between 1 and 20 characters long.",
    "s holds lowercase English letters only.",
    "p holds lowercase English letters plus '.' and '*'.",
    "Every '*' in p sits directly after a valid element, never first.",
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
