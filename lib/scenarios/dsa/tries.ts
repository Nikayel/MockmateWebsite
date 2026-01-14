/**
 * Tries DSA Scenarios
 * Pattern: tries
 *
 * Trie (prefix tree) problems - essential for autocomplete,
 * spell checking, and word search problems. Common at Google, Amazon, Meta.
 */

import type { DSAScenario } from "../types"

export const triesScenarios: DSAScenario[] = [
  {
    id: "dsa-implement-trie",
    title: "Implement Trie (Prefix Tree)",
    type: "dsa",
    pattern: "trie",
    difficulty: "medium",
    companies: ["Google", "Amazon", "Meta", "Microsoft"],
    description:
      "Design and implement a trie data structure with insert, search, and startsWith operations",
    tags: ["trie", "design", "string", "hash-table"],
    estimatedTime: 25,
    problemStatement: `A trie (pronounced as "try") or prefix tree is a tree data structure used to efficiently store and retrieve keys in a dataset of strings. There are various applications of this data structure, such as autocomplete and spellchecker.

Implement the Trie class:
- Trie() Initializes the trie object.
- void insert(String word) Inserts the string word into the trie.
- boolean search(String word) Returns true if the string word is in the trie (i.e., was inserted before), and false otherwise.
- boolean startsWith(String prefix) Returns true if there is a previously inserted string word that has the prefix prefix, and false otherwise.`,
    examples: [
      {
        input:
          '["Trie", "insert", "search", "search", "startsWith", "insert", "search"]\n[[], ["apple"], ["apple"], ["app"], ["app"], ["app"], ["app"]]',
        output: "[null, null, true, false, true, null, true]",
        explanation:
          'Trie trie = new Trie();\ntrie.insert("apple"); trie.search("apple"); // true\ntrie.search("app"); // false\ntrie.startsWith("app"); // true\ntrie.insert("app"); trie.search("app"); // true',
      },
    ],
    constraints: [
      "1 <= word.length, prefix.length <= 2000",
      "word and prefix consist only of lowercase English letters.",
      "At most 3 * 10^4 calls in total will be made to insert, search, and startsWith.",
    ],
    hints: [
      "Each node in the trie should have an array of 26 children (for lowercase letters) and a boolean to mark end of word",
      "For insert, traverse character by character, creating nodes as needed",
      "For search, traverse and check if final node is marked as end of word",
      "For startsWith, traverse and just check if you can reach the end of prefix",
    ],
    starterCode: {
      javascript: `class Trie {
  constructor() {
    // Initialize your data structure here
  }

  insert(word) {
    // Insert a word into the trie
  }

  search(word) {
    // Returns true if word is in trie
  }

  startsWith(prefix) {
    // Returns true if any word starts with prefix
  }
}`,
      typescript: `class Trie {
  constructor() {
    // Initialize your data structure here
  }

  insert(word: string): void {
    // Insert a word into the trie
  }

  search(word: string): boolean {
    // Returns true if word is in trie
  }

  startsWith(prefix: string): boolean {
    // Returns true if any word starts with prefix
  }
}`,
      python: `class Trie:
    def __init__(self):
        # Initialize your data structure here
        pass

    def insert(self, word: str) -> None:
        # Insert a word into the trie
        pass

    def search(self, word: str) -> bool:
        # Returns true if word is in trie
        pass

    def startsWith(self, prefix: str) -> bool:
        # Returns true if any word starts with prefix
        pass`,
      java: `class Trie {
    public Trie() {
        // Initialize your data structure here
    }

    public void insert(String word) {
        // Insert a word into the trie
    }

    public boolean search(String word) {
        // Returns true if word is in trie
        return false;
    }

    public boolean startsWith(String prefix) {
        // Returns true if any word starts with prefix
        return false;
    }
}`,
    },
    optimalComplexity: {
      time: "O(m) for all operations where m is key length",
      space: "O(n * m) where n is number of keys",
    },
    testCases: [
      {
        input: { operations: ["insert", "search"], args: [["apple"], ["apple"]] },
        expected: [null, true],
        description: "Basic insert and search",
      },
      {
        input: { operations: ["insert", "search"], args: [["apple"], ["app"]] },
        expected: [null, false],
        description: "Search for prefix that is not a complete word",
      },
      {
        input: { operations: ["insert", "startsWith"], args: [["apple"], ["app"]] },
        expected: [null, true],
        description: "startsWith for valid prefix",
      },
      {
        input: { operations: ["insert", "insert", "search"], args: [["apple"], ["app"], ["app"]] },
        expected: [null, null, true],
        description: "Insert prefix as word, then search",
      },
      {
        input: { operations: ["search"], args: [["a"]] },
        expected: [false],
        description: "Search in empty trie",
      },
    ],
  },
  {
    id: "dsa-word-search-ii",
    title: "Word Search II",
    type: "dsa",
    pattern: "trie",
    difficulty: "hard",
    companies: ["Google", "Amazon", "Meta", "Microsoft", "Apple"],
    description: "Find all words from a dictionary that exist in a 2D board of characters",
    tags: ["trie", "backtracking", "matrix", "dfs"],
    estimatedTime: 45,
    problemStatement: `Given an m x n board of characters and a list of strings words, return all words on the board.

Each word must be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once in a word.`,
    examples: [
      {
        input:
          'board = [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]], words = ["oath","pea","eat","rain"]',
        output: '["eat","oath"]',
        explanation: 'Both "oath" and "eat" can be constructed from adjacent letters on the board.',
      },
      {
        input: 'board = [["a","b"],["c","d"]], words = ["abcb"]',
        output: "[]",
        explanation: 'The word "abcb" cannot be formed without reusing cells.',
      },
    ],
    constraints: [
      "m == board.length",
      "n == board[i].length",
      "1 <= m, n <= 12",
      "board[i][j] is a lowercase English letter.",
      "1 <= words.length <= 3 * 10^4",
      "1 <= words[i].length <= 10",
      "words[i] consists of lowercase English letters.",
      "All the strings of words are unique.",
    ],
    hints: [
      "Build a Trie from all words first - this allows efficient prefix checking",
      "For each cell in the board, start a DFS if the character exists in trie",
      "During DFS, prune branches that don't match any word prefix",
      "Remove words from trie after finding them to avoid duplicates",
      "Mark cells as visited during DFS and restore after backtracking",
    ],
    starterCode: {
      javascript: `function findWords(board, words) {
  // Build trie and search using backtracking
}`,
      typescript: `function findWords(board: string[][], words: string[]): string[] {
  // Build trie and search using backtracking
}`,
      python: `def findWords(board: list[list[str]], words: list[str]) -> list[str]:
    # Build trie and search using backtracking
    pass`,
      java: `class Solution {
    public List<String> findWords(char[][] board, String[] words) {
        // Build trie and search using backtracking
        return new ArrayList<>();
    }
}`,
    },
    optimalComplexity: {
      time: "O(m * n * 4^L) where L is max word length",
      space: "O(N) for trie where N is total characters in words",
    },
    testCases: [
      {
        input: {
          board: [
            ["o", "a", "a", "n"],
            ["e", "t", "a", "e"],
            ["i", "h", "k", "r"],
            ["i", "f", "l", "v"],
          ],
          words: ["oath", "pea", "eat", "rain"],
        },
        expected: ["eat", "oath"],
        description: "Standard case with multiple found words",
      },
      {
        input: {
          board: [
            ["a", "b"],
            ["c", "d"],
          ],
          words: ["abcb"],
        },
        expected: [],
        description: "Word requires reusing cell - invalid",
      },
      {
        input: { board: [["a"]], words: ["a"] },
        expected: ["a"],
        description: "Single cell board with matching word",
      },
      {
        input: { board: [["a", "a"]], words: ["aaa"] },
        expected: [],
        description: "Word longer than available path",
      },
    ],
  },
  {
    id: "dsa-design-autocomplete",
    title: "Design Search Autocomplete System",
    type: "dsa",
    pattern: "trie",
    difficulty: "hard",
    companies: ["Google", "Amazon", "Meta", "Microsoft", "Apple"],
    description: "Design a search autocomplete system that returns top 3 historical hot sentences",
    tags: ["trie", "design", "string", "heap", "sorting"],
    estimatedTime: 45,
    problemStatement: `Design a search autocomplete system for a search engine. Users may input a sentence (at least one word and end with a special character '#').

You are given a string array sentences and an integer array times both of length n where sentences[i] is a previously typed sentence and times[i] is the corresponding number of times the sentence was typed.

For each input character except '#', return the top 3 historical hot sentences that have the same prefix as the part of the sentence already typed. Here are the specific rules:

- The hot degree for a sentence is defined as the number of times a user typed the exactly same sentence before.
- The returned top 3 hot sentences should be sorted by hot degree (descendingly). If several sentences have the same hot degree, use ASCII-code order (smaller one appears first).
- If less than 3 hot sentences exist, return as many as you can.
- When the input is '#', it means the sentence ends, and in this case, you need to return an empty list.

Implement the AutocompleteSystem class:
- AutocompleteSystem(String[] sentences, int[] times) Initializes the object with sentences and times.
- List<String> input(char c) Takes the next character c of the input sentence and returns the hot sentences.`,
    examples: [
      {
        input:
          'AutocompleteSystem(["i love you", "island", "iroman", "i love leetcode"], [5, 3, 2, 2])\ninput("i")\ninput(" ")\ninput("a")\ninput("#")',
        output:
          '[["i love you", "island", "i love leetcode"], ["i love you", "i love leetcode"], [], []]',
        explanation:
          'After typing "i", top 3 are returned. After "i ", only sentences starting with "i " qualify. After "i a", no matches. "#" ends input.',
      },
    ],
    constraints: [
      "n == sentences.length == times.length",
      "1 <= n <= 100",
      "1 <= sentences[i].length <= 100",
      "1 <= times[i] <= 50",
      'c is a lowercase English letter, a hash "#", or space " ".',
      'Each tested sentence will be a sequence of characters c that end with "#".',
      "At most 5000 calls will be made to input.",
    ],
    hints: [
      "Use a Trie to store all sentences with their frequencies at leaf nodes",
      "Store the current prefix being typed and traverse trie as user types",
      "At each node, you need quick access to top 3 sentences - consider storing sorted list at each node",
      'When user types "#", add the complete sentence to trie and reset current prefix',
    ],
    starterCode: {
      javascript: `class AutocompleteSystem {
  constructor(sentences, times) {
    // Initialize trie with historical data
  }

  input(c) {
    // Return top 3 hot sentences for current prefix
    return [];
  }
}`,
      typescript: `class AutocompleteSystem {
  constructor(sentences: string[], times: number[]) {
    // Initialize trie with historical data
  }

  input(c: string): string[] {
    // Return top 3 hot sentences for current prefix
    return [];
  }
}`,
      python: `class AutocompleteSystem:
    def __init__(self, sentences: list[str], times: List[int]):
        # Initialize trie with historical data
        pass

    def input(self, c: str) -> list[str]:
        # Return top 3 hot sentences for current prefix
        return []`,
    },
    optimalComplexity: {
      time: "O(p + q + mlogm) per input where p=prefix length, q=query results, m=matching sentences",
      space: "O(n * l) where n=sentences, l=avg length",
    },
    testCases: [
      {
        input: {
          sentences: ["i love you", "island", "i love leetcode"],
          times: [5, 3, 2],
          inputs: ["i"],
        },
        expected: [["i love you", "island", "i love leetcode"]],
        description: 'Basic autocomplete with "i"',
      },
      {
        input: {
          sentences: ["i love you", "island", "i love leetcode"],
          times: [5, 3, 2],
          inputs: ["i", " "],
        },
        expected: [
          ["i love you", "island", "i love leetcode"],
          ["i love you", "i love leetcode"],
        ],
        description: "Autocomplete narrowing with space",
      },
      {
        input: { sentences: ["abc", "abcd", "abce"], times: [3, 3, 3], inputs: ["a", "b", "c"] },
        expected: [
          ["abc", "abcd", "abce"],
          ["abc", "abcd", "abce"],
          ["abc", "abcd", "abce"],
        ],
        description: "Same frequency - ASCII order",
      },
    ],
  },
  {
    id: "dsa-word-break-trie",
    title: "Word Break",
    type: "dsa",
    pattern: "trie",
    difficulty: "medium",
    companies: ["Google", "Amazon", "Meta", "Apple", "Microsoft"],
    description: "Determine if a string can be segmented into dictionary words",
    tags: ["trie", "dynamic-programming", "string", "memoization"],
    estimatedTime: 25,
    problemStatement: `Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.

Note that the same word in the dictionary may be reused multiple times in the segmentation.`,
    examples: [
      {
        input: 's = "leetcode", wordDict = ["leet","code"]',
        output: "true",
        explanation: 'Return true because "leetcode" can be segmented as "leet code".',
      },
      {
        input: 's = "applepenapple", wordDict = ["apple","pen"]',
        output: "true",
        explanation:
          'Return true because "applepenapple" can be segmented as "apple pen apple". Note that you are allowed to reuse a dictionary word.',
      },
      {
        input: 's = "catsandog", wordDict = ["cats","dog","sand","and","cat"]',
        output: "false",
      },
    ],
    constraints: [
      "1 <= s.length <= 300",
      "1 <= wordDict.length <= 1000",
      "1 <= wordDict[i].length <= 20",
      "s and wordDict[i] consist of only lowercase English letters.",
      "All the strings of wordDict are unique.",
    ],
    hints: [
      "Build a Trie from wordDict for O(1) prefix checking",
      "Use DP: dp[i] = true if s[0:i] can be segmented",
      "For each position, check all possible word endings using trie",
      "Alternative: BFS/DFS with memoization",
    ],
    starterCode: {
      javascript: `function wordBreak(s, wordDict) {
  // Use trie + DP to check if string can be segmented
}`,
      typescript: `function wordBreak(s: string, wordDict: string[]): boolean {
  // Use trie + DP to check if string can be segmented
}`,
      python: `def wordBreak(s: str, wordDict: list[str]) -> bool:
    # Use trie + DP to check if string can be segmented
    pass`,
      java: `class Solution {
    public boolean wordBreak(String s, List<String> wordDict) {
        // Use trie + DP to check if string can be segmented
        return false;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n^2) with DP or O(n * m) with Trie where m is max word length",
      space: "O(n) for DP array",
    },
    testCases: [
      {
        input: { s: "leetcode", wordDict: ["leet", "code"] },
        expected: true,
        description: "Basic case - two word segmentation",
      },
      {
        input: { s: "applepenapple", wordDict: ["apple", "pen"] },
        expected: true,
        description: "Word reuse allowed",
      },
      {
        input: { s: "catsandog", wordDict: ["cats", "dog", "sand", "and", "cat"] },
        expected: false,
        description: "Cannot segment completely",
      },
      {
        input: { s: "a", wordDict: ["a"] },
        expected: true,
        description: "Single character",
      },
      {
        input: { s: "aaaaaaa", wordDict: ["aaaa", "aaa"] },
        expected: true,
        description: "Multiple valid segmentations (aaa+aaaa or aaaa+aaa)",
      },
    ],
  },
  {
    id: "dsa-replace-words",
    title: "Replace Words",
    type: "dsa",
    pattern: "trie",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta"],
    description: "Replace words in a sentence with their shortest root from a dictionary",
    tags: ["trie", "string", "array", "hash-table"],
    estimatedTime: 25,
    problemStatement: `In English, we have a concept called root, which can be followed by some other word to form another longer word - let's call this word successor. For example, when the root "an" is followed by the successor word "other", we can form a new word "another".

Given a dictionary consisting of many roots and a sentence consisting of words separated by spaces, replace all the successors in the sentence with the root forming it. If a successor can be replaced by more than one root, replace it with the root that has the shortest length.

Return the sentence after the replacement.`,
    examples: [
      {
        input:
          'dictionary = ["cat","bat","rat"], sentence = "the cattle was rattled by the battery"',
        output: '"the cat was rat by the bat"',
        explanation: '"cattle" -> "cat", "rattled" -> "rat", "battery" -> "bat"',
      },
      {
        input: 'dictionary = ["a","b","c"], sentence = "aadsfasf absbs bbab cadsfabd"',
        output: '"a]a b c"',
        explanation: "Each word is replaced by its shortest root.",
      },
    ],
    constraints: [
      "1 <= dictionary.length <= 1000",
      "1 <= dictionary[i].length <= 100",
      "dictionary[i] consists of only lower-case letters.",
      "1 <= sentence.length <= 10^6",
      "sentence consists of only lower-case letters and spaces.",
      "The number of words in sentence is in the range [1, 1000]",
      "The length of each word in sentence is in the range [1, 1000]",
      "Every two consecutive words in sentence will be separated by exactly one space.",
      "sentence does not have leading or trailing spaces.",
    ],
    hints: [
      "Build a Trie from the dictionary roots",
      "For each word in sentence, search trie for shortest matching root",
      "If a root is found, use it; otherwise keep original word",
      "Mark end-of-word nodes to identify valid roots",
    ],
    starterCode: {
      javascript: `function replaceWords(dictionary, sentence) {
  // Build trie from dictionary and replace words
}`,
      typescript: `function replaceWords(dictionary: string[], sentence: string): string {
  // Build trie from dictionary and replace words
}`,
      python: `def replaceWords(dictionary: list[str], sentence: str) -> str:
    # Build trie from dictionary and replace words
    pass`,
      java: `class Solution {
    public String replaceWords(List<String> dictionary, String sentence) {
        // Build trie from dictionary and replace words
        return "";
    }
}`,
    },
    optimalComplexity: {
      time: "O(d + s) where d is dictionary size, s is sentence length",
      space: "O(d) for trie",
    },
    testCases: [
      {
        input: {
          dictionary: ["cat", "bat", "rat"],
          sentence: "the cattle was rattled by the battery",
        },
        expected: "the cat was rat by the bat",
        description: "Standard replacement case",
      },
      {
        input: { dictionary: ["a", "b", "c"], sentence: "aadsfasf absbs bbab cadsfabd" },
        expected: "a a b c",
        description: "Single character roots",
      },
      {
        input: { dictionary: ["cat", "cater"], sentence: "category" },
        expected: "cat",
        description: "Multiple roots - use shortest",
      },
      {
        input: { dictionary: ["xyz"], sentence: "the quick brown fox" },
        expected: "the quick brown fox",
        description: "No matching roots - keep original",
      },
    ],
  },
  // ==================== NEW HIGH-VALUE ADDITIONS ====================
  {
    id: "dsa-add-search-word",
    title: "Design Add and Search Words Data Structure",
    type: "dsa",
    pattern: "trie",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Design a data structure that supports adding words and searching with wildcards",
    tags: ["trie", "design", "string", "dfs"],
    estimatedTime: 30,
    problemStatement: `Design a data structure that supports adding new words and finding if a string matches any previously added string.

Implement the WordDictionary class:
- WordDictionary() Initializes the object.
- void addWord(word) Adds word to the data structure, it can be matched later.
- bool search(word) Returns true if there is any string in the data structure that matches word or false otherwise. word may contain dots '.' where dots can be matched with any letter.`,
    examples: [
      {
        input:
          '["WordDictionary","addWord","addWord","addWord","search","search","search","search"]\n[[],["bad"],["dad"],["mad"],["pad"],["bad"],[".ad"],["b.."]]',
        output: "[null,null,null,null,false,true,true,true]",
        explanation:
          'addWord adds words, search("pad") returns false (not added), search(".ad") matches "bad","dad","mad"',
      },
    ],
    constraints: [
      "1 <= word.length <= 25",
      "word in addWord consists of lowercase English letters.",
      'word in search consists of "." or lowercase English letters.',
      "At most 10^4 calls to addWord and search.",
    ],
    hints: [
      "Use Trie for efficient prefix matching",
      'For search with ".", use DFS to try all children at that position',
      "Mark end of word in trie nodes",
      "Optimize by pruning invalid paths early",
    ],
    starterCode: {
      javascript: `class WordDictionary {\n  constructor() {\n    // Initialize\n  }\n\n  addWord(word) {\n    // Add word to trie\n  }\n\n  search(word) {\n    // Search with wildcard support\n  }\n}`,
      typescript: `class WordDictionary {\n  constructor() {\n    // Initialize\n  }\n\n  addWord(word: string): void {\n    // Add word to trie\n  }\n\n  search(word: string): boolean {\n    // Search with wildcard support\n  }\n}`,
      python: `class WordDictionary:\n    def __init__(self):\n        pass\n\n    def addWord(self, word: str) -> None:\n        pass\n\n    def search(self, word: str) -> bool:\n        pass`,
    },
    optimalComplexity: {
      time: "O(m) addWord, O(26^m) worst search with all dots",
      space: "O(total chars)",
    },
    testCases: [
      {
        input: { operations: ["addWord", "search"], args: [["bad"], ["bad"]] },
        expected: [null, true],
        description: "Exact match",
      },
      {
        input: { operations: ["addWord", "search"], args: [["bad"], [".ad"]] },
        expected: [null, true],
        description: "Wildcard prefix",
      },
      {
        input: { operations: ["addWord", "search"], args: [["bad"], ["b.."]] },
        expected: [null, true],
        description: "Multiple wildcards",
      },
      {
        input: { operations: ["search"], args: [["any"]] },
        expected: [false],
        description: "Empty dictionary",
      },
    ],
  },
]
