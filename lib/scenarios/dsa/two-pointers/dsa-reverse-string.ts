import type { DSAScenario } from "../../types"

export const dsaReverseStringScenario: DSAScenario = {
  id: "dsa-reverse-string",
  title: "Reverse String",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "easy",
  companies: ["Amazon", "Microsoft", "Apple", "ZipRecruiter"],
  description: "Reverse a string array in-place",
  tags: ["string", "array", "two-pointers"],
  estimatedTime: 10,
  problemStatement: `You're given a character array s that spells out a string. Reverse it, so the characters end up running from last to first.

All rearranging has to happen inside s itself, and you may claim no more than O(1) additional memory. Return s once it is reversed.`,
  examples: [
    {
      input: 's = ["s","p","a","r","k"]',
      output: '["k","r","a","p","s"]',
    },
    {
      input: 's = ["R","o","t","a","t","o","r"]',
      output: '["r","o","t","a","t","o","R"]',
    },
  ],
  constraints: [
    "s holds between 1 and 10^5 characters",
    "every entry of s is a printable ascii character",
  ],
  hints: [
    "Use two pointers at start and end",
    "Swap and move pointers toward center",
    "Stop when pointers meet or cross",
  ],
  starterCode: {
    javascript: `function reverseString(s) {
  // Write your solution here

}`,
    typescript: `function reverseString(s: string[]): string[] {
  // Write your solution here

}`,
    python: `def reverse_string(s):
    # Write your solution here
    pass`,
    java: `class Solution {
    public void reverseString(char[] s) {
        // Write your solution here
    }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { s: ["h", "e", "l", "l", "o"] },
      expected: ["o", "l", "l", "e", "h"],
      description: "Standard case",
    },
    {
      input: { s: ["H", "a", "n", "n", "a", "h"] },
      expected: ["h", "a", "n", "n", "a", "H"],
      description: "Palindrome input",
    },
  ],
}
