/**
 * Binary Search Tree DSA Scenarios
 * Pattern: binary-search-tree
 */

import type { DSAScenario } from "../types"

export const binarySearchTreeScenarios: DSAScenario[] = [
  {
    id: "dsa-valid-binary-search-tree",
    title: "Validate Binary Search Tree",
    type: "dsa",
    pattern: "binary-search-tree",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Microsoft", "Google"],
    description: "Determine if a binary tree is a valid BST",
    tags: ["tree", "binary-search-tree", "depth-first-search"],
    estimatedTime: 20,
    problemStatement: `Given the root of a binary tree, determine if it is a valid binary search tree (BST).

A valid BST is defined as follows:
- The left subtree of a node contains only nodes with keys less than the node's key.
- The right subtree of a node contains only nodes with keys greater than the node's key.
- Both the left and right subtrees must also be binary search trees.`,
    examples: [
      {
        input: "root = [2,1,3]",
        output: "true",
      },
      {
        input: "root = [5,1,4,null,null,3,6]",
        output: "false",
        explanation: "The root node's value is 5 but its right child's value is 4.",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [1, 10^4]",
      "-2^31 <= Node.val <= 2^31 - 1",
    ],
    hints: [
      "Use recursion with min and max bounds",
      "For each node, check if it's within its valid range",
      "Update bounds when recursing to left and right",
    ],
    starterCode: {
      javascript: `function isValidBST(root) {
  // Write your solution here

}`,
      typescript: `function isValidBST(root: TreeNode | null): boolean {
  // Write your solution here

}`,
      python: `def isValidBST(root):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(h)",
    },
    testCases: [
      {
        input: { tree: [2, 1, 3] },
        expected: true,
        description: "Valid BST: [2,1,3]",
      },
      {
        input: { tree: [5, 1, 4, null, null, 3, 6] },
        expected: false,
        description: "Invalid: right child 4 < root 5",
      },
      {
        input: { tree: [1] },
        expected: true,
        description: "Single node",
      },
      {
        input: { tree: [2, 2, 2] },
        expected: false,
        description: "Duplicate values",
      },
      {
        input: { tree: [5, 1, 6, null, null, 4, 7] },
        expected: false,
        description: "Invalid: left child of 6 is 4 (< 5)",
      },
    ],
  },
  {
    id: "dsa-lowest-common-ancestor-bst",
    title: "Lowest Common Ancestor of BST",
    type: "dsa",
    pattern: "binary-search-tree",
    difficulty: "medium",
    companies: ["Meta", "Amazon", "Microsoft", "Google"],
    description: "Find the lowest common ancestor in a binary search tree",
    tags: ["tree", "binary-search-tree", "depth-first-search"],
    estimatedTime: 20,
    problemStatement: `Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given nodes in the BST.

According to the definition of LCA: "The lowest common ancestor is defined between two nodes p and q as the lowest node in T that has both p and q as descendants (where we allow a node to be a descendant of itself)."`,
    examples: [
      {
        input: "root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8",
        output: "6",
        explanation: "The LCA of nodes 2 and 8 is 6.",
      },
      {
        input: "root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4",
        output: "2",
        explanation: "The LCA of nodes 2 and 4 is 2.",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [2, 10^5]",
      "-10^9 <= Node.val <= 10^9",
      "All Node.val are unique",
      "p != q",
      "p and q will exist in the BST",
    ],
    hints: [
      "Use the BST property: left < node < right",
      "If both nodes are smaller, go left",
      "If both nodes are larger, go right",
      "Otherwise, current node is the LCA",
    ],
    starterCode: {
      javascript: `function lowestCommonAncestor(root, p, q) {
  // Write your solution here

}`,
      typescript: `function lowestCommonAncestor(root: TreeNode | null, p: TreeNode | null, q: TreeNode | null): TreeNode | null {
  // Write your solution here

}`,
      python: `def lowestCommonAncestor(root, p, q):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(h)",
      space: "O(1)",
    },
    testCases: [
      {
        input: { tree: [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], p: 2, q: 8 },
        expected: 6,
        description: "LCA of 2 and 8 is 6",
      },
      {
        input: { tree: [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], p: 2, q: 4 },
        expected: 2,
        description: "LCA of 2 and 4 is 2 (ancestor of itself)",
      },
      {
        input: { tree: [2, 1, 3], p: 1, q: 3 },
        expected: 2,
        description: "Simple tree: LCA is root",
      },
      {
        input: { tree: [6, 2, 8, 0, 4, 7, 9], p: 0, q: 4 },
        expected: 2,
        description: "Both nodes in left subtree",
      },
      {
        input: { tree: [6, 2, 8, 0, 4, 7, 9], p: 7, q: 9 },
        expected: 8,
        description: "Both nodes in right subtree",
      },
    ],
  },
  // Note: Duplicate 'dsa-validate-bst' removed - use 'dsa-valid-binary-search-tree' above
  {
    id: "dsa-kth-smallest-bst",
    title: "Kth Smallest Element in BST",
    type: "dsa",
    pattern: "binary-search-tree",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta"],
    description: "Find the kth smallest element in a BST.",
    tags: ["tree", "dfs", "bst"],
    estimatedTime: 20,
    problemStatement: `Given the root of a binary search tree, and an integer k, return the kth smallest value (1-indexed) of all the values of the nodes in the tree.`,
    examples: [
      {
        input: "root = [3,1,4,null,2], k = 1",
        output: "1",
      },
      {
        input: "root = [5,3,6,2,4,null,null,1], k = 3",
        output: "3",
      },
    ],
    constraints: [
      "The number of nodes in the tree is n.",
      "1 <= k <= n <= 10^4",
      "0 <= Node.val <= 10^4",
    ],
    hints: [
      "Inorder traversal of BST gives sorted order",
      "Return the kth element during inorder traversal",
      "Can optimize with counter variable",
    ],
    starterCode: {
      javascript: `function kthSmallest(root, k) {
  // Write your solution here

}`,
      typescript: `function kthSmallest(root: TreeNode | null, k: number): number {
  // Write your solution here

}`,
      python: `def kthSmallest(root, k):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(h + k)",
      space: "O(h)",
    },
    testCases: [
      {
        input: { root: [3, 1, 4, null, 2], k: 1 },
        expected: 1,
        description: "k=1, return smallest",
      },
      {
        input: { root: [5, 3, 6, 2, 4, null, null, 1], k: 3 },
        expected: 3,
        description: "k=3, third smallest",
      },
      {
        input: { root: [1], k: 1 },
        expected: 1,
        description: "Single node",
      },
      {
        input: { root: [2, 1, 3], k: 2 },
        expected: 2,
        description: "Root is kth smallest",
      },
    ],
  },
  {
    id: "dsa-delete-node-bst",
    title: "Delete Node in a BST",
    type: "dsa",
    pattern: "binary-search-tree",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Microsoft"],
    description: "Delete a node from a binary search tree",
    tags: ["tree", "bst", "recursion"],
    estimatedTime: 25,
    problemStatement: `Given a root node reference of a BST and a key, delete the node with the given key in the BST. Return the root node reference (possibly updated) of the BST.

Basically, the deletion can be divided into two stages:
1. Search for a node to remove.
2. If the node is found, delete the node.`,
    examples: [
      {
        input: "root = [5,3,6,2,4,null,7], key = 3",
        output: "[5,4,6,2,null,null,7]",
        explanation: "One valid answer is [5,4,6,2,null,null,7].",
      },
      {
        input: "root = [5,3,6,2,4,null,7], key = 0",
        output: "[5,3,6,2,4,null,7]",
        explanation: "The tree does not contain a node with value = 0.",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in range [0, 10^4]",
      "-10^5 <= Node.val <= 10^5",
      "Each node has a unique value",
      "root is a valid binary search tree",
    ],
    hints: [
      "Handle three cases: leaf node, one child, two children",
      "For two children, find inorder successor (smallest in right subtree)",
      "Replace value with successor, then delete successor",
    ],
    starterCode: {
      javascript: `function deleteNode(root, key) {
  // Write your solution here

}`,
      typescript: `function deleteNode(root: TreeNode | null, key: number): TreeNode | null {
  // Write your solution here

}`,
      python: `def delete_node(root, key):
    # Write your solution here
    pass`,
      java: `class Solution {
    public TreeNode deleteNode(TreeNode root, int key) {
        // Write your solution here
        return null;
    }
}`,
    },
    optimalComplexity: {
      time: "O(h)",
      space: "O(h)",
    },
    testCases: [
      {
        input: { root: [5, 3, 6, 2, 4, null, 7], key: 3 },
        expected: [5, 4, 6, 2, null, null, 7],
        description: "Delete node with two children",
      },
      {
        input: { root: [5, 3, 6, 2, 4, null, 7], key: 0 },
        expected: [5, 3, 6, 2, 4, null, 7],
        description: "Key not found",
      },
    ],
  },
  {
    id: "dsa-convert-sorted-array-bst",
    title: "Convert Sorted Array to Binary Search Tree",
    type: "dsa",
    pattern: "binary-search-tree",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Microsoft", "Apple"],
    description: "Convert sorted array to height-balanced BST",
    tags: ["tree", "bst", "divide-and-conquer", "array"],
    estimatedTime: 20,
    problemStatement: `Given an integer array nums where the elements are sorted in ascending order, convert it to a height-balanced binary search tree.

A height-balanced binary tree is a binary tree in which the depth of the two subtrees of every node never differs by more than one.`,
    examples: [
      {
        input: "nums = [-10,-3,0,5,9]",
        output: "[0,-3,9,-10,null,5]",
        explanation: "One valid BST is [0,-3,9,-10,null,5].",
      },
      {
        input: "nums = [1,3]",
        output: "[3,1] or [1,null,3]",
        explanation: "Either tree is valid.",
      },
    ],
    constraints: [
      "1 <= nums.length <= 10^4",
      "-10^4 <= nums[i] <= 10^4",
      "nums is sorted in strictly increasing order",
    ],
    hints: [
      "Choose middle element as root for balance",
      "Recursively build left subtree from left half",
      "Recursively build right subtree from right half",
    ],
    starterCode: {
      javascript: `function sortedArrayToBST(nums) {
  // Write your solution here

}`,
      typescript: `function sortedArrayToBST(nums: number[]): TreeNode | null {
  // Write your solution here

}`,
      python: `def sorted_array_to_bst(nums):
    # Write your solution here
    pass`,
      java: `class Solution {
    public TreeNode sortedArrayToBST(int[] nums) {
        // Write your solution here
        return null;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(log n)",
    },
    testCases: [
      {
        input: { nums: [-10, -3, 0, 5, 9] },
        expected: "valid BST",
        description: "Build balanced BST",
      },
      { input: { nums: [1, 3] }, expected: "valid BST", description: "Two elements" },
    ],
  },
  {
    id: "dsa-two-sum-bst",
    title: "Two Sum IV - Input is a BST",
    type: "dsa",
    pattern: "binary-search-tree",
    difficulty: "easy",
    companies: ["Amazon", "Meta", "Google"],
    description: "Find if two nodes in BST sum to target value",
    tags: ["tree", "bst", "two-pointers", "hash-table"],
    estimatedTime: 20,
    problemStatement: `Given the root of a binary search tree and an integer k, return true if there exist two elements in the BST such that their sum is equal to k, or false otherwise.`,
    examples: [
      {
        input: "root = [5,3,6,2,4,null,7], k = 9",
        output: "true",
        explanation: "2 + 7 = 9 or 3 + 6 = 9",
      },
      {
        input: "root = [5,3,6,2,4,null,7], k = 28",
        output: "false",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in range [1, 10^4]",
      "-10^4 <= Node.val <= 10^4",
      "root is guaranteed to be a valid binary search tree",
      "-10^5 <= k <= 10^5",
    ],
    hints: [
      "Use inorder traversal to get sorted array, then use two pointers",
      "Alternative: use a hash set during traversal",
      "For each node, check if (k - node.val) exists in the tree",
    ],
    starterCode: {
      javascript: `function findTarget(root, k) {
  // Write your solution here

}`,
      typescript: `function findTarget(root: TreeNode | null, k: number): boolean {
  // Write your solution here

}`,
      python: `def find_target(root, k):
    # Write your solution here
    pass`,
      java: `class Solution {
    public boolean findTarget(TreeNode root, int k) {
        // Write your solution here
        return false;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(n)",
    },
    testCases: [
      {
        input: { root: [5, 3, 6, 2, 4, null, 7], k: 9 },
        expected: true,
        description: "Target exists",
      },
      {
        input: { root: [5, 3, 6, 2, 4, null, 7], k: 28 },
        expected: false,
        description: "Target does not exist",
      },
    ],
  },
  {
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
  },
  {
    id: "dsa-range-sum-bst",
    title: "Range Sum of BST",
    type: "dsa",
    pattern: "binary-search-tree",
    difficulty: "easy",
    companies: ["Meta", "Amazon", "Google"],
    description: "Calculate sum of values within a range in BST",
    tags: ["tree", "bst", "dfs"],
    estimatedTime: 15,
    problemStatement: `Given the root node of a binary search tree and two integers low and high, return the sum of values of all nodes with a value in the inclusive range [low, high].`,
    examples: [
      {
        input: "root = [10,5,15,3,7,null,18], low = 7, high = 15",
        output: "32",
        explanation: "Nodes 7, 10, and 15 are in range [7, 15]. 7 + 10 + 15 = 32.",
      },
      {
        input: "root = [10,5,15,3,7,13,18,1,null,6], low = 6, high = 10",
        output: "23",
        explanation: "Nodes 6, 7, and 10 are in range [6, 10]. 6 + 7 + 10 = 23.",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in range [1, 2 * 10^4]",
      "1 <= Node.val <= 10^5",
      "1 <= low <= high <= 10^5",
      "All Node.val are unique",
    ],
    hints: [
      "Use BST property to prune search space",
      "If node value < low, only search right subtree",
      "If node value > high, only search left subtree",
    ],
    starterCode: {
      javascript: `function rangeSumBST(root, low, high) {
  // Write your solution here

}`,
      typescript: `function rangeSumBST(root: TreeNode | null, low: number, high: number): number {
  // Write your solution here

}`,
      python: `def range_sum_bst(root, low, high):
    # Write your solution here
    pass`,
      java: `class Solution {
    public int rangeSumBST(TreeNode root, int low, int high) {
        // Write your solution here
        return 0;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(h)",
    },
    testCases: [
      {
        input: { root: [10, 5, 15, 3, 7, null, 18], low: 7, high: 15 },
        expected: 32,
        description: "Standard range",
      },
      {
        input: { root: [10, 5, 15, 3, 7, 13, 18, 1, null, 6], low: 6, high: 10 },
        expected: 23,
        description: "Another range",
      },
    ],
  },
  {
    id: "dsa-serialize-deserialize-bst",
    title: "Serialize and Deserialize BST",
    type: "dsa",
    pattern: "binary-search-tree",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Design algorithm to serialize and deserialize a BST",
    tags: ["tree", "bst", "design", "string"],
    estimatedTime: 30,
    problemStatement: `Serialization is converting a data structure or object into a sequence of bits so that it can be stored in a file or memory buffer, or transmitted across a network connection link to be reconstructed later in the same or another computer environment.

Design an algorithm to serialize and deserialize a binary search tree. There is no restriction on how your serialization/deserialization algorithm should work. You need to ensure that a binary search tree can be serialized to a string, and this string can be deserialized to the original tree structure.

The encoded string should be as compact as possible.`,
    examples: [
      {
        input: "root = [2,1,3]",
        output: "[2,1,3]",
      },
      {
        input: "root = []",
        output: "[]",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in range [0, 10^4]",
      "0 <= Node.val <= 10^4",
      "The input tree is guaranteed to be a binary search tree",
    ],
    hints: [
      "Preorder traversal uniquely defines a BST (no need for null markers)",
      "Use BST property during deserialization",
      "Pass bounds (min, max) to validate placement during rebuild",
    ],
    starterCode: {
      javascript: `class Codec {
  serialize(root) {
    // Serialize BST to string
  }

  deserialize(data) {
    // Deserialize string to BST
  }
}`,
      typescript: `class Codec {
  serialize(root: TreeNode | null): string {
    // Serialize BST to string
  }

  deserialize(data: string): TreeNode | null {
    // Deserialize string to BST
  }
}`,
      python: `class Codec:
    def serialize(self, root):
        # Serialize BST to string
        pass

    def deserialize(self, data):
        # Deserialize string to BST
        pass`,
      java: `public class Codec {
    public String serialize(TreeNode root) {
        // Serialize BST to string
        return "";
    }

    public TreeNode deserialize(String data) {
        // Deserialize string to BST
        return null;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(n)",
    },
    testCases: [
      {
        input: { root: [2, 1, 3] },
        expected: [2, 1, 3],
        description: "Simple BST",
      },
      {
        input: { root: [] },
        expected: [],
        description: "Empty tree",
      },
      {
        input: { root: [5, 3, 7, 2, 4, 6, 8] },
        expected: [5, 3, 7, 2, 4, 6, 8],
        description: "Complete BST",
      },
      {
        input: { root: [1, null, 2, null, 3] },
        expected: [1, null, 2, null, 3],
        description: "Right-skewed BST",
      },
    ],
  },
]

export default binarySearchTreeScenarios
