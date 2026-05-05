import type { AddFunctionalityScenario } from "../types"

export const stateHistoryScenario: AddFunctionalityScenario = {
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
}
