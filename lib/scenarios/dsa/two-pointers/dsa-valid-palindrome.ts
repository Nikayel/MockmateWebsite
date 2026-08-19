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
  problemStatement: `You're given a string s. Decide whether it qualifies as a palindrome under this definition: lowercase every uppercase letter, discard every character that is neither a letter nor a digit, and what remains must read identically in both directions. Letters and digits are the alphanumeric characters.

Return true when s passes that test, and false when it does not.`,
  examples: [
    {
      input: 's = "No lemon, no melon!"',
      output: "true",
      explanation: '"nolemonnomelon" is a palindrome.',
    },
    {
      input: 's = "hello world"',
      output: "false",
      explanation: '"helloworld" is not a palindrome.',
    },
    {
      input: 's = "?!"',
      output: "true",
      explanation:
        "Stripping the punctuation leaves an empty string, and an empty string is a palindrome.",
    },
  ],
  constraints: [
    "s holds between 1 and 2 * 10^5 characters",
    "every character of s is printable ASCII",
  ],
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
    // No case contained a digit, so keeping only LETTERS passed. Digits are alphanumeric and
    // must be kept: dropping the 0 here turns a non-palindrome into a single letter.
    { input: { s: "0P" }, expected: false, description: "Digits count as alphanumeric" },
  ],
}
