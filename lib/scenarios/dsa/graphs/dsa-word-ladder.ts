import type { DSAScenario } from "../../types"

export const wordLadderScenario: DSAScenario = {
  id: "dsa-word-ladder",
  title: "Word Ladder",
  type: "dsa",
  pattern: "graphs",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta", "Palantir"],
  roles: ["junior", "senior", "swe"],
  description: "Find shortest transformation sequence from begin word to end word.",
  tags: ["graph", "bfs", "hash-table"],
  estimatedTime: 35,
  problemStatement: `A transformation sequence from word beginWord to word endWord using a dictionary wordList is a sequence of words beginWord -> s1 -> s2 -> ... -> sk such that:

- Every adjacent pair of words differs by a single letter.
- Every si for 1 <= i <= k is in wordList. Note that beginWord does not need to be in wordList.
- sk == endWord

Given two words, beginWord and endWord, and a dictionary wordList, return the number of words in the shortest transformation sequence from beginWord to endWord, or 0 if no such sequence exists.`,
  examples: [
    {
      input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]',
      output: "5",
      explanation: "hit -> hot -> dot -> dog -> cog (length 5)",
    },
    {
      input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log"]',
      output: "0",
      explanation: 'endWord "cog" is not in wordList',
    },
  ],
  constraints: [
    "1 <= beginWord.length <= 10",
    "endWord.length == beginWord.length",
    "1 <= wordList.length <= 5000",
    "wordList[i].length == beginWord.length",
    "beginWord, endWord, and wordList[i] consist of lowercase English letters.",
    "beginWord != endWord",
    "All the words in wordList are unique.",
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
