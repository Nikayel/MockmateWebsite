import type { DSAPatternKnowledge } from "../../types"

export const stringKnowledge: DSAPatternKnowledge = {
  pattern: "string",
  displayName: "String Manipulation",
  description:
    "Text processing problems. Often combined with other patterns like sliding window or DP.",
  whenToUse: [
    "Parsing and validation",
    "Pattern matching",
    "String transformation",
    "Anagram and palindrome problems",
    "Substring searches",
  ],
  keyInsights: [
    "Strings are immutable in many languages - use StringBuilder/list",
    "Character frequency counting with hash map",
    "Two-pointer for palindrome checks",
    "Consider ASCII/Unicode differences",
  ],
  commonMistakes: [
    "String concatenation in loops (O(n²))",
    "Case sensitivity issues",
    "Whitespace handling",
    "Unicode/special character issues",
  ],
  timeComplexity: {
    typical: "O(n) for single pass",
    best: "O(1) for length, char access",
    worst: "O(n²) for naive substring search",
  },
  spaceComplexity: {
    typical: "O(n) for new strings",
    notes: "O(1) for in-place on mutable strings",
  },
  relatedPatterns: ["sliding-window", "two-pointers", "dp-2d"],
  prerequisites: ["arrays-hashing"],
  codeTemplate: `def is_anagram(s, t):
  if len(s) != len(t):
      return False

  count = {}
  for c in s:
      count[c] = count.get(c, 0) + 1

  for c in t:
      if c not in count or count[c] == 0:
          return False
      count[c] -= 1

  return True`,
  examples: [
    "Valid Anagram",
    "Longest Palindromic Substring",
    "String to Integer (atoi)",
    "Longest Common Prefix",
  ],
  interviewTips: [
    "Clarify: case sensitive? whitespace handling?",
    "Use character arrays for efficiency",
    "Consider using built-in functions appropriately",
  ],
}
