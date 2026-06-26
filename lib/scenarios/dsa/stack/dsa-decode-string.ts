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
  problemStatement: `Given an encoded string, return its decoded string.

The encoding rule is: k[encoded_string], where the encoded_string inside the square brackets is being repeated exactly k times. Note that k is guaranteed to be a positive integer.

You may assume that the input string is always valid; there are no extra white spaces, square brackets are well-formed, etc. Furthermore, you may assume that the original data does not contain any digits and that digits are only for those repeat numbers, k.`,
  examples: [
    {
      input: 's = "3[a]2[bc]"',
      output: '"aaabcbc"',
    },
    {
      input: 's = "3[a2[c]]"',
      output: '"accaccacc"',
      explanation: 'Inner 2[c] = "cc", then 3[acc] = "accaccacc"',
    },
    {
      input: 's = "2[abc]3[cd]ef"',
      output: '"abcabccdcdcdef"',
    },
  ],
  constraints: [
    "1 <= s.length <= 30",
    "s consists of lowercase English letters, digits, and square brackets",
    "s is guaranteed to be a valid input",
    "All the integers in s are in the range [1, 300]",
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
  ],
}
