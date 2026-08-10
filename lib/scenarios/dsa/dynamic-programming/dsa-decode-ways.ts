import type { DSAScenario } from "../../types"

export const decodeWaysScenario: DSAScenario = {
  id: "dsa-decode-ways",
  title: "Decode Ways",
  type: "dsa",
  pattern: "dp-1d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
  description: "Count ways to decode a digit string into letters",
  tags: ["dynamic-programming", "string"],
  estimatedTime: 25,
  problemStatement: `A message containing letters from A-Z can be encoded into numbers using the following mapping:

'A' -> "1"
'B' -> "2"
...
'Z' -> "26"

To decode an encoded message, all the digits must be grouped then mapped back into letters using the reverse of the mapping above (there may be multiple ways).

Given a string s containing only digits, return the number of ways to decode it.`,
  examples: [
    {
      input: 's = "12"',
      output: "2",
      explanation: '"12" could be decoded as "AB" (1 2) or "L" (12).',
    },
    {
      input: 's = "226"',
      output: "3",
      explanation: '"226" could be decoded as "BZ" (2 26), "VF" (22 6), or "BBF" (2 2 6).',
    },
    {
      input: 's = "06"',
      output: "0",
      explanation: '"06" cannot be mapped because leading zeros are invalid.',
    },
  ],
  constraints: ["1 <= s.length <= 100", "s contains only digits and may contain leading zero(s)."],
  hints: [
    "dp[i] = number of ways to decode s[0:i]",
    "Single digit: if s[i-1] != '0', dp[i] += dp[i-1]",
    "Two digits: if 10 <= s[i-2:i] <= 26, dp[i] += dp[i-2]",
    "Handle leading zeros carefully - '0' alone is invalid",
  ],
  starterCode: {
    javascript: `function numDecodings(s) {
// Write your solution here

}`,
    typescript: `function numDecodings(s: string): number {
// Write your solution here

}`,
    python: `def numDecodings(s):
  # Write your solution here
  pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    { input: { s: "12" }, expected: 2, description: "AB or L" },
    { input: { s: "226" }, expected: 3, description: "BZ, VF, or BBF" },
    { input: { s: "06" }, expected: 0, description: "Leading zero invalid" },
    { input: { s: "10" }, expected: 1, description: "Only J (10)" },
    { input: { s: "2101" }, expected: 1, description: "Complex with zeros" },
    { input: { s: "11106" }, expected: 2, description: "AAJ F or KJF" },
    // No pair above falls in 27-29, so a solution whose two-digit test was <= 29 instead of
    // <= 26 passed. The alphabet stops at 26, so "27" has exactly one decoding.
    { input: { s: "27" }, expected: 1, description: "Two-digit pair above 26 is not a letter" },
  ],
}
