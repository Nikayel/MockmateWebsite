import type { AddFunctionalityScenario } from "../types"

export const autocompleteTrieScenario: AddFunctionalityScenario = {
  id: "add-feature-autocomplete-trie",
  title: "Add Ranking to Autocomplete System",
  type: "add-functionality",
  difficulty: "medium",
  companies: ["Google", "Amazon", "Meta", "Microsoft"],
  description:
    "Implement ranked autocomplete suggestions using a Trie data structure with frequency-based ranking",
  tags: ["trie", "data-structures", "algorithms", "search"],
  estimatedTime: 35,
  problemStatement: `You're building an autocomplete system for a search engine. The existing Trie supports basic prefix search, but users want suggestions ranked by popularity.

**Your task:**
1. Study the existing Trie implementation
2. Add frequency tracking when words are inserted/searched
3. Implement getSuggestions() to return top-K results ranked by frequency
4. Ensure the system handles ties by alphabetical order

**Context:** This autocomplete powers a search bar with millions of queries. Ranking quality directly impacts user experience.`,
  featureRequirements: [
    "insert(word) - insert word and track frequency",
    "search(word) - search and increment frequency if found",
    "getSuggestions(prefix, k) - return top K suggestions by frequency",
    "Handle ties by alphabetical order",
    "Efficient prefix traversal using the Trie structure",
  ],
  existingCode: {
    javascript: `// autocomplete.js - Trie-based autocomplete system
// TODO: Add frequency-based ranking to suggestions

class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
    this.frequency = 0; // Track how often this word is used
  }
}

class AutoComplete {
  constructor() {
    this.root = new TrieNode();
  }

  /**
   * Insert a word into the trie
   * Should also increment frequency if word already exists
   * @param {string} word - The word to insert
   */
  insert(word) {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEndOfWord = true;
    // TODO: Increment frequency
  }

  /**
   * Search for a word in the trie
   * If found, increment its frequency
   * @param {string} word - The word to search
   * @returns {boolean} True if word exists
   */
  search(word) {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      if (!node.children[char]) {
        return false;
      }
      node = node.children[char];
    }
    if (node.isEndOfWord) {
      // TODO: Increment frequency when word is searched
    }
    return node.isEndOfWord;
  }

  /**
   * Get autocomplete suggestions for a prefix
   * @param {string} prefix - The prefix to search for
   * @param {number} k - Maximum number of suggestions (default 5)
   * @returns {string[]} Array of suggestions sorted by frequency (desc), then alphabetically
   */
  getSuggestions(prefix, k = 5) {
    // TODO: Implement ranked suggestions
    // 1. Find the node for the prefix
    // 2. Collect all words with that prefix (use helper)
    // 3. Sort by frequency (descending), then alphabetically
    // 4. Return top k
    return [];
  }

  /**
   * Helper: Find node for a given prefix
   * @param {string} prefix
   * @returns {TrieNode|null}
   */
  _findPrefixNode(prefix) {
    let node = this.root;
    for (const char of prefix.toLowerCase()) {
      if (!node.children[char]) {
        return null;
      }
      node = node.children[char];
    }
    return node;
  }

  /**
   * Helper: Collect all words from a node
   * @param {TrieNode} node - Starting node
   * @param {string} prefix - Current prefix
   * @param {Array} results - Array to collect {word, frequency} pairs
   */
  _collectWords(node, prefix, results) {
    if (node.isEndOfWord) {
      results.push({ word: prefix, frequency: node.frequency });
    }
    for (const [char, childNode] of Object.entries(node.children)) {
      this._collectWords(childNode, prefix + char, results);
    }
  }
}

// Test helper function - DO NOT MODIFY
function testAutocomplete(operations) {
  const ac = new AutoComplete();
  const results = [];

  for (const op of operations) {
    switch (op.type) {
      case 'insert':
        ac.insert(op.word);
        results.push({ type: 'insert', word: op.word });
        break;
      case 'search':
        const found = ac.search(op.word);
        results.push({ type: 'search', word: op.word, found });
        break;
      case 'suggest':
        const suggestions = ac.getSuggestions(op.prefix, op.k || 5);
        results.push({ type: 'suggest', prefix: op.prefix, suggestions });
        break;
    }
  }

  return results;
}`,
    python: `# autocomplete.py - Trie-based autocomplete system
# TODO: Add frequency-based ranking to suggestions

class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end_of_word = False
        self.frequency = 0  # Track how often this word is used


class AutoComplete:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        """
        Insert a word into the trie
        Should also increment frequency if word already exists
        """
        node = self.root
        for char in word.lower():
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end_of_word = True
        # TODO: Increment frequency

    def search(self, word):
        """
        Search for a word in the trie
        If found, increment its frequency
        Returns: True if word exists
        """
        node = self.root
        for char in word.lower():
            if char not in node.children:
                return False
            node = node.children[char]
        if node.is_end_of_word:
            # TODO: Increment frequency when word is searched
            pass
        return node.is_end_of_word

    def get_suggestions(self, prefix, k=5):
        """
        Get autocomplete suggestions for a prefix
        Args:
            prefix: The prefix to search for
            k: Maximum number of suggestions (default 5)
        Returns: List of suggestions sorted by frequency (desc), then alphabetically
        """
        # TODO: Implement ranked suggestions
        # 1. Find the node for the prefix
        # 2. Collect all words with that prefix (use helper)
        # 3. Sort by frequency (descending), then alphabetically
        # 4. Return top k
        return []

    def _find_prefix_node(self, prefix):
        """Helper: Find node for a given prefix"""
        node = self.root
        for char in prefix.lower():
            if char not in node.children:
                return None
            node = node.children[char]
        return node

    def _collect_words(self, node, prefix, results):
        """Helper: Collect all words from a node"""
        if node.is_end_of_word:
            results.append({'word': prefix, 'frequency': node.frequency})
        for char, child_node in node.children.items():
            self._collect_words(child_node, prefix + char, results)


# Test helper function - DO NOT MODIFY
def test_autocomplete(operations):
    ac = AutoComplete()
    results = []

    for op in operations:
        if op['type'] == 'insert':
            ac.insert(op['word'])
            results.append({'type': 'insert', 'word': op['word']})
        elif op['type'] == 'search':
            found = ac.search(op['word'])
            results.append({'type': 'search', 'word': op['word'], 'found': found})
        elif op['type'] == 'suggest':
            suggestions = ac.get_suggestions(op['prefix'], op.get('k', 5))
            results.append({'type': 'suggest', 'prefix': op['prefix'], 'suggestions': suggestions})

    return results`,
  },
  codebaseFiles: {
    javascript: [
      {
        fileName: "utils/stringUtils.js",
        content: `// String utilities for autocomplete
// Use these helpers in your implementation

/**
 * Compare two strings alphabetically
 * @returns negative if a < b, positive if a > b, 0 if equal
 */
function compareAlphabetically(a, b) {
  return a.localeCompare(b);
}

/**
 * Sort array by frequency (desc) then alphabetically
 * @param {Array} items - Array of {word, frequency} objects
 * @returns {Array} Sorted array
 */
function sortByFrequencyThenAlpha(items) {
  return items.sort((a, b) => {
    if (b.frequency !== a.frequency) {
      return b.frequency - a.frequency; // Higher frequency first
    }
    return compareAlphabetically(a.word, b.word); // Then alphabetically
  });
}

module.exports = { compareAlphabetically, sortByFrequencyThenAlpha };`,
        description: "String utilities - use sortByFrequencyThenAlpha for ranking suggestions",
      },
      {
        fileName: "data/sampleQueries.js",
        content: `// Sample queries showing expected behavior
// Use this to understand the ranking logic

const sampleData = {
  // Words with their search frequencies
  insertions: [
    { word: 'apple', searchCount: 100 },
    { word: 'application', searchCount: 50 },
    { word: 'apply', searchCount: 75 },
    { word: 'banana', searchCount: 30 },
    { word: 'app', searchCount: 200 },
  ],

  // Expected suggestions for "app" prefix
  expectedSuggestions: {
    prefix: 'app',
    k: 3,
    // Ranked by frequency: app (200) > apple (100) > apply (75) > application (50)
    expected: ['app', 'apple', 'apply']
  },

  // Tie-breaking example
  tieBreaking: {
    // If 'bat' and 'bar' both have frequency 10
    // 'bar' comes first alphabetically
    expected: ['bar', 'bat']
  }
};

module.exports = sampleData;`,
        description: "Sample data showing expected ranking behavior",
      },
    ],
    python: [
      {
        fileName: "utils/string_utils.py",
        content: `# String utilities for autocomplete
# Use these helpers in your implementation

def compare_alphabetically(a, b):
    """Compare two strings alphabetically"""
    if a < b:
        return -1
    elif a > b:
        return 1
    return 0


def sort_by_frequency_then_alpha(items):
    """
    Sort array by frequency (desc) then alphabetically
    Args:
        items: List of {'word': str, 'frequency': int} dicts
    Returns: Sorted list
    """
    return sorted(items, key=lambda x: (-x['frequency'], x['word']))`,
        description: "String utilities - use sort_by_frequency_then_alpha for ranking",
      },
    ],
  },
  hints: [
    "Increment frequency in insert() when node.isEndOfWord is already true",
    "Also increment frequency in search() when the word is found",
    "Use _findPrefixNode() to navigate to the prefix, then _collectWords()",
    "Sort collected words using the utility function, then slice top k",
    "Remember to handle the case where prefix doesn't exist (return empty array)",
  ],
  testCases: [
    {
      input: {
        operations: [
          { type: "insert", word: "apple" },
          { type: "insert", word: "app" },
          { type: "insert", word: "application" },
          { type: "suggest", prefix: "app", k: 3 },
        ],
      },
      expected: [
        { type: "insert", word: "apple" },
        { type: "insert", word: "app" },
        { type: "insert", word: "application" },
        { type: "suggest", prefix: "app", suggestions: ["app", "apple", "application"] },
      ],
      description: "Basic suggestions sorted alphabetically (same frequency)",
    },
    {
      input: {
        operations: [
          { type: "insert", word: "car" },
          { type: "insert", word: "car" },
          { type: "insert", word: "car" },
          { type: "insert", word: "cat" },
          { type: "suggest", prefix: "ca", k: 2 },
        ],
      },
      expected: [
        { type: "insert", word: "car" },
        { type: "insert", word: "car" },
        { type: "insert", word: "car" },
        { type: "insert", word: "cat" },
        { type: "suggest", prefix: "ca", suggestions: ["car", "cat"] },
      ],
      description: "Frequency ranking - car (freq 3) before cat (freq 1)",
    },
    {
      input: {
        operations: [
          { type: "insert", word: "test" },
          { type: "search", word: "test" },
          { type: "search", word: "test" },
          { type: "insert", word: "testing" },
          { type: "suggest", prefix: "test", k: 2 },
        ],
      },
      expected: [
        { type: "insert", word: "test" },
        { type: "search", word: "test", found: true },
        { type: "search", word: "test", found: true },
        { type: "insert", word: "testing" },
        { type: "suggest", prefix: "test", suggestions: ["test", "testing"] },
      ],
      description: "Search increments frequency - test (3) before testing (1)",
    },
  ],
  acceptanceCriteria: [
    "Insert increments frequency for existing words",
    "Search increments frequency for found words",
    "Suggestions are ranked by frequency (descending)",
    "Ties are broken alphabetically",
    "Returns at most k suggestions",
  ],
}
