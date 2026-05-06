import type { DSAScenario } from "../../types"

export const dsaGroupAnagramsScenario: DSAScenario = {
  id: "dsa-group-anagrams",
  title: "Group Anagrams",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "Spotify", "Pinterest", "ZipRecruiter"],
  description: "Group strings that are anagrams of each other",
  tags: ["array", "hash-table", "string", "sorting"],
  estimatedTime: 20,
  problemStatement: `Given an array of strings strs, group the anagrams together. You can return the answer in any order.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.`,
  examples: [
    {
      input: 'strs = ["eat","tea","tan","ate","nat","bat"]',
      output: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
    },
    {
      input: 'strs = [""]',
      output: '[[""]]',
    },
    {
      input: 'strs = ["a"]',
      output: '[["a"]]',
    },
  ],
  constraints: [
    "1 <= strs.length <= 10^4",
    "0 <= strs[i].length <= 100",
    "strs[i] consists of lowercase English letters",
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
  ],
}
