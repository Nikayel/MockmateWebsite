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
  problemStatement: `You're given two strings s and t. Decide whether t is an anagram of s: return true if it is, false if it is not.

An anagram reorders all the letters of one string into another, spending each letter exactly as many times as it occurs in the original.`,
  examples: [
    { input: 's = "dusty", t = "study"', output: "true" },
    { input: 's = "grab", t = "crab"', output: "false" },
  ],
  constraints: [
    "s and t each contain between 1 and 5 * 10^4 characters.",
    "Both strings are made of lowercase English letters only.",
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
    // Every false case above differed in its set of letters or its length, so comparing
    // character SETS passed. Anagrams need matching counts, not matching letters.
    {
      input: { s: "aab", t: "abb" },
      expected: false,
      description: "Same letters, different counts",
    },
    // And every pair differed in the sum of its character codes, so adding up ord() values
    // passed too. Here both strings sum to 197.
    { input: { s: "ad", t: "bc" }, expected: false, description: "Equal character-code sums" },
  ],
}
