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
    companies: ["Google", "Amazon", "Meta", "Microsoft", "Palantir"],
    roles: ["new-grad", "junior", "senior", "swe"],
    description:
      "Design and implement a trie data structure with insert, search, and startsWith operations",
    tags: ["trie", "design", "string", "hash-table"],
    estimatedTime: 25,
    problemStatement: `You're building the Trie class, the prefix tree behind features like autocomplete and spell checking. It collects strings and answers two kinds of membership questions about everything collected so far.

- Trie() constructs an empty structure.
- insert(word) records word.
- search(word) returns true only when word itself was inserted earlier; a string that merely opens some longer inserted word does not count as present.
- startsWith(prefix) returns true when at least one inserted word begins with prefix, and a word always counts as a prefix of itself.`,
    examples: [
      {
        input:
          '["Trie", "insert", "search", "search", "startsWith", "insert", "search"]\n[[], ["planet"], ["planet"], ["plan"], ["plan"], ["plan"], ["plan"]]',
        output: "[null, null, true, false, true, null, true]",
        explanation:
          'insert("planet") stores the word. search("planet") finds it, while search("plan") stays false because "plan" is only the front of a stored word. startsWith("plan") is true thanks to "planet". Once insert("plan") runs, search("plan") flips to true.',
      },
    ],
    constraints: [
      "Both word and prefix run from 1 to 2000 characters.",
      "Only lowercase English letters appear in word and prefix.",
      "insert, search, and startsWith together are called at most 3 * 10^4 times.",
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
        input: { operations: ["Trie", "insert", "search"], args: [[], ["apple"], ["apple"]] },
        expected: [null, null, true],
        description: "Basic insert and search",
      },
      {
        input: { operations: ["Trie", "insert", "search"], args: [[], ["apple"], ["app"]] },
        expected: [null, null, false],
        description: "Search for prefix that is not a complete word",
      },
      {
        input: { operations: ["Trie", "insert", "startsWith"], args: [[], ["apple"], ["app"]] },
        expected: [null, null, true],
        description: "startsWith for valid prefix",
      },
      {
        input: {
          operations: ["Trie", "insert", "insert", "search"],
          args: [[], ["apple"], ["app"], ["app"]],
        },
        expected: [null, null, null, true],
        description: "Insert prefix as word, then search",
      },
      {
        input: { operations: ["Trie", "search"], args: [[], ["a"]] },
        expected: [null, false],
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
    problemStatement: `You're handed board, an m x n grid of lowercase letters, and words, a list of dictionary entries. Return every entry that can be spelled by tracing a path through the grid.

A path begins on any cell and extends one step at a time to a cell directly above, below, left, or right of the current one. Diagonal moves are not allowed, and a single path may never revisit a cell it has already used. List each spellable entry once, no matter how many distinct paths produce it.`,
    examples: [
      {
        input:
          'board = [["c","o","r","n"],["d","e","l","t"],["h","m","a","x"],["y","u","s","k"]], words = ["corn","melt","mash","vast"]',
        output: '["corn","melt"]',
        explanation:
          '"corn" runs across the top row, and "melt" climbs from the m up to e then right along l and t. "mash" dead-ends before reaching an h, and the board holds no v for "vast".',
      },
      {
        input: 'board = [["p","q"],["s","r"]], words = ["pqrq"]',
        output: "[]",
        explanation: 'Spelling "pqrq" would require stepping on the lone "q" cell twice.',
      },
    ],
    constraints: [
      "m equals board.length, the number of rows.",
      "n equals board[i].length, the number of columns.",
      "Grid dimensions satisfy 1 <= m, n <= 12.",
      "Every cell board[i][j] stores a lowercase English letter.",
      "The word list size obeys 1 <= words.length <= 3 * 10^4.",
      "Each entry's length obeys 1 <= words[i].length <= 10.",
      "Entries in words consist of lowercase English letters.",
      "No entry appears twice in words.",
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
        compareAsSet: true,
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
    description:
      "Design a search autocomplete system that surfaces the three most-typed sentences for a prefix",
    tags: ["trie", "design", "string", "heap", "sorting"],
    estimatedTime: 45,
    problemStatement: `You're building the ranking engine behind a search box, exposed as the AutocompleteSystem class. It is constructed from two parallel arrays of length n: sentences, holding queries users typed in the past, and times, where times[i] records how many times sentences[i] was typed. After construction, a user types one character at a time through input(c), and every sentence they type finishes with the special character '#'.

For any character except '#', input(c) returns up to 3 suggestions: the historical sentences that begin with everything typed so far in the current sentence. A sentence's heat is the number of times it has been typed in full before. Order suggestions by heat, highest first, and settle equal heat by ASCII order, smaller string first. When fewer than 3 sentences match the prefix, return all of the matches.

When c is '#', the sentence in progress is complete. Record it into the history (its typed count grows by one), reset the working prefix, and return an empty list.`,
    examples: [
      {
        input:
          'AutocompleteSystem(["hot pot", "horizon", "hazmat", "hey there"], [7, 4, 3, 2])\ninput("h")\ninput("o")\ninput("b")\ninput("#")',
        output: '[["hot pot", "horizon", "hazmat"], ["hot pot", "horizon"], [], []]',
        explanation:
          'Typing "h" matches all four sentences, so the three most-typed come back. "ho" narrows the field to two. "hob" matches nothing, and "#" finishes the sentence, storing "hob" in the history.',
      },
    ],
    constraints: [
      "sentences and times share one length, n.",
      "n stays within 1 <= n <= 100.",
      "Sentence lengths obey 1 <= sentences[i].length <= 100.",
      "Prior counts satisfy 1 <= times[i] <= 50.",
      'Each character c is a lowercase English letter, a space " ", or the terminator "#".',
      'Sentences arrive one character at a time, and every one of them closes with "#".',
      "input receives at most 5000 calls.",
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
    // Class-invocation shape: operations[0] is the constructor and takes (sentences, times);
    // each later entry is one input(c) call. These cases used to pass sentences/times/inputs as
    // three separate keys, which the wrapper does not recognise as class-based, so it looked
    // for a free function that this class-only starter does not have and a correct
    // AutocompleteSystem scored 0/3.
    testCases: [
      {
        input: {
          operations: ["AutocompleteSystem", "input"],
          values: [
            [
              ["i love you", "island", "i love leetcode"],
              [5, 3, 2],
            ],
            ["i"],
          ],
        },
        expected: [null, ["i love you", "island", "i love leetcode"]],
        description: 'Basic autocomplete with "i"',
      },
      {
        input: {
          operations: ["AutocompleteSystem", "input", "input"],
          values: [
            [
              ["i love you", "island", "i love leetcode"],
              [5, 3, 2],
            ],
            ["i"],
            [" "],
          ],
        },
        expected: [
          null,
          ["i love you", "island", "i love leetcode"],
          ["i love you", "i love leetcode"],
        ],
        description: "Autocomplete narrowing with space",
      },
      {
        input: {
          operations: ["AutocompleteSystem", "input", "input", "input"],
          values: [
            [
              ["abc", "abcd", "abce"],
              [3, 3, 3],
            ],
            ["a"],
            ["b"],
            ["c"],
          ],
        },
        expected: [null, ["abc", "abcd", "abce"], ["abc", "abcd", "abce"], ["abc", "abcd", "abce"]],
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
    description: "Decide whether a string can be split entirely into dictionary words",
    tags: ["trie", "dynamic-programming", "string", "memoization"],
    estimatedTime: 25,
    problemStatement: `You're given a string s and a word list wordDict. Determine whether s can be carved into consecutive pieces so that every piece is a wordDict entry and the pieces, joined back together, spell s exactly with no characters left over. Report true when some such split exists and false when none does.

Reuse is unrestricted: one wordDict entry may appear in the split any number of times.`,
    examples: [
      {
        input: 's = "playground", wordDict = ["play","ground"]',
        output: "true",
        explanation: '"playground" splits cleanly as "play ground".',
      },
      {
        input: 's = "codebugcode", wordDict = ["code","bug"]',
        output: "true",
        explanation: '"codebugcode" splits as "code bug code", using "code" twice.',
      },
      {
        input: 's = "rainbowl", wordDict = ["rain","bow","owl","in"]',
        output: "false",
      },
    ],
    constraints: [
      "s runs between 1 and 300 characters.",
      "wordDict holds from 1 to 1000 words.",
      "Each dictionary word spans 1 to 20 characters.",
      "Lowercase English letters make up s and every wordDict entry.",
      "wordDict never lists the same word twice.",
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
    problemStatement: `You're given dictionary, an array of roots, and sentence, a string of words separated by spaces. A root builds longer words by taking on a suffix: the root "plant" can grow into "plantation". Walk through sentence word by word and shrink wherever possible: when a word starts with at least one of the roots, swap the word for the shortest root matching its opening letters. A word that no root can claim stays as it is.

Return the rebuilt sentence, words in their original order.`,
    examples: [
      {
        input:
          'dictionary = ["farm","toy","grow"], sentence = "the farmer was growing toys near the farmland"',
        output: '"the farm was grow toy near the farm"',
        explanation:
          '"farmer" and "farmland" shrink to "farm", "growing" to "grow", "toys" to "toy".',
      },
      {
        input: 'dictionary = ["d","e","f"], sentence = "dishes eggs forks spoons"',
        output: '"d e f spoons"',
        explanation:
          'Three words open with a single-letter root and collapse to it; "spoons" matches no root and survives intact.',
      },
    ],
    constraints: [
      "dictionary carries between 1 and 1000 roots.",
      "Each root's length falls between 1 and 100.",
      "Roots are built from lower-case letters only.",
      "sentence has length 1 to 10^6.",
      "Only lower-case letters and spaces appear in sentence.",
      "sentence contains between 1 and 1000 words.",
      "Each sentence word runs from 1 to 1000 characters.",
      "Neighboring words are separated by exactly one space.",
      "No leading or trailing spaces surround sentence.",
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
    problemStatement: `You're assembling WordDictionary, a class that accumulates words and then answers pattern lookups over everything accumulated so far.

- WordDictionary() creates the empty structure.
- addWord(word) stores word for future matching.
- search(word) reports whether any stored word matches the query. A query may contain the character '.', and each '.' stands in for exactly one letter of any kind. All other characters must match literally, which also means a matching word always has the same length as the query.`,
    examples: [
      {
        input:
          '["WordDictionary","addWord","addWord","addWord","search","search","search","search"]\n[[],["sun"],["run"],["fun"],["gun"],["run"],[".un"],["s.."]]',
        output: "[null,null,null,null,false,true,true,true]",
        explanation:
          'search("gun") fails because "gun" was never added. search("run") hits an exact match, ".un" matches every stored word, and "s.." pins the first letter while wildcarding the other two.',
      },
    ],
    constraints: [
      "Word lengths satisfy 1 <= word.length <= 25.",
      "Arguments to addWord contain lowercase English letters only.",
      'Arguments to search mix lowercase English letters with the wildcard ".".',
      "addWord and search together receive at most 10^4 calls.",
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
        input: {
          operations: ["WordDictionary", "addWord", "search"],
          args: [[], ["bad"], ["bad"]],
        },
        expected: [null, null, true],
        description: "Exact match",
      },
      {
        input: {
          operations: ["WordDictionary", "addWord", "search"],
          args: [[], ["bad"], [".ad"]],
        },
        expected: [null, null, true],
        description: "Wildcard prefix",
      },
      {
        input: {
          operations: ["WordDictionary", "addWord", "search"],
          args: [[], ["bad"], ["b.."]],
        },
        expected: [null, null, true],
        description: "Multiple wildcards",
      },
      {
        input: { operations: ["WordDictionary", "search"], args: [[], ["any"]] },
        expected: [null, false],
        description: "Empty dictionary",
      },
    ],
  },
]
