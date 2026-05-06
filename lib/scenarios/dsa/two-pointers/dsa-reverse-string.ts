import type { DSAScenario } from "../../types"

export const dsaReverseStringScenario: DSAScenario = {
  id: "dsa-reverse-string",
  title: "Reverse String",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "easy",
  companies: ["Amazon", "Microsoft", "Apple", "ZipRecruiter"],
  description: "Reverse a string array in-place",
  tags: ["string", "two-pointers", "array"],
  estimatedTime: 10,
  problemStatement: `Write a function that reverses a string. The input string is given as an array of characters s.

You must do this by modifying the input array in-place with O(1) extra memory.`,
  examples: [
    {
      input: 's = ["h","e","l","l","o"]',
      output: '["o","l","l","e","h"]',
    },
    {
      input: 's = ["H","a","n","n","a","h"]',
      output: '["h","a","n","n","a","H"]',
    },
  ],
  constraints: ["1 <= s.length <= 10^5", "s[i] is a printable ascii character"],
  hints: [
    "Use two pointers at start and end",
    "Swap and move pointers toward center",
    "Stop when pointers meet or cross",
  ],
  starterCode: {
    javascript: `function reverseString(s) {
  // Write your solution here

}`,
    typescript: `function reverseString(s: string[]): void {
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
