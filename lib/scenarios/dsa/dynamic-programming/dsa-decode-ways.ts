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
  problemStatement: `You've intercepted a message that was encoded by swapping every letter for its alphabet position: 'A' became "1", 'B' became "2", and so on up to 'Z', which became "26". The digits were then written out with nothing separating them, leaving you a digit string s.

Decoding s means cutting it into chunks so that every chunk is some letter's number. A valid chunk reads as a value from 1 to 26 and never starts with '0', so a lone '0' maps to no letter at all.

Return how many distinct decodings s has. If no valid cutting exists, that answer is 0.`,
  examples: [
    {
      input: 's = "18"',
      output: "2",
      explanation: '"18" could be read as "AH" (1 8) or "R" (18).',
    },
    {
      input: 's = "125"',
      output: "3",
      explanation: '"125" could be read as "ABE" (1 2 5), "LE" (12 5), or "AY" (1 25).',
    },
    {
      input: 's = "07"',
      output: "0",
      explanation: '"07" has no reading, since a chunk may never start with "0".',
    },
  ],
  constraints: [
    "s holds between 1 and 100 characters",
    "s is made of digits only, and leading zeros can appear",
  ],
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
