import type { DSAScenario } from "../../types"

export const dsaBstIteratorScenario: DSAScenario = {
  id: "dsa-bst-iterator",
  title: "Binary Search Tree Iterator",
  type: "dsa",
  pattern: "binary-search-tree",
  difficulty: "medium",
  companies: ["Meta", "Amazon", "Microsoft", "Google"],
  description: "Implement an iterator over a BST",
  tags: ["tree", "bst", "design", "stack"],
  estimatedTime: 25,
  problemStatement: `You're implementing BSTIterator, a class that walks a binary search tree and serves its stored values one at a time in ascending order.

- BSTIterator(root) receives the tree's root and parks an internal cursor just before the smallest value.
- next() advances the cursor one position and returns the value it lands on, so the very first call produces the tree's minimum.
- hasNext() reports whether any value remains beyond the cursor.

Every call to next() that arrives will be legal: the caller never requests a value once the traversal is exhausted.`,
  examples: [
    {
      input:
        "BSTIterator([10, 4, 21, null, null, 14, 27]); next(); next(); hasNext(); next(); hasNext(); next(); hasNext(); next(); hasNext();",
      output: "4, 10, true, 14, true, 21, true, 27, false",
    },
  ],
  constraints: [
    "Expect anywhere from 1 to 10^5 nodes in the tree",
    "Values sit inside 0 <= Node.val <= 10^6",
    "hasNext and next together receive at most 10^5 calls",
  ],
  hints: [
    "Use a stack to simulate inorder traversal",
    "Push all left children initially",
    "When calling next(), pop from stack and push right child's left descendants",
  ],
  starterCode: {
    javascript: `class BSTIterator {
  constructor(root) {
    // Initialize iterator
  }

  next() {
    // Return next smallest element
  }

  hasNext() {
    // Return true if more elements exist
  }
}`,
    typescript: `class BSTIterator {
  constructor(root: TreeNode | null) {
    // Initialize iterator
  }

  next(): number {
    // Return next smallest element
  }

  hasNext(): boolean {
    // Return true if more elements exist
  }
}`,
    python: `class BSTIterator:
    def __init__(self, root):
        # Initialize iterator
        pass

    def next(self) -> int:
        # Return next smallest element
        pass

    def has_next(self) -> bool:
        # Return true if more elements exist
        pass`,
    java: `class BSTIterator {
    public BSTIterator(TreeNode root) {
        // Initialize iterator
    }

    public int next() {
        // Return next smallest element
        return 0;
    }

    public boolean hasNext() {
        // Return true if more elements exist
        return false;
    }
}`,
  },
  optimalComplexity: {
    time: "O(1) average for next()",
    space: "O(h)",
  },
  testCases: [
    {
      input: {
        root: [7, 3, 15, null, null, 9, 20],
        operations: [
          "next",
          "next",
          "hasNext",
          "next",
          "hasNext",
          "next",
          "hasNext",
          "next",
          "hasNext",
        ],
      },
      expected: [3, 7, true, 9, true, 15, true, 20, false],
      description: "Full traversal",
    },
    {
      input: { root: [3, 1, 4, null, 2], operations: ["hasNext", "next", "next"] },
      expected: [true, 1, 2],
      description: "Partial traversal",
    },
    {
      input: { root: [1], operations: ["next", "hasNext"] },
      expected: [1, false],
      description: "Single node",
    },
  ],
}
