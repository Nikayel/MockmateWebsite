import type { DSAScenario } from "../../types"

export const alienDictionaryScenario: DSAScenario = {
  id: "dsa-alien-dictionary",
  title: "Alien Dictionary",
  type: "dsa",
  pattern: "topological-sort",
  difficulty: "hard",
  companies: ["Google", "Amazon", "Meta", "Microsoft", "Apple", "Palantir"],
  roles: ["junior", "senior", "swe"],
  description: "Derive the order of letters in an alien language using topological sort",
  tags: ["graph", "topological-sort", "string", "dfs", "bfs"],
  estimatedTime: 35,
  problemStatement: `There is a new alien language that uses the English alphabet. However, the order of the letters is unknown to you.

You are given a list of strings words from the alien language's dictionary, where the strings are sorted lexicographically by the rules of this new language.

Derive the order of letters in this language. If the order is invalid, return an empty string. If there are multiple valid orderings, return any of them.`,
  examples: [
    {
      input: 'words = ["wrt","wrf","er","ett","rftt"]',
      output: '"wertf"',
      explanation: "From the words, we can derive: w < e, r < t, t < f, e < r",
    },
    {
      input: 'words = ["z","x"]',
      output: '"zx"',
    },
    {
      input: 'words = ["z","x","z"]',
      output: '""',
      explanation: "The order is invalid, so return empty string.",
    },
  ],
  constraints: [
    "1 <= words.length <= 100",
    "1 <= words[i].length <= 100",
    "words[i] consists of only lowercase English letters.",
  ],
  hints: [
    "Compare adjacent words to build directed edges",
    "First differing character gives us ordering: char1 < char2",
    "Check for invalid case: shorter word comes after longer prefix",
    "Run topological sort (Kahn's or DFS) on the graph",
  ],
  starterCode: {
    javascript: `function alienOrder(words) {
// Write your solution here

}`,
    typescript: `function alienOrder(words: string[]): string {
// Write your solution here

}`,
    python: `def alienOrder(words):
  # Write your solution here
  pass`,
  },
  optimalComplexity: { time: "O(C) where C is total characters", space: "O(1) - max 26 letters" },
  testCases: [
    {
      input: { words: ["wrt", "wrf", "er", "ett", "rftt"] },
      expected: "wertf",
      description: "Standard case",
    },
    { input: { words: ["z", "x"] }, expected: "zx", description: "Two words" },
    { input: { words: ["z", "x", "z"] }, expected: "", description: "Invalid order" },
    { input: { words: ["abc", "ab"] }, expected: "", description: "Invalid: prefix comes after" },
  ],
}
