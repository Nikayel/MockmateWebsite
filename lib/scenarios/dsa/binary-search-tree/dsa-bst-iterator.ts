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
  problemStatement: `Implement the BSTIterator class that represents an iterator over the in-order traversal of a binary search tree (BST):

- BSTIterator(TreeNode root) Initializes an object with the root of the BST.
- boolean hasNext() Returns true if there exists a number in the traversal to the right of the pointer.
- int next() Moves the pointer to the right, then returns the number at the pointer.

Notice that by initializing the pointer to a non-existent smallest number, the first call to next() will return the smallest element in the BST.

You may assume that next() calls will always be valid.`,
  examples: [
    {
      input:
        "BSTIterator([7, 3, 15, null, null, 9, 20]); next(); next(); hasNext(); next(); hasNext(); next(); hasNext(); next(); hasNext();",
      output: "3, 7, true, 9, true, 15, true, 20, false",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in range [1, 10^5]",
    "0 <= Node.val <= 10^6",
    "At most 10^5 calls will be made to hasNext and next",
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
