import type { DSAScenario } from "../../types"

export const dsaGroupAnagramsScenario: DSAScenario = {
  id: "dsa-group-anagrams",
  title: "Group Anagrams",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "medium",
  companies: [
    "Amazon",
    "Meta",
    "Google",
    "Microsoft",
    "Spotify",
    "Pinterest",
    "ZipRecruiter",
    "Palantir",
  ],
  roles: ["intern", "new-grad", "junior", "swe", "fdse"],
  description: "Group strings that are anagrams of each other",
  tags: ["array", "hash-table", "string", "sorting"],
  estimatedTime: 20,
  problemStatement: `You're given an array of strings strs. Two strings are anagrams when one can be spelled by shuffling the other's letters around, using every letter the same number of times.

Bundle the anagrams of strs into groups and return the groups as a list of lists. Order doesn't matter, either across the groups or inside them.`,
  examples: [
    {
      input: 'strs = ["pots","stop","dear","read","dare","cusp"]',
      output: '[["pots","stop"],["dear","read","dare"],["cusp"]]',
    },
    {
      input: 'strs = ["",""]',
      output: '[["",""]]',
    },
    {
      input: 'strs = ["z"]',
      output: '[["z"]]',
    },
  ],
  constraints: [
    "strs has between 1 and 10^4 entries.",
    "Each string runs from 0 to 100 characters long.",
    "Every string is made of lowercase English letters.",
  ],
  hints: [
    "Use a hash map where the key is a sorted version of the string",
    "All anagrams will have the same sorted string",
    "Group strings with the same key together",
  ],
  starterCode: {
    javascript: `function groupAnagrams(strs) {
  // Write your solution here

}`,
    typescript: `function groupAnagrams(strs: string[]): string[][] {
  // Write your solution here

}`,
    python: `def groupAnagrams(strs):
    # Write your solution here
    pass`,
  },
  optimalComplexity: {
    time: "O(n * k log k)",
    space: "O(n * k)",
  },
  testCases: [
    {
      input: { strs: ["eat", "tea", "tan", "ate", "nat", "bat"] },
      expected: [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]],
      description: "Multiple anagram groups (order-independent comparison)",
      // Note: Groups sorted by first element, inner arrays sorted alphabetically
      compareAsSet: true,
    },
    {
      input: { strs: [""] },
      expected: [[""]],
      description: "Empty string",
    },
    {
      input: { strs: ["a"] },
      expected: [["a"]],
      description: "Single character",
    },
    {
      input: { strs: ["ab", "ba", "abc", "bca", "cab"] },
      expected: [
        ["ab", "ba"],
        ["abc", "bca", "cab"],
      ],
      description: "Multiple groups (order-independent comparison)",
      compareAsSet: true,
    },
    {
      input: { strs: ["a", "b", "c"] },
      expected: [["a"], ["b"], ["c"]],
      description: "No anagrams (order-independent comparison)",
      compareAsSet: true,
    },
    // Wherever two words above shared a set of letters they also shared the counts, so
    // keying on the distinct characters grouped them the same way. Anagrams need matching
    // MULTISETS: "aab" and "abb" use the same two letters and are not anagrams.
    {
      input: { strs: ["aab", "abb"] },
      expected: [["aab"], ["abb"]],
      description: "Same letters, different counts, so not anagrams",
      compareAsSet: true,
    },
  ],
}
