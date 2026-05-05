import type { DSAPatternKnowledge } from "../../types"

export const trieKnowledge: DSAPatternKnowledge = {
  pattern: "trie",
  displayName: "Trie (Prefix Tree)",
  description:
    "Tree-based data structure for efficient string operations. Perfect for prefix matching, autocomplete, and word dictionaries.",
  whenToUse: [
    "Autocomplete/prefix search",
    "Spell checking",
    "Word dictionary operations",
    "Finding words with common prefixes",
    "IP routing (longest prefix match)",
  ],
  keyInsights: [
    "Each node represents a character",
    "Path from root to node = prefix",
    "End-of-word flag marks complete words",
    "Trade space for time: O(m) search where m = word length",
  ],
  commonMistakes: [
    "Forgetting end-of-word markers",
    "Incorrect handling of empty strings",
    "Memory-intensive for sparse tries",
    "Not considering character set size",
  ],
  timeComplexity: {
    typical: "O(m) where m is word length",
    best: "O(1) for single character",
    worst: "O(m)",
  },
  spaceComplexity: {
    typical: "O(alphabet_size × total_characters)",
    notes: "Can be optimized with compression",
  },
  relatedPatterns: ["trees", "string"],
  prerequisites: ["trees"],
  codeTemplate: `class TrieNode:
  def __init__(self):
      self.children = {}
      self.is_end = False

class Trie:
  def __init__(self):
      self.root = TrieNode()

  def insert(self, word):
      node = self.root
      for char in word:
          if char not in node.children:
              node.children[char] = TrieNode()
          node = node.children[char]
      node.is_end = True`,
  examples: [
    "Implement Trie",
    "Word Search II",
    "Design Add and Search Words",
    "Longest Word in Dictionary",
  ],
  interviewTips: [
    "Consider hash map vs array for children",
    "Discuss memory optimization options",
    "Compare with hash set for simple cases",
  ],
}
