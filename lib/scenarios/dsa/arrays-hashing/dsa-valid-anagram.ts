import type { DSAScenario } from "../../types"

export const dsaValidAnagramScenario: DSAScenario = {
  id: "dsa-valid-anagram",
  title: "Valid Anagram",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "TikTok", "Spotify", "Palantir"],
  roles: ["intern", "new-grad", "swe", "fdse"],
  description: "Determine if two strings are anagrams of each other",
  tags: ["string", "hash-table", "sorting"],
  estimatedTime: 15,
  problemStatement: `Given two strings s and t, return true if t is an anagram of s, and false otherwise.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.`,
  examples: [
    { input: 's = "anagram", t = "nagaram"', output: "true" },
    { input: 's = "rat", t = "car"', output: "false" },
  ],
  constraints: [
    "1 <= s.length, t.length <= 5 * 10^4",
    "s and t consist of lowercase English letters",
  ],
  hints: [
    "Count character frequencies in both strings",
    "Compare the frequency maps",
    "Alternative: Sort both strings and compare",
  ],
  starterCode: {
    javascript: `function isAnagram(s, t) {\n  // Write your solution here\n\n}`,
    typescript: `function isAnagram(s: string, t: string): boolean {\n  // Write your solution here\n\n}`,
    python: `def isAnagram(s, t):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    { input: { s: "anagram", t: "nagaram" }, expected: true, description: "Valid anagram" },
    { input: { s: "rat", t: "car" }, expected: false, description: "Not anagram" },
    { input: { s: "a", t: "a" }, expected: true, description: "Single char" },
    { input: { s: "ab", t: "a" }, expected: false, description: "Different lengths" },
  ],
}
