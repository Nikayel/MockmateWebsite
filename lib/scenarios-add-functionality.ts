/**
 * Add Functionality Scenarios
 *
 * These scenarios simulate real Meta/Google AI-assisted interviews
 * where candidates must add new features to an existing codebase.
 *
 * Key aspects:
 * - Real codebase with multiple files
 * - Clear feature requirements
 * - Existing tests to understand expected behavior
 * - Focus on code integration, not greenfield development
 *
 * NOTE: All scenarios use pure JavaScript/Python for sandbox testability.
 */

import type { BaseScenario } from "./scenarios"

export interface AddFunctionalityScenario extends BaseScenario {
  type: "add-functionality"
  problemStatement: string
  featureRequirements: string[]
  existingCode: {
    [language: string]: string
  }
  codebaseFiles: {
    [language: string]: {
      fileName: string
      content: string
      description: string
    }[]
  }
  hints: string[]
  testCases: {
    input: any
    expected: any
    description: string
    compareAsSet?: boolean
  }[]
  acceptanceCriteria: string[]
}

// =============================================================================
// ADD FUNCTIONALITY SCENARIOS - Real-world feature implementation
// =============================================================================

export const addFunctionalityScenarios: AddFunctionalityScenario[] = [
  // ============================================================================
  // SCENARIO 1: Trie-based Autocomplete with Ranking
  // ============================================================================
  {
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
  },

  // ============================================================================
  // SCENARIO 2: State Management with Undo/Redo History
  // ============================================================================
  {
    id: "add-feature-state-history",
    title: "Add Undo/Redo to State Manager",
    type: "add-functionality",
    difficulty: "hard",
    companies: ["Google", "Meta", "Notion", "Figma", "Microsoft"],
    description:
      "Implement undo/redo functionality for a state management system using the Command pattern",
    tags: ["design-patterns", "state-management", "command-pattern"],
    estimatedTime: 40,
    problemStatement: `You're building a state management library (like Redux). Users want undo/redo capability for their application state.

**Your task:**
1. Study the existing StateManager class
2. Implement undo/redo using a history stack approach
3. Handle max history size (prevent memory leaks)
4. Ensure redo stack is cleared on new state changes

**Context:** This state manager is used in a collaborative design tool. Undo/redo is critical for user experience.`,
    featureRequirements: [
      "setState(newState) - update state and add to history",
      "undo() - revert to previous state",
      "redo() - re-apply undone state",
      "canUndo() / canRedo() - check if operations are possible",
      "Max history size of 50 states",
      "Clear redo stack when new state is set",
    ],
    existingCode: {
      javascript: `// stateManager.js - State management with history
// TODO: Implement undo/redo functionality

class StateManager {
  constructor(initialState = {}, maxHistory = 50) {
    this.currentState = initialState;
    this.maxHistory = maxHistory;

    // TODO: Add history stacks
    this.undoStack = [];
    this.redoStack = [];

    this.listeners = [];
  }

  /**
   * Get the current state
   * @returns {Object} Current state
   */
  getState() {
    return this.currentState;
  }

  /**
   * Set new state
   * Should save current state to undo stack before updating
   * Should clear redo stack
   * @param {Object} newState - The new state
   */
  setState(newState) {
    // TODO: Save current state to undo stack
    // TODO: Clear redo stack (new change invalidates redo history)
    // TODO: Enforce maxHistory limit

    this.currentState = { ...this.currentState, ...newState };
    this._notifyListeners();
  }

  /**
   * Undo the last state change
   * @returns {boolean} True if undo was successful
   */
  undo() {
    // TODO: Implement undo
    // 1. Check if undo is possible
    // 2. Save current state to redo stack
    // 3. Pop from undo stack and set as current
    // 4. Notify listeners
    return false;
  }

  /**
   * Redo the last undone change
   * @returns {boolean} True if redo was successful
   */
  redo() {
    // TODO: Implement redo
    // 1. Check if redo is possible
    // 2. Save current state to undo stack
    // 3. Pop from redo stack and set as current
    // 4. Notify listeners
    return false;
  }

  /**
   * Check if undo is possible
   * @returns {boolean}
   */
  canUndo() {
    // TODO: Return true if undoStack has items
    return false;
  }

  /**
   * Check if redo is possible
   * @returns {boolean}
   */
  canRedo() {
    // TODO: Return true if redoStack has items
    return false;
  }

  /**
   * Get history info for debugging
   * @returns {Object} { undoCount, redoCount }
   */
  getHistoryInfo() {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
    };
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  _notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.currentState);
    }
  }
}

// Test helper function - DO NOT MODIFY
function testStateHistory(operations) {
  const sm = new StateManager({ count: 0 }, 50);
  const results = [];

  for (const op of operations) {
    switch (op.type) {
      case 'set':
        sm.setState(op.state);
        results.push({ type: 'set', state: sm.getState() });
        break;
      case 'undo':
        const undoResult = sm.undo();
        results.push({ type: 'undo', success: undoResult, state: sm.getState() });
        break;
      case 'redo':
        const redoResult = sm.redo();
        results.push({ type: 'redo', success: redoResult, state: sm.getState() });
        break;
      case 'canUndo':
        results.push({ type: 'canUndo', result: sm.canUndo() });
        break;
      case 'canRedo':
        results.push({ type: 'canRedo', result: sm.canRedo() });
        break;
      case 'history':
        results.push({ type: 'history', ...sm.getHistoryInfo() });
        break;
    }
  }

  return results;
}`,
      python: `# state_manager.py - State management with history
# TODO: Implement undo/redo functionality

class StateManager:
    def __init__(self, initial_state=None, max_history=50):
        self.current_state = initial_state or {}
        self.max_history = max_history

        # TODO: Add history stacks
        self.undo_stack = []
        self.redo_stack = []

        self.listeners = []

    def get_state(self):
        """Get the current state"""
        return self.current_state.copy()

    def set_state(self, new_state):
        """
        Set new state
        Should save current state to undo stack before updating
        Should clear redo stack
        """
        # TODO: Save current state to undo stack
        # TODO: Clear redo stack (new change invalidates redo history)
        # TODO: Enforce max_history limit

        self.current_state = {**self.current_state, **new_state}
        self._notify_listeners()

    def undo(self):
        """
        Undo the last state change
        Returns: True if undo was successful
        """
        # TODO: Implement undo
        # 1. Check if undo is possible
        # 2. Save current state to redo stack
        # 3. Pop from undo stack and set as current
        # 4. Notify listeners
        return False

    def redo(self):
        """
        Redo the last undone change
        Returns: True if redo was successful
        """
        # TODO: Implement redo
        # 1. Check if redo is possible
        # 2. Save current state to undo stack
        # 3. Pop from redo stack and set as current
        # 4. Notify listeners
        return False

    def can_undo(self):
        """Check if undo is possible"""
        # TODO: Return True if undo_stack has items
        return False

    def can_redo(self):
        """Check if redo is possible"""
        # TODO: Return True if redo_stack has items
        return False

    def get_history_info(self):
        """Get history info for debugging"""
        return {
            'undo_count': len(self.undo_stack),
            'redo_count': len(self.redo_stack),
        }

    def subscribe(self, listener):
        """Subscribe to state changes"""
        self.listeners.append(listener)
        def unsubscribe():
            self.listeners.remove(listener)
        return unsubscribe

    def _notify_listeners(self):
        for listener in self.listeners:
            listener(self.current_state)


# Test helper function - DO NOT MODIFY
def test_state_history(operations):
    sm = StateManager({'count': 0}, 50)
    results = []

    for op in operations:
        if op['type'] == 'set':
            sm.set_state(op['state'])
            results.append({'type': 'set', 'state': sm.get_state()})
        elif op['type'] == 'undo':
            undo_result = sm.undo()
            results.append({'type': 'undo', 'success': undo_result, 'state': sm.get_state()})
        elif op['type'] == 'redo':
            redo_result = sm.redo()
            results.append({'type': 'redo', 'success': redo_result, 'state': sm.get_state()})
        elif op['type'] == 'canUndo':
            results.append({'type': 'canUndo', 'result': sm.can_undo()})
        elif op['type'] == 'canRedo':
            results.append({'type': 'canRedo', 'result': sm.can_redo()})
        elif op['type'] == 'history':
            info = sm.get_history_info()
            results.append({'type': 'history', 'undoCount': info['undo_count'], 'redoCount': info['redo_count']})

    return results`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: "utils/deepCopy.js",
          content: `// Deep copy utility for state management
// Use this to avoid mutation issues

/**
 * Create a deep copy of an object
 * @param {Object} obj - Object to copy
 * @returns {Object} Deep copy
 */
function deepCopy(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepCopy(item));
  }

  const copy = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      copy[key] = deepCopy(obj[key]);
    }
  }
  return copy;
}

module.exports = { deepCopy };`,
          description: "Deep copy utility - use this when saving state to history stacks",
        },
        {
          fileName: "docs/historyPattern.md",
          content: `# Undo/Redo Implementation Pattern

## History Stack Approach

The history stack approach is simpler than the Command pattern for state-based systems:

### Data Structures
- \`undoStack\`: Array of previous states (most recent last)
- \`redoStack\`: Array of undone states (most recent last)
- \`currentState\`: The active state

### Operations

#### setState(newState)
1. Push copy of currentState to undoStack
2. Clear redoStack (new action invalidates redo history)
3. Update currentState
4. Enforce maxHistory (remove oldest if over limit)

#### undo()
1. If undoStack is empty, return false
2. Push copy of currentState to redoStack
3. Pop from undoStack, set as currentState
4. Return true

#### redo()
1. If redoStack is empty, return false
2. Push copy of currentState to undoStack
3. Pop from redoStack, set as currentState
4. Return true

### Memory Management
Always enforce maxHistory to prevent memory leaks.
When undoStack.length >= maxHistory, remove the oldest entry (shift).`,
          description: "Documentation explaining the history stack pattern for undo/redo",
        },
      ],
      python: [
        {
          fileName: "utils/deep_copy.py",
          content: `# Deep copy utility for state management
# Use this to avoid mutation issues

import copy

def deep_copy(obj):
    """
    Create a deep copy of an object
    Args:
        obj: Object to copy
    Returns: Deep copy
    """
    return copy.deepcopy(obj)`,
          description: "Deep copy utility - use this when saving state to history stacks",
        },
      ],
    },
    hints: [
      "Always deep copy state before pushing to stacks to avoid mutation",
      "In setState(), save current state BEFORE updating it",
      "Remember to clear redoStack in setState() - new changes invalidate redo",
      "Check if stacks are non-empty before popping in undo/redo",
      "For maxHistory, use shift() or pop(0) to remove oldest entries",
    ],
    testCases: [
      {
        input: {
          operations: [
            { type: "set", state: { count: 1 } },
            { type: "set", state: { count: 2 } },
            { type: "undo" },
          ],
        },
        expected: [
          { type: "set", state: { count: 1 } },
          { type: "set", state: { count: 2 } },
          { type: "undo", success: true, state: { count: 1 } },
        ],
        description: "Basic undo restores previous state",
      },
      {
        input: {
          operations: [{ type: "set", state: { count: 1 } }, { type: "undo" }, { type: "redo" }],
        },
        expected: [
          { type: "set", state: { count: 1 } },
          { type: "undo", success: true, state: { count: 0 } },
          { type: "redo", success: true, state: { count: 1 } },
        ],
        description: "Redo restores undone state",
      },
      {
        input: {
          operations: [
            { type: "set", state: { count: 1 } },
            { type: "undo" },
            { type: "set", state: { count: 5 } },
            { type: "canRedo" },
          ],
        },
        expected: [
          { type: "set", state: { count: 1 } },
          { type: "undo", success: true, state: { count: 0 } },
          { type: "set", state: { count: 5 } },
          { type: "canRedo", result: false },
        ],
        description: "New setState clears redo stack",
      },
      {
        input: { operations: [{ type: "canUndo" }, { type: "undo" }] },
        expected: [
          { type: "canUndo", result: false },
          { type: "undo", success: false, state: { count: 0 } },
        ],
        description: "Cannot undo with empty history",
      },
    ],
    acceptanceCriteria: [
      "Undo reverts to previous state",
      "Redo restores undone state",
      "New setState clears redo stack",
      "canUndo/canRedo return correct values",
      "Maximum history size is enforced",
    ],
  },

  // ============================================================================
  // SCENARIO 3: Event Aggregation System
  // ============================================================================
  {
    id: "add-feature-event-aggregator",
    title: "Add Grouping to Event Aggregator",
    type: "add-functionality",
    difficulty: "medium",
    companies: ["Meta", "Slack", "Discord", "Google"],
    description: "Implement event grouping and aggregation for a notification-like system",
    tags: ["aggregation", "data-structures", "events"],
    estimatedTime: 35,
    problemStatement: `You're building an event aggregation system for a social platform. Events should be grouped when similar (e.g., "John and 3 others liked your post").

**Your task:**
1. Study the existing EventAggregator class
2. Implement event grouping based on type and target
3. Add aggregation display logic (e.g., "X and N others...")
4. Support fetching aggregated events with pagination

**Context:** Users receive hundreds of events daily. Grouping improves readability and reduces noise.`,
    featureRequirements: [
      "addEvent(event) - add event and group with similar events",
      "getAggregatedEvents(limit) - return grouped events",
      "Group by type AND targetId within time window (1 hour)",
      'Display format: "actor1 and N others [action] your [target]"',
      "Mark events as read/unread",
    ],
    existingCode: {
      javascript: `// eventAggregator.js - Event aggregation system
// TODO: Implement event grouping and aggregation

class EventAggregator {
  constructor(groupingWindowMs = 3600000) { // 1 hour default
    this.events = [];
    this.groupingWindowMs = groupingWindowMs;
  }

  /**
   * Add a new event
   * Should check for similar events to group with
   * @param {Object} event - { type, actorId, actorName, targetId, targetType, timestamp }
   */
  addEvent(event) {
    const normalizedEvent = {
      ...event,
      timestamp: event.timestamp || Date.now(),
      read: false,
    };

    // TODO: Check if this event should be grouped with existing events
    // Group criteria: same type, same targetId, within groupingWindowMs
    // If grouped, update the existing group instead of adding new event

    this.events.push(normalizedEvent);
  }

  /**
   * Find a group that this event can be added to
   * @param {Object} event
   * @returns {Object|null} Existing group or null
   */
  findGroupForEvent(event) {
    // TODO: Find existing event/group with same type and targetId
    // within the grouping window
    return null;
  }

  /**
   * Get aggregated events (grouped and formatted)
   * @param {number} limit - Max events to return
   * @returns {Array} Aggregated events with display text
   */
  getAggregatedEvents(limit = 20) {
    // TODO: Implement aggregation
    // 1. Group events by type + targetId (within time window)
    // 2. For each group, create aggregated display
    // 3. Sort by most recent timestamp
    // 4. Return limited results

    return this.events.slice(0, limit).map(e => ({
      ...e,
      displayText: this._formatEvent(e),
      actorCount: 1,
    }));
  }

  /**
   * Format event display text
   * Single actor: "John liked your post"
   * Multiple actors: "John and 3 others liked your post"
   * @param {Object} eventOrGroup
   * @returns {string}
   */
  _formatEvent(eventOrGroup) {
    // TODO: Implement proper formatting for grouped events
    const { actorName, type, targetType } = eventOrGroup;
    const action = this._getActionText(type);
    return \`\${actorName} \${action} your \${targetType}\`;
  }

  /**
   * Get action text for event type
   */
  _getActionText(type) {
    const actions = {
      'like': 'liked',
      'comment': 'commented on',
      'follow': 'followed',
      'mention': 'mentioned you in',
      'share': 'shared',
    };
    return actions[type] || type;
  }

  /**
   * Mark events as read
   * @param {string|string[]} eventIds - ID(s) to mark as read
   */
  markAsRead(eventIds) {
    const ids = Array.isArray(eventIds) ? eventIds : [eventIds];
    for (const event of this.events) {
      if (ids.includes(event.id)) {
        event.read = true;
      }
    }
  }

  /**
   * Get unread count
   * @returns {number}
   */
  getUnreadCount() {
    return this.events.filter(e => !e.read).length;
  }
}

// Test helper function - DO NOT MODIFY
function testEventAggregator(operations) {
  const ea = new EventAggregator(3600000); // 1 hour window
  const results = [];

  for (const op of operations) {
    switch (op.type) {
      case 'add':
        ea.addEvent(op.event);
        results.push({ type: 'add', eventType: op.event.type });
        break;
      case 'get':
        const events = ea.getAggregatedEvents(op.limit || 20);
        results.push({
          type: 'get',
          count: events.length,
          events: events.map(e => ({
            displayText: e.displayText,
            actorCount: e.actorCount || 1,
            targetId: e.targetId,
          }))
        });
        break;
      case 'unread':
        results.push({ type: 'unread', count: ea.getUnreadCount() });
        break;
    }
  }

  return results;
}`,
      python: `# event_aggregator.py - Event aggregation system
# TODO: Implement event grouping and aggregation

import time

class EventAggregator:
    def __init__(self, grouping_window_ms=3600000):  # 1 hour default
        self.events = []
        self.grouping_window_ms = grouping_window_ms

    def add_event(self, event):
        """
        Add a new event
        Should check for similar events to group with
        Args:
            event: { type, actor_id, actor_name, target_id, target_type, timestamp }
        """
        normalized_event = {
            **event,
            'timestamp': event.get('timestamp', int(time.time() * 1000)),
            'read': False,
        }

        # TODO: Check if this event should be grouped with existing events
        # Group criteria: same type, same target_id, within grouping_window_ms
        # If grouped, update the existing group instead of adding new event

        self.events.append(normalized_event)

    def find_group_for_event(self, event):
        """
        Find a group that this event can be added to
        Returns: Existing group or None
        """
        # TODO: Find existing event/group with same type and target_id
        # within the grouping window
        return None

    def get_aggregated_events(self, limit=20):
        """
        Get aggregated events (grouped and formatted)
        Args:
            limit: Max events to return
        Returns: List of aggregated events with display text
        """
        # TODO: Implement aggregation
        # 1. Group events by type + target_id (within time window)
        # 2. For each group, create aggregated display
        # 3. Sort by most recent timestamp
        # 4. Return limited results

        return [{
            **e,
            'display_text': self._format_event(e),
            'actor_count': 1,
        } for e in self.events[:limit]]

    def _format_event(self, event_or_group):
        """
        Format event display text
        Single actor: "John liked your post"
        Multiple actors: "John and 3 others liked your post"
        """
        # TODO: Implement proper formatting for grouped events
        actor_name = event_or_group.get('actor_name', event_or_group.get('actorName'))
        event_type = event_or_group.get('type')
        target_type = event_or_group.get('target_type', event_or_group.get('targetType'))
        action = self._get_action_text(event_type)
        return f"{actor_name} {action} your {target_type}"

    def _get_action_text(self, event_type):
        """Get action text for event type"""
        actions = {
            'like': 'liked',
            'comment': 'commented on',
            'follow': 'followed',
            'mention': 'mentioned you in',
            'share': 'shared',
        }
        return actions.get(event_type, event_type)

    def mark_as_read(self, event_ids):
        """Mark events as read"""
        ids = event_ids if isinstance(event_ids, list) else [event_ids]
        for event in self.events:
            if event.get('id') in ids:
                event['read'] = True

    def get_unread_count(self):
        """Get unread count"""
        return len([e for e in self.events if not e.get('read')])


# Test helper function - DO NOT MODIFY
def test_event_aggregator(operations):
    ea = EventAggregator(3600000)  # 1 hour window
    results = []

    for op in operations:
        if op['type'] == 'add':
            ea.add_event(op['event'])
            results.append({'type': 'add', 'eventType': op['event']['type']})
        elif op['type'] == 'get':
            events = ea.get_aggregated_events(op.get('limit', 20))
            results.append({
                'type': 'get',
                'count': len(events),
                'events': [{
                    'displayText': e.get('display_text', e.get('displayText')),
                    'actorCount': e.get('actor_count', e.get('actorCount', 1)),
                    'targetId': e.get('target_id', e.get('targetId')),
                } for e in events]
            })
        elif op['type'] == 'unread':
            results.append({'type': 'unread', 'count': ea.get_unread_count()})

    return results`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: "utils/groupBy.js",
          content: `// Grouping utilities for event aggregation

/**
 * Group array items by a key function
 * @param {Array} items
 * @param {Function} keyFn - Function that returns grouping key
 * @returns {Object} Grouped items { key: [items] }
 */
function groupBy(items, keyFn) {
  return items.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

/**
 * Create grouping key for events
 * @param {Object} event
 * @returns {string} Grouping key
 */
function createEventGroupKey(event) {
  return \`\${event.type}:\${event.targetId}\`;
}

module.exports = { groupBy, createEventGroupKey };`,
          description: "Grouping utilities - use these to group events by type and target",
        },
        {
          fileName: "data/sampleEvents.js",
          content: `// Sample events showing expected grouping behavior

const sampleEvents = [
  { type: 'like', actorId: 'u1', actorName: 'John', targetId: 'post1', targetType: 'post', timestamp: 1000 },
  { type: 'like', actorId: 'u2', actorName: 'Jane', targetId: 'post1', targetType: 'post', timestamp: 1100 },
  { type: 'like', actorId: 'u3', actorName: 'Bob', targetId: 'post1', targetType: 'post', timestamp: 1200 },
  { type: 'comment', actorId: 'u4', actorName: 'Alice', targetId: 'post1', targetType: 'post', timestamp: 1300 },
];

// Expected aggregated output:
// [
//   { displayText: "John and 2 others liked your post", actorCount: 3, targetId: 'post1' },
//   { displayText: "Alice commented on your post", actorCount: 1, targetId: 'post1' },
// ]

module.exports = { sampleEvents };`,
          description: "Sample events showing expected grouping and formatting",
        },
      ],
      python: [
        {
          fileName: "utils/group_by.py",
          content: `# Grouping utilities for event aggregation
from collections import defaultdict


def group_by(items, key_fn):
    """
    Group array items by a key function
    Args:
        items: List of items
        key_fn: Function that returns grouping key
    Returns: Dict of grouped items { key: [items] }
    """
    groups = defaultdict(list)
    for item in items:
        key = key_fn(item)
        groups[key].append(item)
    return dict(groups)


def create_event_group_key(event):
    """Create grouping key for events"""
    return f"{event['type']}:{event.get('target_id', event.get('targetId'))}"`,
          description: "Grouping utilities - use these to group events by type and target",
        },
      ],
    },
    hints: [
      "Use createEventGroupKey() to generate consistent keys for grouping",
      "When adding event, check if group exists with same key AND recent timestamp",
      "Store actors array in grouped events: { actors: [{id, name}], ... }",
      'Format display: first actor name + "and N others" if multiple actors',
      "Sort aggregated results by most recent timestamp (descending)",
    ],
    testCases: [
      {
        input: {
          operations: [
            {
              type: "add",
              event: {
                type: "like",
                actorId: "u1",
                actorName: "John",
                targetId: "post1",
                targetType: "post",
              },
            },
            { type: "get", limit: 10 },
          ],
        },
        expected: [
          { type: "add", eventType: "like" },
          {
            type: "get",
            count: 1,
            events: [{ displayText: "John liked your post", actorCount: 1, targetId: "post1" }],
          },
        ],
        description: "Single event displays correctly",
      },
      {
        input: {
          operations: [
            {
              type: "add",
              event: {
                type: "like",
                actorId: "u1",
                actorName: "John",
                targetId: "post1",
                targetType: "post",
                timestamp: 1000,
              },
            },
            {
              type: "add",
              event: {
                type: "like",
                actorId: "u2",
                actorName: "Jane",
                targetId: "post1",
                targetType: "post",
                timestamp: 1100,
              },
            },
            {
              type: "add",
              event: {
                type: "like",
                actorId: "u3",
                actorName: "Bob",
                targetId: "post1",
                targetType: "post",
                timestamp: 1200,
              },
            },
            { type: "get", limit: 10 },
          ],
        },
        expected: [
          { type: "add", eventType: "like" },
          { type: "add", eventType: "like" },
          { type: "add", eventType: "like" },
          {
            type: "get",
            count: 1,
            events: [
              {
                displayText: "John and 2 others liked your post",
                actorCount: 3,
                targetId: "post1",
              },
            ],
          },
        ],
        description: "Multiple likes on same post are grouped",
      },
      {
        input: {
          operations: [
            {
              type: "add",
              event: {
                type: "like",
                actorId: "u1",
                actorName: "John",
                targetId: "post1",
                targetType: "post",
              },
            },
            {
              type: "add",
              event: {
                type: "comment",
                actorId: "u2",
                actorName: "Jane",
                targetId: "post1",
                targetType: "post",
              },
            },
            { type: "get", limit: 10 },
          ],
        },
        expected: [
          { type: "add", eventType: "like" },
          { type: "add", eventType: "comment" },
          {
            type: "get",
            count: 2,
            events: [
              { displayText: "Jane commented on your post", actorCount: 1, targetId: "post1" },
              { displayText: "John liked your post", actorCount: 1, targetId: "post1" },
            ],
          },
        ],
        description: "Different event types are not grouped together",
      },
    ],
    acceptanceCriteria: [
      "Events with same type and targetId are grouped",
      'Grouped events show "X and N others" format',
      "Single events show simple format",
      "Events are sorted by most recent",
      "Different event types remain separate",
    ],
  },

  // ============================================================================
  // SCENARIO 4: Cache with TTL Expiration (EXISTING - TESTABLE)
  // ============================================================================
  {
    id: "add-feature-cache-system",
    title: "Add TTL Expiration to Cache",
    type: "add-functionality",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Add time-to-live (TTL) expiration feature to an existing cache system",
    tags: ["cache", "data-structures", "time-based"],
    estimatedTime: 30,
    problemStatement: `You're working on a caching system. The existing cache supports get/set operations but doesn't support TTL expiration.

**Your task:**
1. Read the existing cache implementation
2. Add TTL support: entries should expire after a specified duration
3. Modify the get method to check expiration
4. Ensure expired entries don't count toward cache size
5. All existing tests must still pass

**Context:** This cache is used by multiple microservices. TTL is critical for avoiding stale data.`,
    featureRequirements: [
      "set(key, value, ttlMs) - store with optional TTL in milliseconds",
      "get(key) - returns null if expired or not found",
      "has(key) - returns false if expired",
      "delete(key) - removes entry",
      "size() - returns count of non-expired entries",
      "cleanup() - removes all expired entries",
    ],
    existingCode: {
      javascript: `// cache.js - Simple cache implementation
// TODO: Add TTL (time-to-live) expiration support

class Cache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.store = new Map();
  }

  /**
   * Store a value in the cache
   * @param {string} key - The cache key
   * @param {any} value - The value to store
   * @param {number} ttlMs - Time to live in milliseconds (optional)
   */
  set(key, value, ttlMs = null) {
    // TODO: Implement TTL support
    // Store the value along with expiration time if ttlMs is provided
    if (this.store.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.store.keys().next().value;
      this.store.delete(firstKey);
    }
    this.store.set(key, value);
  }

  /**
   * Get a value from the cache
   * @param {string} key - The cache key
   * @returns {any} The cached value or null if not found/expired
   */
  get(key) {
    // TODO: Check if entry is expired before returning
    return this.store.get(key) || null;
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - The cache key
   * @returns {boolean}
   */
  has(key) {
    // TODO: Return false if expired
    return this.store.has(key);
  }

  /**
   * Delete a key from the cache
   * @param {string} key - The cache key
   * @returns {boolean} True if key was deleted
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * Get count of non-expired entries
   * @returns {number}
   */
  size() {
    // TODO: Only count non-expired entries
    return this.store.size;
  }

  /**
   * Remove all expired entries
   * @returns {number} Number of entries removed
   */
  cleanup() {
    // TODO: Implement cleanup of expired entries
    return 0;
  }
}

// Test helper function - DO NOT MODIFY
function testCache(operations) {
  const cache = new Cache(10);
  const results = [];

  for (const op of operations) {
    switch (op.type) {
      case 'set':
        cache.set(op.key, op.value, op.ttl);
        results.push({ type: 'set', key: op.key });
        break;
      case 'get':
        results.push({ type: 'get', key: op.key, value: cache.get(op.key) });
        break;
      case 'has':
        results.push({ type: 'has', key: op.key, exists: cache.has(op.key) });
        break;
      case 'size':
        results.push({ type: 'size', count: cache.size() });
        break;
      case 'wait':
        // Simulate time passing (in test mode, we manipulate time)
        if (typeof op.ms === 'number') {
          // Advance mock time
          global.__mockTime = (global.__mockTime || Date.now()) + op.ms;
        }
        break;
      case 'cleanup':
        results.push({ type: 'cleanup', removed: cache.cleanup() });
        break;
    }
  }

  return results;
}`,
      python: `# cache.py - Simple cache implementation
# TODO: Add TTL (time-to-live) expiration support

import time

class Cache:
    def __init__(self, max_size=100):
        self.max_size = max_size
        self.store = {}

    def set(self, key, value, ttl_ms=None):
        """
        Store a value in the cache
        Args:
            key: The cache key
            value: The value to store
            ttl_ms: Time to live in milliseconds (optional)
        """
        # TODO: Implement TTL support
        # Store the value along with expiration time if ttl_ms is provided
        if len(self.store) >= self.max_size:
            # Remove first entry (oldest)
            first_key = next(iter(self.store))
            del self.store[first_key]
        self.store[key] = value

    def get(self, key):
        """
        Get a value from the cache
        Returns: The cached value or None if not found/expired
        """
        # TODO: Check if entry is expired before returning
        return self.store.get(key)

    def has(self, key):
        """Check if key exists and is not expired"""
        # TODO: Return False if expired
        return key in self.store

    def delete(self, key):
        """Delete a key from the cache"""
        if key in self.store:
            del self.store[key]
            return True
        return False

    def size(self):
        """Get count of non-expired entries"""
        # TODO: Only count non-expired entries
        return len(self.store)

    def cleanup(self):
        """Remove all expired entries"""
        # TODO: Implement cleanup of expired entries
        return 0


# Test helper function - DO NOT MODIFY
def test_cache(operations):
    cache = Cache(10)
    results = []

    for op in operations:
        if op['type'] == 'set':
            cache.set(op['key'], op['value'], op.get('ttl'))
            results.append({'type': 'set', 'key': op['key']})
        elif op['type'] == 'get':
            results.append({'type': 'get', 'key': op['key'], 'value': cache.get(op['key'])})
        elif op['type'] == 'has':
            results.append({'type': 'has', 'key': op['key'], 'exists': cache.has(op['key'])})
        elif op['type'] == 'size':
            results.append({'type': 'size', 'count': cache.size()})
        elif op['type'] == 'cleanup':
            results.append({'type': 'cleanup', 'removed': cache.cleanup()})

    return results`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: "utils/time.js",
          content: `// Time utilities for cache
// Use these for time-based operations

function getCurrentTime() {
  // In tests, this may return mock time
  return global.__mockTime || Date.now();
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return getCurrentTime() >= expiresAt;
}

module.exports = { getCurrentTime, isExpired };`,
          description:
            "Time utilities - use getCurrentTime() instead of Date.now() for testability",
        },
      ],
      python: [
        {
          fileName: "utils/time_utils.py",
          content: `# Time utilities for cache
# Use these for time-based operations

_mock_time = None

def get_current_time():
    """Returns current time in milliseconds"""
    global _mock_time
    if _mock_time is not None:
        return _mock_time
    return int(time.time() * 1000)

def is_expired(expires_at):
    """Check if a timestamp has expired"""
    if expires_at is None:
        return False
    return get_current_time() >= expires_at`,
          description: "Time utilities - use get_current_time() for testability",
        },
      ],
    },
    hints: [
      "Store expiration timestamp along with value (e.g., { value, expiresAt })",
      "Calculate expiresAt as getCurrentTime() + ttlMs when setting",
      "In get(), check if entry exists AND is not expired",
      "Use the isExpired() utility from time.js",
      "For cleanup(), iterate through entries and delete expired ones",
    ],
    testCases: [
      {
        input: {
          operations: [
            { type: "set", key: "a", value: 1 },
            { type: "get", key: "a" },
          ],
        },
        expected: [
          { type: "set", key: "a" },
          { type: "get", key: "a", value: 1 },
        ],
        description: "Basic set and get without TTL",
      },
      {
        input: {
          operations: [
            { type: "set", key: "b", value: 2 },
            { type: "has", key: "b" },
            { type: "has", key: "c" },
          ],
        },
        expected: [
          { type: "set", key: "b" },
          { type: "has", key: "b", exists: true },
          { type: "has", key: "c", exists: false },
        ],
        description: "has() returns correct boolean",
      },
      {
        input: {
          operations: [
            { type: "set", key: "x", value: 10 },
            { type: "set", key: "y", value: 20 },
            { type: "size" },
          ],
        },
        expected: [
          { type: "set", key: "x" },
          { type: "set", key: "y" },
          { type: "size", count: 2 },
        ],
        description: "size() returns correct count",
      },
    ],
    acceptanceCriteria: [
      "All existing functionality still works",
      "TTL expiration works correctly",
      "Expired entries are not returned by get()",
      "size() only counts non-expired entries",
      "cleanup() removes expired entries",
    ],
  },

  // ============================================================================
  // SCENARIO 5: Sliding Window Rate Limiter (EXISTING - TESTABLE)
  // ============================================================================
  {
    id: "add-feature-rate-limiter",
    title: "Add Sliding Window Rate Limiter",
    type: "add-functionality",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Stripe", "Cloudflare"],
    description: "Implement a sliding window rate limiter for API requests",
    tags: ["rate-limiting", "algorithms", "api"],
    estimatedTime: 30,
    problemStatement: `You're building an API rate limiter. The existing implementation uses a fixed window, which allows request bursts at window boundaries.

**Your task:**
1. Implement a sliding window rate limiter
2. The limiter should allow N requests per window (e.g., 100 requests per minute)
3. Use sliding window algorithm to avoid burst issues
4. Return remaining quota and reset time with each check

**Context:** This rate limiter protects backend services from abuse. Accurate limiting is critical.`,
    featureRequirements: [
      "isAllowed(clientId) - check if request is allowed",
      "Sliding window algorithm (not fixed window)",
      "Return { allowed, remaining, resetTime } from check",
      "Support configurable limits per client",
      "Efficient cleanup of old entries",
    ],
    existingCode: {
      javascript: `// rate-limiter.js - Implement sliding window rate limiter

class RateLimiter {
  /**
   * @param {number} maxRequests - Maximum requests per window
   * @param {number} windowMs - Window size in milliseconds
   */
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.clients = new Map(); // clientId -> request timestamps
  }

  /**
   * Check if a request is allowed for this client
   * @param {string} clientId - Unique client identifier
   * @returns {Object} { allowed: boolean, remaining: number, resetTime: number }
   */
  isAllowed(clientId) {
    const now = Date.now();

    // TODO: Implement sliding window rate limiting
    // 1. Get or create client's request history
    // 2. Remove requests outside the current window
    // 3. Check if under limit
    // 4. If allowed, add current timestamp
    // 5. Return result with remaining count and reset time

    return {
      allowed: true,
      remaining: this.maxRequests,
      resetTime: now + this.windowMs,
    };
  }

  /**
   * Get current request count for client in window
   * @param {string} clientId
   * @returns {number}
   */
  getRequestCount(clientId) {
    // TODO: Return count of requests in current window
    return 0;
  }

  /**
   * Clean up old entries to prevent memory leaks
   * Should be called periodically
   */
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // TODO: Remove timestamps older than windowStart for all clients
    // Also remove clients with no recent requests
  }

  /**
   * Reset rate limit for a client (e.g., after payment or manual override)
   * @param {string} clientId
   */
  reset(clientId) {
    this.clients.delete(clientId);
  }
}

// Test helper function - DO NOT MODIFY
function testRateLimiter(operations) {
  const limiter = new RateLimiter(5, 1000); // 5 requests per second for testing
  const results = [];

  for (const op of operations) {
    switch (op.type) {
      case 'check':
        const result = limiter.isAllowed(op.clientId);
        results.push({
          type: 'check',
          clientId: op.clientId,
          allowed: result.allowed,
          remaining: result.remaining,
        });
        break;
      case 'count':
        results.push({
          type: 'count',
          clientId: op.clientId,
          count: limiter.getRequestCount(op.clientId),
        });
        break;
      case 'reset':
        limiter.reset(op.clientId);
        results.push({ type: 'reset', clientId: op.clientId });
        break;
      case 'cleanup':
        limiter.cleanup();
        results.push({ type: 'cleanup' });
        break;
    }
  }

  return results;
}`,
      python: `# rate_limiter.py - Implement sliding window rate limiter

import time

class RateLimiter:
    def __init__(self, max_requests=100, window_ms=60000):
        """
        Args:
            max_requests: Maximum requests per window
            window_ms: Window size in milliseconds
        """
        self.max_requests = max_requests
        self.window_ms = window_ms
        self.clients = {}  # client_id -> list of request timestamps

    def is_allowed(self, client_id):
        """
        Check if a request is allowed for this client
        Args:
            client_id: Unique client identifier
        Returns: { 'allowed': bool, 'remaining': int, 'reset_time': int }
        """
        now = int(time.time() * 1000)

        # TODO: Implement sliding window rate limiting
        # 1. Get or create client's request history
        # 2. Remove requests outside the current window
        # 3. Check if under limit
        # 4. If allowed, add current timestamp
        # 5. Return result with remaining count and reset time

        return {
            'allowed': True,
            'remaining': self.max_requests,
            'reset_time': now + self.window_ms,
        }

    def get_request_count(self, client_id):
        """Return count of requests in current window"""
        # TODO: Return count of requests in current window
        return 0

    def cleanup(self):
        """Clean up old entries to prevent memory leaks"""
        now = int(time.time() * 1000)
        window_start = now - self.window_ms

        # TODO: Remove timestamps older than window_start for all clients
        # Also remove clients with no recent requests

    def reset(self, client_id):
        """Reset rate limit for a client"""
        if client_id in self.clients:
            del self.clients[client_id]


# Test helper function - DO NOT MODIFY
def test_rate_limiter(operations):
    limiter = RateLimiter(5, 1000)  # 5 requests per second for testing
    results = []

    for op in operations:
        if op['type'] == 'check':
            result = limiter.is_allowed(op['clientId'])
            results.append({
                'type': 'check',
                'clientId': op['clientId'],
                'allowed': result['allowed'],
                'remaining': result['remaining'],
            })
        elif op['type'] == 'count':
            results.append({
                'type': 'count',
                'clientId': op['clientId'],
                'count': limiter.get_request_count(op['clientId']),
            })
        elif op['type'] == 'reset':
            limiter.reset(op['clientId'])
            results.append({'type': 'reset', 'clientId': op['clientId']})
        elif op['type'] == 'cleanup':
            limiter.cleanup()
            results.append({'type': 'cleanup'})

    return results`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: "utils/timeWindow.js",
          content: `// Time window utilities for rate limiting

/**
 * Filter timestamps to only those within a time window
 * @param {number[]} timestamps - Array of timestamps
 * @param {number} windowMs - Window size in milliseconds
 * @param {number} now - Current time (optional, defaults to Date.now())
 * @returns {number[]} Filtered timestamps
 */
function filterToWindow(timestamps, windowMs, now = Date.now()) {
  const windowStart = now - windowMs;
  return timestamps.filter(ts => ts > windowStart);
}

/**
 * Calculate reset time (when oldest request exits the window)
 * @param {number[]} timestamps - Array of timestamps in window
 * @param {number} windowMs - Window size
 * @returns {number} Reset timestamp
 */
function calculateResetTime(timestamps, windowMs) {
  if (timestamps.length === 0) return Date.now();
  const oldest = Math.min(...timestamps);
  return oldest + windowMs;
}

module.exports = { filterToWindow, calculateResetTime };`,
          description: "Time window utilities for rate limiting calculations",
        },
      ],
      python: [
        {
          fileName: "utils/time_window.py",
          content: `# Time window utilities for rate limiting
import time

def filter_to_window(timestamps, window_ms, now=None):
    """
    Filter timestamps to only those within a time window
    Args:
        timestamps: List of timestamps
        window_ms: Window size in milliseconds
        now: Current time (optional)
    Returns: Filtered timestamps
    """
    if now is None:
        now = int(time.time() * 1000)
    window_start = now - window_ms
    return [ts for ts in timestamps if ts > window_start]

def calculate_reset_time(timestamps, window_ms):
    """
    Calculate reset time (when oldest request exits the window)
    """
    if not timestamps:
        return int(time.time() * 1000)
    oldest = min(timestamps)
    return oldest + window_ms`,
          description: "Time window utilities for rate limiting calculations",
        },
      ],
    },
    hints: [
      "Store timestamps as array for each client: clients.set(clientId, [])",
      "At start of isAllowed(), filter out timestamps older than windowStart",
      "Check length after filtering: if < maxRequests, allow and add timestamp",
      "remaining = maxRequests - timestamps.length",
      "resetTime = oldest timestamp in window + windowMs",
    ],
    testCases: [
      {
        input: {
          operations: [
            { type: "check", clientId: "user1" },
            { type: "check", clientId: "user1" },
            { type: "count", clientId: "user1" },
          ],
        },
        expected: [
          { type: "check", clientId: "user1", allowed: true, remaining: 4 },
          { type: "check", clientId: "user1", allowed: true, remaining: 3 },
          { type: "count", clientId: "user1", count: 2 },
        ],
        description: "Basic rate limiting counts requests",
      },
      {
        input: {
          operations: [
            { type: "check", clientId: "user2" },
            { type: "check", clientId: "user2" },
            { type: "check", clientId: "user2" },
            { type: "check", clientId: "user2" },
            { type: "check", clientId: "user2" },
            { type: "check", clientId: "user2" },
          ],
        },
        expected: [
          { type: "check", clientId: "user2", allowed: true, remaining: 4 },
          { type: "check", clientId: "user2", allowed: true, remaining: 3 },
          { type: "check", clientId: "user2", allowed: true, remaining: 2 },
          { type: "check", clientId: "user2", allowed: true, remaining: 1 },
          { type: "check", clientId: "user2", allowed: true, remaining: 0 },
          { type: "check", clientId: "user2", allowed: false, remaining: 0 },
        ],
        description: "Blocks requests after limit reached",
      },
      {
        input: {
          operations: [
            { type: "check", clientId: "user3" },
            { type: "check", clientId: "user3" },
            { type: "reset", clientId: "user3" },
            { type: "count", clientId: "user3" },
          ],
        },
        expected: [
          { type: "check", clientId: "user3", allowed: true, remaining: 4 },
          { type: "check", clientId: "user3", allowed: true, remaining: 3 },
          { type: "reset", clientId: "user3" },
          { type: "count", clientId: "user3", count: 0 },
        ],
        description: "Reset clears request history",
      },
    ],
    acceptanceCriteria: [
      "Requests under limit are allowed",
      "Requests over limit are blocked",
      "Remaining count decreases correctly",
      "Reset clears the history",
      "Different clients have separate limits",
    ],
  },

  // ============================================================================
  // SCENARIO 6: Fuzzy Text Search (EXISTING - TESTABLE)
  // ============================================================================
  {
    id: "add-feature-text-search",
    title: "Add Fuzzy Matching to Text Search",
    type: "add-functionality",
    difficulty: "medium",
    companies: ["Algolia", "Elasticsearch", "Google", "Slack"],
    description: "Implement fuzzy text search with Levenshtein distance",
    tags: ["search", "algorithms", "string-matching"],
    estimatedTime: 35,
    problemStatement: `You're building a search feature for an application. The existing search only supports exact matching, but users want fuzzy search to handle typos.

**Your task:**
1. Study the existing TextSearch class
2. Implement fuzzy matching using Levenshtein distance
3. Return results ranked by relevance (exact matches first, then by edit distance)
4. Support configurable maximum edit distance

**Context:** This search powers a product catalog. Users often mistype product names.`,
    featureRequirements: [
      "search(query, maxDistance) - fuzzy search with max edit distance",
      "Implement Levenshtein distance calculation",
      "Rank results: exact match > prefix match > fuzzy match",
      "Return relevance score with each result",
      "Case-insensitive matching",
    ],
    existingCode: {
      javascript: `// textSearch.js - Text search with fuzzy matching
// TODO: Implement fuzzy matching with Levenshtein distance

class TextSearch {
  constructor() {
    this.items = [];
  }

  /**
   * Add item to searchable index
   * @param {string} text - Text to index
   * @param {any} data - Associated data
   */
  addItem(text, data = null) {
    this.items.push({
      text: text.toLowerCase(),
      originalText: text,
      data,
    });
  }

  /**
   * Search for items matching query
   * @param {string} query - Search query
   * @param {number} maxDistance - Maximum edit distance for fuzzy match (default 2)
   * @returns {Array} Results with { text, data, score, matchType }
   */
  search(query, maxDistance = 2) {
    const queryLower = query.toLowerCase();
    const results = [];

    for (const item of this.items) {
      // TODO: Implement matching logic
      // 1. Check exact match (score: 100, matchType: 'exact')
      // 2. Check prefix match (score: 80, matchType: 'prefix')
      // 3. Check fuzzy match using Levenshtein (score: based on distance, matchType: 'fuzzy')

      // Placeholder - only exact match
      if (item.text === queryLower) {
        results.push({
          text: item.originalText,
          data: item.data,
          score: 100,
          matchType: 'exact',
        });
      }
    }

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} a
   * @param {string} b
   * @returns {number} Edit distance
   */
  levenshteinDistance(a, b) {
    // TODO: Implement Levenshtein distance algorithm
    // Use dynamic programming approach
    return Infinity; // Placeholder
  }

  /**
   * Calculate fuzzy score based on edit distance
   * @param {number} distance
   * @param {number} maxDistance
   * @returns {number} Score between 0-70
   */
  calculateFuzzyScore(distance, maxDistance) {
    if (distance > maxDistance) return 0;
    // Linear score: distance 0 = 70, distance maxDistance = 10
    return Math.round(70 - (distance / maxDistance) * 60);
  }
}

// Test helper function - DO NOT MODIFY
function testTextSearch(operations) {
  const search = new TextSearch();
  const results = [];

  for (const op of operations) {
    switch (op.type) {
      case 'add':
        search.addItem(op.text, op.data);
        results.push({ type: 'add', text: op.text });
        break;
      case 'search':
        const matches = search.search(op.query, op.maxDistance || 2);
        results.push({
          type: 'search',
          query: op.query,
          results: matches.map(m => ({
            text: m.text,
            score: m.score,
            matchType: m.matchType,
          })),
        });
        break;
      case 'distance':
        const dist = search.levenshteinDistance(op.a, op.b);
        results.push({ type: 'distance', a: op.a, b: op.b, distance: dist });
        break;
    }
  }

  return results;
}`,
      python: `# text_search.py - Text search with fuzzy matching
# TODO: Implement fuzzy matching with Levenshtein distance

class TextSearch:
    def __init__(self):
        self.items = []

    def add_item(self, text, data=None):
        """
        Add item to searchable index
        Args:
            text: Text to index
            data: Associated data
        """
        self.items.append({
            'text': text.lower(),
            'original_text': text,
            'data': data,
        })

    def search(self, query, max_distance=2):
        """
        Search for items matching query
        Args:
            query: Search query
            max_distance: Maximum edit distance for fuzzy match (default 2)
        Returns: List of results with { text, data, score, match_type }
        """
        query_lower = query.lower()
        results = []

        for item in self.items:
            # TODO: Implement matching logic
            # 1. Check exact match (score: 100, match_type: 'exact')
            # 2. Check prefix match (score: 80, match_type: 'prefix')
            # 3. Check fuzzy match using Levenshtein (score: based on distance, match_type: 'fuzzy')

            # Placeholder - only exact match
            if item['text'] == query_lower:
                results.append({
                    'text': item['original_text'],
                    'data': item['data'],
                    'score': 100,
                    'match_type': 'exact',
                })

        # Sort by score descending
        return sorted(results, key=lambda x: -x['score'])

    def levenshtein_distance(self, a, b):
        """
        Calculate Levenshtein distance between two strings
        Returns: Edit distance
        """
        # TODO: Implement Levenshtein distance algorithm
        # Use dynamic programming approach
        return float('inf')  # Placeholder

    def calculate_fuzzy_score(self, distance, max_distance):
        """
        Calculate fuzzy score based on edit distance
        Returns: Score between 0-70
        """
        if distance > max_distance:
            return 0
        # Linear score: distance 0 = 70, distance max_distance = 10
        return round(70 - (distance / max_distance) * 60)


# Test helper function - DO NOT MODIFY
def test_text_search(operations):
    search = TextSearch()
    results = []

    for op in operations:
        if op['type'] == 'add':
            search.add_item(op['text'], op.get('data'))
            results.append({'type': 'add', 'text': op['text']})
        elif op['type'] == 'search':
            matches = search.search(op['query'], op.get('maxDistance', 2))
            results.append({
                'type': 'search',
                'query': op['query'],
                'results': [{
                    'text': m['text'],
                    'score': m['score'],
                    'matchType': m.get('match_type', m.get('matchType')),
                } for m in matches],
            })
        elif op['type'] == 'distance':
            dist = search.levenshtein_distance(op['a'], op['b'])
            results.append({'type': 'distance', 'a': op['a'], 'b': op['b'], 'distance': dist})

    return results`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: "utils/stringMetrics.js",
          content: `// String comparison utilities

/**
 * Check if string starts with prefix (case-insensitive)
 */
function startsWith(str, prefix) {
  return str.toLowerCase().startsWith(prefix.toLowerCase());
}

/**
 * Check if string contains substring (case-insensitive)
 */
function contains(str, substring) {
  return str.toLowerCase().includes(substring.toLowerCase());
}

/**
 * Levenshtein distance reference implementation
 * This is for understanding - implement your own in TextSearch
 *
 * Algorithm:
 * 1. Create matrix of size (m+1) x (n+1)
 * 2. Initialize first row and column with indices
 * 3. Fill matrix using recurrence:
 *    dp[i][j] = min(
 *      dp[i-1][j] + 1,     // deletion
 *      dp[i][j-1] + 1,     // insertion
 *      dp[i-1][j-1] + cost // substitution (cost = 0 if chars match, 1 otherwise)
 *    )
 * 4. Return dp[m][n]
 */

module.exports = { startsWith, contains };`,
          description: "String utilities and Levenshtein algorithm explanation",
        },
      ],
      python: [
        {
          fileName: "utils/string_metrics.py",
          content: `# String comparison utilities

def starts_with(string, prefix):
    """Check if string starts with prefix (case-insensitive)"""
    return string.lower().startswith(prefix.lower())

def contains(string, substring):
    """Check if string contains substring (case-insensitive)"""
    return substring.lower() in string.lower()

# Levenshtein distance reference implementation
# This is for understanding - implement your own in TextSearch
#
# Algorithm:
# 1. Create matrix of size (m+1) x (n+1)
# 2. Initialize first row and column with indices
# 3. Fill matrix using recurrence:
#    dp[i][j] = min(
#      dp[i-1][j] + 1,     # deletion
#      dp[i][j-1] + 1,     # insertion
#      dp[i-1][j-1] + cost # substitution (cost = 0 if chars match, 1 otherwise)
#    )
# 4. Return dp[m][n]`,
          description: "String utilities and Levenshtein algorithm explanation",
        },
      ],
    },
    hints: [
      "For Levenshtein: create 2D array dp[a.length+1][b.length+1]",
      "Initialize dp[i][0] = i and dp[0][j] = j",
      "For prefix match: check if item.text.startsWith(query)",
      "Check matches in order: exact first, then prefix, then fuzzy",
      "Only add to results if score > 0 or within maxDistance",
    ],
    testCases: [
      {
        input: {
          operations: [
            { type: "add", text: "apple" },
            { type: "add", text: "application" },
            { type: "add", text: "banana" },
            { type: "search", query: "apple" },
          ],
        },
        expected: [
          { type: "add", text: "apple" },
          { type: "add", text: "application" },
          { type: "add", text: "banana" },
          {
            type: "search",
            query: "apple",
            results: [{ text: "apple", score: 100, matchType: "exact" }],
          },
        ],
        description: "Exact match returns highest score",
      },
      {
        input: {
          operations: [
            { type: "add", text: "apple" },
            { type: "add", text: "application" },
            { type: "search", query: "app" },
          ],
        },
        expected: [
          { type: "add", text: "apple" },
          { type: "add", text: "application" },
          {
            type: "search",
            query: "app",
            results: [
              { text: "apple", score: 80, matchType: "prefix" },
              { text: "application", score: 80, matchType: "prefix" },
            ],
          },
        ],
        description: "Prefix match returns medium score",
      },
      {
        input: { operations: [{ type: "distance", a: "kitten", b: "sitting" }] },
        expected: [{ type: "distance", a: "kitten", b: "sitting", distance: 3 }],
        description: "Levenshtein distance calculation",
      },
    ],
    acceptanceCriteria: [
      "Exact matches return score 100",
      "Prefix matches return score 80",
      "Fuzzy matches return score based on edit distance",
      "Results are sorted by score descending",
      "Levenshtein distance is calculated correctly",
    ],
  },
]

export default addFunctionalityScenarios
