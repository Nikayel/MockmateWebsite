import type { DSAScenario } from "../../types"

export const alienDictionaryScenario: DSAScenario = {
  id: "dsa-alien-dictionary",
  title: "Alien Dictionary",
  type: "dsa",
  pattern: "topological-sort",
  difficulty: "hard",
  companies: ["Google", "Amazon", "Meta", "Microsoft", "Apple", "Palantir"],
  roles: ["junior", "senior", "swe"],
  description: "Reconstruct an alien alphabet from a lexicographically sorted word list",
  tags: ["graph", "string", "topological-sort", "dfs", "bfs"],
  estimatedTime: 35,
  problemStatement: `An expedition has recovered a dictionary from an alien civilization. The language reuses the lowercase English letters, but its alphabet arranges them in some unknown order.

You're given words, a list of strings appearing exactly as the dictionary printed them: sorted according to that alien alphabet. In any alphabet, a word always sorts before a longer word that begins with it, so a list placing a word after one of its own extensions can't come from any alphabet. Reconstruct an ordering of the letters that is consistent with the list and return it as a string. When more than one ordering fits the evidence, any of them is accepted. When no alphabet could have produced this list, return an empty string.`,
  examples: [
    {
      input: 'words = ["dmb","dmz","gm","gbb","mzbb"]',
      output: '"dgmbz"',
      explanation:
        "Neighboring words reveal b before z, d before g, m before b, and g before m, which chains into d, g, m, b, z.",
    },
    {
      input: 'words = ["p","f"]',
      output: '"pf"',
    },
    {
      input: 'words = ["k","w","k"]',
      output: '""',
      explanation: "The list puts k before w and also w before k, so no alphabet can explain it.",
    },
  ],
  constraints: [
    "words holds between 1 and 100 strings",
    "each word runs 1 to 100 characters long",
    "every character is a lowercase English letter",
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
