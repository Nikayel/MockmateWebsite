import type { DSAScenario } from "../../types"

export const wordLadderScenario: DSAScenario = {
  id: "dsa-word-ladder",
  title: "Word Ladder",
  type: "dsa",
  pattern: "graphs",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta", "Palantir"],
  roles: ["junior", "senior", "swe"],
  description:
    "Count the words in the shortest one-letter-at-a-time chain from one word to another",
  tags: ["graph", "hash-table", "bfs"],
  estimatedTime: 35,
  problemStatement: `You're given a starting word beginWord, a target word endWord, and a bank of usable words wordList. Your goal is to morph beginWord into endWord through a chain of words in which every link changes exactly one letter position and keeps all the other letters where they were.

Each word appearing in the chain after beginWord, endWord included, must be a member of wordList; beginWord itself is exempt from that requirement. Return how many words the shortest such chain contains, counting both beginWord and endWord. If endWord can never be reached this way, return 0.

As an illustration, pit, pat, mat, man is a valid chain of 4 words: each hop rewrites just one letter of the word before it, and every word after the first belongs to the bank.`,
  examples: [
    {
      input: 'beginWord = "pit", endWord = "man", wordList = ["pat","mat","man","map","pan"]',
      output: "4",
      explanation: "pit -> pat -> mat -> man uses 4 words in total.",
    },
    {
      input: 'beginWord = "pit", endWord = "man", wordList = ["pat","mat","map","pan"]',
      output: "0",
      explanation: 'No chain can end on "man" because wordList does not contain it.',
    },
  ],
  constraints: [
    "beginWord.length runs from 1 to 10",
    "endWord and every word in wordList match beginWord's length",
    "wordList carries between 1 and 5000 entries",
    "only lowercase English letters appear in any of the words",
    "beginWord and endWord are different words",
    "no duplicate words exist inside wordList",
  ],
  hints: [
    "Model as graph: words are nodes, edges connect words differing by 1 letter",
    "Use BFS for shortest path",
    "Optimize by creating pattern map (h*t -> hot, hit)",
  ],
  starterCode: {
    javascript: `function ladderLength(beginWord, endWord, wordList) {
// Write your solution here

}`,
    typescript: `function ladderLength(beginWord: string, endWord: string, wordList: string[]): number {
// Write your solution here

}`,
    python: `def ladderLength(beginWord, endWord, wordList):
  # Write your solution here
  pass`,
  },
  optimalComplexity: {
    time: "O(M^2 * N)",
    space: "O(M^2 * N)",
  },
  testCases: [
    {
      input: {
        beginWord: "hit",
        endWord: "cog",
        wordList: ["hot", "dot", "dog", "lot", "log", "cog"],
      },
      expected: 5,
      description: "Standard transformation sequence",
    },
    {
      input: { beginWord: "hit", endWord: "cog", wordList: ["hot", "dot", "dog", "lot", "log"] },
      expected: 0,
      description: "End word not in list",
    },
    {
      input: { beginWord: "hot", endWord: "dog", wordList: ["hot", "dog"] },
      expected: 0,
      description: "No valid path (differ by 2 letters)",
    },
    {
      input: { beginWord: "a", endWord: "c", wordList: ["a", "b", "c"] },
      expected: 2,
      description: "Single letter words",
    },
  ],
}
