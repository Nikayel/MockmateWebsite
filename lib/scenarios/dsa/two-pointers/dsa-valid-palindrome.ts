import type { DSAScenario } from "../../types"

export const dsaValidPalindromeScenario: DSAScenario = {
  id: "dsa-valid-palindrome",
  title: "Valid Palindrome",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "easy",
  companies: ["Meta", "Amazon", "Microsoft", "Apple"],
  description: "Check if string is palindrome ignoring non-alphanumeric",
  tags: ["string", "two-pointers"],
  estimatedTime: 15,
  problemStatement: `A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.

Given a string s, return true if it is a palindrome, or false otherwise.`,
  examples: [
    {
      input: 's = "A man, a plan, a canal: Panama"',
      output: "true",
      explanation: '"amanaplanacanalpanama" is a palindrome.',
    },
    {
      input: 's = "race a car"',
      output: "false",
      explanation: '"raceacar" is not a palindrome.',
    },
    {
      input: 's = " "',
      output: "true",
      explanation: "After removing non-alphanumeric characters, it's empty, which is a palindrome.",
    },
  ],
  constraints: ["1 <= s.length <= 2 * 10^5", "s consists only of printable ASCII characters"],
  hints: [
    "Use two pointers from start and end",
    "Skip non-alphanumeric characters",
    "Compare lowercase versions of characters",
  ],
  starterCode: {
    javascript: `function isPalindrome(s) {
  // Write your solution here

}`,
    typescript: `function isPalindrome(s: string): boolean {
  // Write your solution here

}`,
    python: `def is_palindrome(s):
    # Write your solution here
    pass`,
    java: `class Solution {
    public boolean isPalindrome(String s) {
        // Write your solution here
        return false;
    }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { s: "A man, a plan, a canal: Panama" },
      expected: true,
      description: "Classic palindrome",
    },
    { input: { s: "race a car" }, expected: false, description: "Not a palindrome" },
    { input: { s: " " }, expected: true, description: "Empty after cleanup" },
  ],
}
