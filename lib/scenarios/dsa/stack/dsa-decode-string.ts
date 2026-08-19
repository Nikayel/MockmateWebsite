import type { DSAScenario } from "../../types"

export const dsaDecodeStringScenario: DSAScenario = {
  id: "dsa-decode-string",
  title: "Decode String",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Google", "Amazon", "Apple", "Microsoft", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe", "fdse"],
  description: "Decode an encoded string with nested patterns",
  tags: ["stack", "string", "recursion"],
  estimatedTime: 25,
  problemStatement: `You're given an encoded string s. Expand it and return the plain decoded text.

The encoding follows one rule, k[piece]: a positive integer k directly before a square-bracketed piece means that piece repeats k consecutive times in the decoded text, and encodings can nest inside one another. The input always arrives cleanly formed, with every bracket paired and no stray whitespace, and digits appear only as those repeat counts k, never in the decoded text itself.`,
  examples: [
    {
      input: 's = "4[x]2[yz]"',
      output: '"xxxxyzyz"',
    },
    {
      input: 's = "2[b4[d]]"',
      output: '"bddddbdddd"',
      explanation: 'The inner 4[d] becomes "dddd", so the outer group repeats "bdddd" twice.',
    },
    {
      input: 's = "3[pq]5[r]st"',
      output: '"pqpqpqrrrrrst"',
    },
  ],
  constraints: [
    "s measures 1 to 30 characters",
    "s contains only lowercase English letters, digits, and square brackets",
    "s always arrives as a well-formed encoding",
    "every repeat count k in s falls between 1 and 300",
  ],
  hints: [
    "Use two stacks: one for counts, one for strings",
    'When you see "[", push current string and count to stacks',
    'When you see "]", pop and repeat the current string',
  ],
  starterCode: {
    javascript: `function decodeString(s) {
  // Write your solution here

}`,
    typescript: `function decodeString(s: string): string {
  // Write your solution here

}`,
    python: `def decode_string(s):
    # Write your solution here
    pass`,
    java: `class Solution {
    public String decodeString(String s) {
        // Write your solution here
        return "";
    }
}`,
  },
  optimalComplexity: {
    time: "O(n * maxK)",
    space: "O(n)",
  },
  testCases: [
    { input: { s: "3[a]2[bc]" }, expected: "aaabcbc", description: "Simple pattern" },
    { input: { s: "3[a2[c]]" }, expected: "accaccacc", description: "Nested pattern" },
    {
      input: { s: "2[abc]3[cd]ef" },
      expected: "abcabccdcdcdef",
      description: "Multiple patterns with suffix",
    },
    // Every repeat count above is a single digit, so a solution that read one character as
    // the count worked. A two-digit count needs the digits accumulated.
    { input: { s: "10[a]" }, expected: "aaaaaaaaaa", description: "Two-digit repeat count" },
  ],
}
