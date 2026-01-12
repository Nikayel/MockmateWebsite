/**
 * Trees DSA Scenarios
 * Pattern: trees
 */

import type { DSAScenario } from "../types"

export const treesScenarios: DSAScenario[] = [
  // ==================== ESSENTIAL EASY PROBLEMS ====================
  {
    id: "dsa-invert-binary-tree",
    title: "Invert Binary Tree",
    type: "dsa",
    pattern: "trees",
    difficulty: "easy",
    companies: ["Google", "Amazon", "Meta", "Apple", "Microsoft"],
    description: "Invert a binary tree (mirror it).",
    tags: ["tree", "dfs", "bfs", "recursion"],
    estimatedTime: 10,
    problemStatement: `Given the root of a binary tree, invert the tree, and return its root.

Inverting a binary tree means swapping the left and right children of all nodes in the tree.`,
    examples: [
      {
        input: "root = [4,2,7,1,3,6,9]",
        output: "[4,7,2,9,6,3,1]",
        explanation: "The tree is mirrored around its center.",
      },
      {
        input: "root = [2,1,3]",
        output: "[2,3,1]",
      },
      {
        input: "root = []",
        output: "[]",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [0, 100].",
      "-100 <= Node.val <= 100",
    ],
    hints: [
      "Recursively swap left and right children",
      "Base case: if node is null, return null",
      "Can also solve iteratively with BFS or stack",
    ],
    starterCode: {
      javascript: `function invertTree(root) {
  // Swap left and right children recursively
}`,
      typescript: `function invertTree(root: TreeNode | null): TreeNode | null {
  // Swap left and right children recursively
}`,
      python: `def invertTree(root: Optional[TreeNode]) -> Optional[TreeNode]:
    # Swap left and right children recursively
    pass`,
      java: `class Solution {
    public TreeNode invertTree(TreeNode root) {
        // Swap left and right children recursively
        return null;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(h) where h is height",
    },
    testCases: [
      {
        input: { root: [4, 2, 7, 1, 3, 6, 9] },
        expected: [4, 7, 2, 9, 6, 3, 1],
        description: "Standard tree inversion",
      },
      {
        input: { root: [2, 1, 3] },
        expected: [2, 3, 1],
        description: "Small tree",
      },
      {
        input: { root: [] },
        expected: [],
        description: "Empty tree",
      },
    ],
  },

  {
    id: "dsa-same-tree",
    title: "Same Tree",
    type: "dsa",
    pattern: "trees",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    description: "Check if two binary trees are structurally identical.",
    tags: ["tree", "dfs", "bfs", "recursion"],
    estimatedTime: 10,
    problemStatement: `Given the roots of two binary trees p and q, write a function to check if they are the same or not.

Two binary trees are considered the same if they are structurally identical, and the nodes have the same value.`,
    examples: [
      {
        input: "p = [1,2,3], q = [1,2,3]",
        output: "true",
      },
      {
        input: "p = [1,2], q = [1,null,2]",
        output: "false",
      },
      {
        input: "p = [1,2,1], q = [1,1,2]",
        output: "false",
      },
    ],
    constraints: [
      "The number of nodes in both trees is in the range [0, 100].",
      "-10^4 <= Node.val <= 10^4",
    ],
    hints: [
      "Compare nodes recursively: value, left subtree, right subtree",
      "Base case: both null = true, one null = false",
      "Two nodes are same if values match AND subtrees match",
    ],
    starterCode: {
      javascript: `function isSameTree(p, q) {
  // Compare trees recursively
}`,
      typescript: `function isSameTree(p: TreeNode | null, q: TreeNode | null): boolean {
  // Compare trees recursively
}`,
      python: `def isSameTree(p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
    # Compare trees recursively
    pass`,
      java: `class Solution {
    public boolean isSameTree(TreeNode p, TreeNode q) {
        // Compare trees recursively
        return false;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(h) where h is height",
    },
    testCases: [
      {
        input: { p: [1, 2, 3], q: [1, 2, 3] },
        expected: true,
        description: "Identical trees",
      },
      {
        input: { p: [1, 2], q: [1, null, 2] },
        expected: false,
        description: "Different structure",
      },
      {
        input: { p: [1, 2, 1], q: [1, 1, 2] },
        expected: false,
        description: "Different values",
      },
    ],
  },

  {
    id: "dsa-maximum-depth-binary-tree",
    title: "Maximum Depth of Binary Tree",
    type: "dsa",
    pattern: "trees",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Meta", "Apple", "Microsoft"],
    description: "Find the maximum depth of a binary tree.",
    tags: ["tree", "dfs", "bfs", "recursion"],
    estimatedTime: 10,
    problemStatement: `Given the root of a binary tree, return its maximum depth.

A binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.`,
    examples: [
      {
        input: "root = [3,9,20,null,null,15,7]",
        output: "3",
      },
      {
        input: "root = [1,null,2]",
        output: "2",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [0, 10^4].",
      "-100 <= Node.val <= 100",
    ],
    hints: [
      "Depth = 1 + max(left_depth, right_depth)",
      "Base case: null node has depth 0",
      "Can solve with BFS counting levels too",
    ],
    starterCode: {
      javascript: `function maxDepth(root) {
  // Find max depth recursively
}`,
      typescript: `function maxDepth(root: TreeNode | null): number {
  // Find max depth recursively
}`,
      python: `def maxDepth(root: Optional[TreeNode]) -> int:
    # Find max depth recursively
    pass`,
      java: `class Solution {
    public int maxDepth(TreeNode root) {
        // Find max depth recursively
        return 0;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(h) where h is height",
    },
    testCases: [
      {
        input: { root: [3, 9, 20, null, null, 15, 7] },
        expected: 3,
        description: "Standard tree",
      },
      {
        input: { root: [1, null, 2] },
        expected: 2,
        description: "Skewed tree",
      },
      {
        input: { root: [] },
        expected: 0,
        description: "Empty tree",
      },
    ],
  },

  {
    id: "dsa-symmetric-tree",
    title: "Symmetric Tree",
    type: "dsa",
    pattern: "trees",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    description: "Check if a binary tree is a mirror of itself.",
    tags: ["tree", "dfs", "bfs", "recursion"],
    estimatedTime: 15,
    problemStatement: `Given the root of a binary tree, check whether it is a mirror of itself (i.e., symmetric around its center).`,
    examples: [
      {
        input: "root = [1,2,2,3,4,4,3]",
        output: "true",
      },
      {
        input: "root = [1,2,2,null,3,null,3]",
        output: "false",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [1, 1000].",
      "-100 <= Node.val <= 100",
    ],
    hints: [
      "Compare left subtree with right subtree (mirrored)",
      "Two trees are mirrors if: roots equal, left1 mirrors right2, right1 mirrors left2",
      "Can solve iteratively with queue comparing pairs",
    ],
    starterCode: {
      javascript: `function isSymmetric(root) {
  // Check if tree is symmetric
}`,
      typescript: `function isSymmetric(root: TreeNode | null): boolean {
  // Check if tree is symmetric
}`,
      python: `def isSymmetric(root: Optional[TreeNode]) -> bool:
    # Check if tree is symmetric
    pass`,
      java: `class Solution {
    public boolean isSymmetric(TreeNode root) {
        // Check if tree is symmetric
        return false;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(h) where h is height",
    },
    testCases: [
      {
        input: { root: [1, 2, 2, 3, 4, 4, 3] },
        expected: true,
        description: "Symmetric tree",
      },
      {
        input: { root: [1, 2, 2, null, 3, null, 3] },
        expected: false,
        description: "Not symmetric",
      },
      {
        input: { root: [1] },
        expected: true,
        description: "Single node is symmetric",
      },
    ],
  },

  {
    id: "dsa-subtree-of-another-tree",
    title: "Subtree of Another Tree",
    type: "dsa",
    pattern: "trees",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Check if a tree is a subtree of another tree.",
    tags: ["tree", "dfs", "recursion", "string-matching"],
    estimatedTime: 20,
    problemStatement: `Given the roots of two binary trees root and subRoot, return true if there is a subtree of root with the same structure and node values of subRoot and false otherwise.

A subtree of a binary tree tree is a tree that consists of a node in tree and all of this node's descendants.`,
    examples: [
      {
        input: "root = [3,4,5,1,2], subRoot = [4,1,2]",
        output: "true",
      },
      {
        input: "root = [3,4,5,1,2,null,null,null,null,0], subRoot = [4,1,2]",
        output: "false",
      },
    ],
    constraints: [
      "The number of nodes in root is in the range [1, 2000].",
      "The number of nodes in subRoot is in the range [1, 1000].",
      "-10^4 <= root.val <= 10^4",
      "-10^4 <= subRoot.val <= 10^4",
    ],
    hints: [
      "For each node in root, check if it matches subRoot using isSameTree",
      "Recursively check: current matches OR left subtree contains OR right subtree contains",
      "Can also serialize both trees and use string matching",
    ],
    starterCode: {
      javascript: `function isSubtree(root, subRoot) {
  // Check if subRoot is a subtree of root
}`,
      typescript: `function isSubtree(root: TreeNode | null, subRoot: TreeNode | null): boolean {
  // Check if subRoot is a subtree of root
}`,
      python: `def isSubtree(root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
    # Check if subRoot is a subtree of root
    pass`,
      java: `class Solution {
    public boolean isSubtree(TreeNode root, TreeNode subRoot) {
        // Check if subRoot is a subtree of root
        return false;
    }
}`,
    },
    optimalComplexity: {
      time: "O(m * n)",
      space: "O(h) where h is height",
    },
    testCases: [
      {
        input: { root: [3, 4, 5, 1, 2], subRoot: [4, 1, 2] },
        expected: true,
        description: "Subtree exists",
      },
      {
        input: { root: [3, 4, 5, 1, 2, null, null, null, null, 0], subRoot: [4, 1, 2] },
        expected: false,
        description: "Not exact match due to extra node",
      },
    ],
  },

  {
    id: "dsa-balanced-binary-tree",
    title: "Balanced Binary Tree",
    type: "dsa",
    pattern: "trees",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Meta", "Apple"],
    description: "Check if a binary tree is height-balanced.",
    tags: ["tree", "dfs", "recursion"],
    estimatedTime: 15,
    problemStatement: `Given a binary tree, determine if it is height-balanced.

A height-balanced binary tree is a binary tree in which the depth of the two subtrees of every node never differs by more than one.`,
    examples: [
      {
        input: "root = [3,9,20,null,null,15,7]",
        output: "true",
      },
      {
        input: "root = [1,2,2,3,3,null,null,4,4]",
        output: "false",
      },
      {
        input: "root = []",
        output: "true",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [0, 5000].",
      "-10^4 <= Node.val <= 10^4",
    ],
    hints: [
      "For each node: |left_height - right_height| <= 1",
      "AND both subtrees must also be balanced",
      "Return -1 to indicate unbalanced, otherwise return height",
    ],
    starterCode: {
      javascript: `function isBalanced(root) {
  // Check if tree is height-balanced
}`,
      typescript: `function isBalanced(root: TreeNode | null): boolean {
  // Check if tree is height-balanced
}`,
      python: `def isBalanced(root: Optional[TreeNode]) -> bool:
    # Check if tree is height-balanced
    pass`,
      java: `class Solution {
    public boolean isBalanced(TreeNode root) {
        // Check if tree is height-balanced
        return false;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(h) where h is height",
    },
    testCases: [
      {
        input: { root: [3, 9, 20, null, null, 15, 7] },
        expected: true,
        description: "Balanced tree",
      },
      {
        input: { root: [1, 2, 2, 3, 3, null, null, 4, 4] },
        expected: false,
        description: "Unbalanced tree",
      },
      {
        input: { root: [] },
        expected: true,
        description: "Empty tree is balanced",
      },
    ],
  },

  // ==================== MEDIUM PROBLEMS ====================
  {
    id: "dsa-binary-tree-right-side-view",
    title: "Binary Tree Right Side View",
    type: "dsa",
    pattern: "trees",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Return the values of nodes visible from the right side.",
    tags: ["tree", "bfs", "dfs"],
    estimatedTime: 20,
    problemStatement: `Given the root of a binary tree, imagine yourself standing on the right side of it, return the values of the nodes you can see ordered from top to bottom.`,
    examples: [
      {
        input: "root = [1,2,3,null,5,null,4]",
        output: "[1,3,4]",
      },
      {
        input: "root = [1,null,3]",
        output: "[1,3]",
      },
      {
        input: "root = []",
        output: "[]",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [0, 100].",
      "-100 <= Node.val <= 100",
    ],
    hints: [
      "Use BFS, take last node of each level",
      "Or use DFS, visit right child first, track depth",
      "First node at each depth (going right first) is visible",
    ],
    starterCode: {
      javascript: `function rightSideView(root) {
  // Return nodes visible from right side
}`,
      typescript: `function rightSideView(root: TreeNode | null): number[] {
  // Return nodes visible from right side
}`,
      python: `def rightSideView(root: Optional[TreeNode]) -> list[int]:
    # Return nodes visible from right side
    pass`,
      java: `class Solution {
    public List<Integer> rightSideView(TreeNode root) {
        // Return nodes visible from right side
        return new ArrayList<>();
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(h) where h is height",
    },
    testCases: [
      {
        input: { root: [1, 2, 3, null, 5, null, 4] },
        expected: [1, 3, 4],
        description: "Standard tree",
      },
      {
        input: { root: [1, null, 3] },
        expected: [1, 3],
        description: "Right-skewed tree",
      },
      {
        input: { root: [] },
        expected: [],
        description: "Empty tree",
      },
    ],
  },

  {
    id: "dsa-count-good-nodes",
    title: "Count Good Nodes in Binary Tree",
    type: "dsa",
    pattern: "trees",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Microsoft"],
    description: "Count nodes where the path from root has no greater value.",
    tags: ["tree", "dfs", "recursion"],
    estimatedTime: 20,
    problemStatement: `Given a binary tree root, a node X in the tree is named good if in the path from root to X there are no nodes with a value greater than X.

Return the number of good nodes in the binary tree.`,
    examples: [
      {
        input: "root = [3,1,4,3,null,1,5]",
        output: "4",
        explanation: "Root 3, node 4 (3<4), node 3 (3>=3), node 5 (3<4<5)",
      },
      {
        input: "root = [3,3,null,4,2]",
        output: "3",
        explanation: "Root 3, node 3, node 4",
      },
      {
        input: "root = [1]",
        output: "1",
        explanation: "Root is always good",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [1, 10^5].",
      "-10^4 <= Node.val <= 10^4",
    ],
    hints: [
      "DFS while tracking max value seen so far",
      "If current node >= max, it is good, update max",
      "Pass max to children",
    ],
    starterCode: {
      javascript: `function goodNodes(root) {
  // Count good nodes using DFS
}`,
      typescript: `function goodNodes(root: TreeNode): number {
  // Count good nodes using DFS
}`,
      python: `def goodNodes(root: TreeNode) -> int:
    # Count good nodes using DFS
    pass`,
      java: `class Solution {
    public int goodNodes(TreeNode root) {
        // Count good nodes using DFS
        return 0;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(h) where h is height",
    },
    testCases: [
      {
        input: { root: [3, 1, 4, 3, null, 1, 5] },
        expected: 4,
        description: "Multiple good nodes",
      },
      {
        input: { root: [3, 3, null, 4, 2] },
        expected: 3,
        description: "Left-heavy tree",
      },
      {
        input: { root: [1] },
        expected: 1,
        description: "Single node",
      },
    ],
  },

  {
    id: "dsa-construct-binary-tree-preorder-inorder",
    title: "Construct Binary Tree from Preorder and Inorder Traversal",
    type: "dsa",
    pattern: "trees",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Build a binary tree from preorder and inorder traversals.",
    tags: ["tree", "recursion", "divide-and-conquer", "hash-table"],
    estimatedTime: 30,
    problemStatement: `Given two integer arrays preorder and inorder where preorder is the preorder traversal of a binary tree and inorder is the inorder traversal of the same tree, construct and return the binary tree.`,
    examples: [
      {
        input: "preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]",
        output: "[3,9,20,null,null,15,7]",
      },
      {
        input: "preorder = [-1], inorder = [-1]",
        output: "[-1]",
      },
    ],
    constraints: [
      "1 <= preorder.length <= 3000",
      "inorder.length == preorder.length",
      "-3000 <= preorder[i], inorder[i] <= 3000",
      "preorder and inorder consist of unique values.",
      "Each value of inorder also appears in preorder.",
    ],
    hints: [
      "First element of preorder is root",
      "Find root in inorder to split left/right subtrees",
      "Use hashmap for O(1) index lookup in inorder",
      "Recursively build left and right subtrees",
    ],
    starterCode: {
      javascript: `function buildTree(preorder, inorder) {
  // Build tree from traversals
}`,
      typescript: `function buildTree(preorder: number[], inorder: number[]): TreeNode | null {
  // Build tree from traversals
}`,
      python: `def buildTree(preorder: list[int], inorder: list[int]) -> Optional[TreeNode]:
    # Build tree from traversals
    pass`,
      java: `class Solution {
    public TreeNode buildTree(int[] preorder, int[] inorder) {
        // Build tree from traversals
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
        input: { preorder: [3, 9, 20, 15, 7], inorder: [9, 3, 15, 20, 7] },
        expected: [3, 9, 20, null, null, 15, 7],
        description: "Standard tree construction",
      },
      {
        input: { preorder: [-1], inorder: [-1] },
        expected: [-1],
        description: "Single node",
      },
    ],
  },

  // ==================== EXISTING PROBLEMS BELOW ====================
  {
    id: "dsa-binary-tree-inorder",
    title: "Binary Tree Inorder Traversal",
    type: "dsa",
    pattern: "trees",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Meta"],
    description: "Return the inorder traversal of a binary tree's nodes' values.",
    tags: ["tree", "dfs", "stack", "recursion"],
    estimatedTime: 15,
    problemStatement: `Given the root of a binary tree, return the inorder traversal of its nodes' values.`,
    examples: [
      {
        input: "root = [1,null,2,3]",
        output: "[1,3,2]",
      },
      {
        input: "root = []",
        output: "[]",
      },
      {
        input: "root = [1]",
        output: "[1]",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [0, 100].",
      "-100 <= Node.val <= 100",
    ],
    hints: [
      "Inorder: left -> root -> right",
      "Can solve recursively or iteratively with stack",
      "Morris traversal for O(1) space",
    ],
    starterCode: {
      javascript: `function inorderTraversal(root) {
  // Write your solution here

}`,
      typescript: `function inorderTraversal(root: TreeNode | null): number[] {
  // Write your solution here

}`,
      python: `def inorderTraversal(root):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(n) recursive, O(1) Morris",
    },
    testCases: [
      {
        input: { root: [1, null, 2, 3] },
        expected: [1, 3, 2],
        description: "Standard tree",
      },
      {
        input: { root: [] },
        expected: [],
        description: "Empty tree",
      },
      {
        input: { root: [1] },
        expected: [1],
        description: "Single node",
      },
      {
        input: { root: [1, 2, 3, 4, 5] },
        expected: [4, 2, 5, 1, 3],
        description: "Complete tree",
      },
    ],
  },

  {
    id: "dsa-serialize-deserialize-tree",
    title: "Serialize and Deserialize Binary Tree",
    type: "dsa",
    pattern: "trees",
    difficulty: "hard",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Design an algorithm to serialize and deserialize a binary tree.",
    tags: ["tree", "dfs", "bfs", "design"],
    estimatedTime: 35,
    problemStatement: `Serialization is the process of converting a data structure or object into a sequence of bits so that it can be stored in a file or memory buffer, or transmitted across a network connection link to be reconstructed later in the same or another computer environment.

Design an algorithm to serialize and deserialize a binary tree. There is no restriction on how your serialization/deserialization algorithm should work. You just need to ensure that a binary tree can be serialized to a string and this string can be deserialized to the original tree structure.`,
    examples: [
      {
        input: "root = [1,2,3,null,null,4,5]",
        output: "[1,2,3,null,null,4,5]",
      },
      {
        input: "root = []",
        output: "[]",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [0, 10^4].",
      "-1000 <= Node.val <= 1000",
    ],
    hints: [
      "Use preorder traversal with null markers",
      "Serialize: visit node, left, right (record nulls)",
      "Deserialize: recursively build tree from serialized string",
    ],
    starterCode: {
      javascript: `class Codec {
  serialize(root) {
    // Encode tree to string

  }

  deserialize(data) {
    // Decode string to tree

  }
}`,
      typescript: `class Codec {
  serialize(root: TreeNode | null): string {
    // Encode tree to string

  }

  deserialize(data: string): TreeNode | null {
    // Decode string to tree

  }
}`,
      python: `class Codec:
    def serialize(self, root):
        # Encode tree to string
        pass

    def deserialize(self, data):
        # Decode string to tree
        pass`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(n)",
    },
    testCases: [
      {
        input: { root: [1, 2, 3, null, null, 4, 5] },
        expected: [1, 2, 3, null, null, 4, 5],
        description: "Standard binary tree",
      },
      {
        input: { root: [] },
        expected: [],
        description: "Empty tree",
      },
      {
        input: { root: [1] },
        expected: [1],
        description: "Single node",
      },
      {
        input: { root: [1, 2] },
        expected: [1, 2],
        description: "Left child only",
      },
    ],
  },

  {
    id: "dsa-binary-tree-max-path-sum",
    title: "Binary Tree Maximum Path Sum",
    type: "dsa",
    pattern: "trees",
    difficulty: "hard",
    companies: ["Amazon", "Google", "Meta"],
    description: "Find the maximum path sum in a binary tree.",
    tags: ["tree", "dfs", "recursion"],
    estimatedTime: 30,
    problemStatement: `A path in a binary tree is a sequence of nodes where each pair of adjacent nodes has an edge. A node can only appear once in the sequence. The path sum is the sum of the node values. Return the maximum path sum of any non-empty path.`,
    examples: [
      {
        input: "root = [1,2,3]",
        output: "6",
        explanation: "Path is 2->1->3",
      },
      {
        input: "root = [-10,9,20,null,null,15,7]",
        output: "42",
        explanation: "Path is 15->20->7",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [1, 3 * 10^4].",
      "-1000 <= Node.val <= 1000",
    ],
    hints: [
      "For each node, calculate max path through that node",
      "Max path = node.val + max(left_path, 0) + max(right_path, 0)",
      "Return max single path to parent: node.val + max(left, right, 0)",
    ],
    starterCode: {
      javascript: `function binary_tree_max_path_sum() {
  // Your code here
}`,
      python: `def binary_tree_max_path_sum():
    # Your code here
    pass`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(n)",
    },
    testCases: [
      {
        input: { root: [1, 2, 3] },
        expected: 6,
        description: "Path 2->1->3 = 6",
      },
      {
        input: { root: [-10, 9, 20, null, null, 15, 7] },
        expected: 42,
        description: "Path 15->20->7 = 42",
      },
      {
        input: { root: [1] },
        expected: 1,
        description: "Single node",
      },
      {
        input: { root: [-3] },
        expected: -3,
        description: "Single negative node",
      },
      {
        input: { root: [2, -1] },
        expected: 2,
        description: "Best path is just root",
      },
    ],
  },

  {
    id: "dsa-lowest-common-ancestor-binary-tree",
    title: "Lowest Common Ancestor of a Binary Tree",
    type: "dsa",
    pattern: "trees",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    description: "Find the lowest common ancestor of two nodes in a binary tree",
    tags: ["tree", "dfs", "recursion"],
    estimatedTime: 25,
    problemStatement: `Given a binary tree, find the lowest common ancestor (LCA) of two given nodes in the tree.

According to the definition of LCA on Wikipedia: "The lowest common ancestor is defined between two nodes p and q as the lowest node in T that has both p and q as descendants (where we allow a node to be a descendant of itself)."`,
    examples: [
      {
        input: "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1",
        output: "3",
        explanation: "The LCA of nodes 5 and 1 is 3.",
      },
      {
        input: "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 4",
        output: "5",
        explanation: "The LCA of nodes 5 and 4 is 5, since a node can be a descendant of itself.",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [2, 10^5].",
      "-10^9 <= Node.val <= 10^9",
      "All Node.val are unique.",
      "p != q",
      "p and q will exist in the tree.",
    ],
    hints: [
      "Recursively search left and right subtrees for p and q",
      "If both left and right return non-null, current node is LCA",
      "If one side returns null, LCA is on the other side",
      "Base case: if current node is p or q, return it",
    ],
    starterCode: {
      javascript: `function lowestCommonAncestor(root, p, q) {
  // Find LCA using recursion
}`,
      typescript: `function lowestCommonAncestor(root: TreeNode | null, p: TreeNode, q: TreeNode): TreeNode | null {
  // Find LCA using recursion
}`,
      python: `def lowestCommonAncestor(root: TreeNode, p: TreeNode, q: TreeNode) -> TreeNode:
    # Find LCA using recursion
    pass`,
      java: `class Solution {
    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        // Find LCA using recursion
        return null;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(h) where h is height",
    },
    testCases: [
      {
        input: { root: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 5, q: 1 },
        expected: 3,
        description: "LCA is root",
      },
      {
        input: { root: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 5, q: 4 },
        expected: 5,
        description: "LCA is one of the nodes",
      },
      {
        input: { root: [1, 2], p: 1, q: 2 },
        expected: 1,
        description: "Two node tree",
      },
    ],
  },

  {
    id: "dsa-binary-tree-level-order",
    title: "Binary Tree Level Order Traversal",
    type: "dsa",
    pattern: "trees",
    difficulty: "medium",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: "Return the level order traversal of a binary tree",
    tags: ["tree", "bfs", "queue"],
    estimatedTime: 20,
    problemStatement: `Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).`,
    examples: [
      {
        input: "root = [3,9,20,null,null,15,7]",
        output: "[[3],[9,20],[15,7]]",
      },
      {
        input: "root = [1]",
        output: "[[1]]",
      },
      {
        input: "root = []",
        output: "[]",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [0, 2000].",
      "-1000 <= Node.val <= 1000",
    ],
    hints: [
      "Use BFS with a queue",
      "Process all nodes at current level before moving to next",
      "Track level size before processing to know when level ends",
    ],
    starterCode: {
      javascript: `function levelOrder(root) {
  // Use BFS to traverse level by level
}`,
      typescript: `function levelOrder(root: TreeNode | null): number[][] {
  // Use BFS to traverse level by level
}`,
      python: `def levelOrder(root: Optional[TreeNode]) -> list[list[int]]:
    # Use BFS to traverse level by level
    pass`,
      java: `class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        // Use BFS to traverse level by level
        return new ArrayList<>();
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(n)",
    },
    testCases: [
      {
        input: { root: [3, 9, 20, null, null, 15, 7] },
        expected: [[3], [9, 20], [15, 7]],
        description: "Standard tree",
      },
      {
        input: { root: [1] },
        expected: [[1]],
        description: "Single node",
      },
      {
        input: { root: [] },
        expected: [],
        description: "Empty tree",
      },
    ],
  },

  {
    id: "dsa-diameter-of-binary-tree",
    title: "Diameter of Binary Tree",
    type: "dsa",
    pattern: "trees",
    difficulty: "easy",
    companies: ["Amazon", "Google", "Meta", "Apple"],
    description: "Find the diameter (longest path) of a binary tree",
    tags: ["tree", "dfs", "recursion"],
    estimatedTime: 20,
    problemStatement: `Given the root of a binary tree, return the length of the diameter of the tree.

The diameter of a binary tree is the length of the longest path between any two nodes in a tree. This path may or may not pass through the root.

The length of a path between two nodes is represented by the number of edges between them.`,
    examples: [
      {
        input: "root = [1,2,3,4,5]",
        output: "3",
        explanation: "The longest path is [4,2,1,3] or [5,2,1,3] with 3 edges.",
      },
      {
        input: "root = [1,2]",
        output: "1",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [1, 10^4].",
      "-100 <= Node.val <= 100",
    ],
    hints: [
      "Diameter through a node = left_height + right_height",
      "Use DFS to compute height and update max diameter",
      "Height of a node = 1 + max(left_height, right_height)",
    ],
    starterCode: {
      javascript: `function diameterOfBinaryTree(root) {
  // Find diameter using DFS
}`,
      typescript: `function diameterOfBinaryTree(root: TreeNode | null): number {
  // Find diameter using DFS
}`,
      python: `def diameterOfBinaryTree(root: Optional[TreeNode]) -> int:
    # Find diameter using DFS
    pass`,
      java: `class Solution {
    public int diameterOfBinaryTree(TreeNode root) {
        // Find diameter using DFS
        return 0;
    }
}`,
    },
    optimalComplexity: {
      time: "O(n)",
      space: "O(h) where h is height",
    },
    testCases: [
      {
        input: { root: [1, 2, 3, 4, 5] },
        expected: 3,
        description: "Diameter through root",
      },
      {
        input: { root: [1, 2] },
        expected: 1,
        description: "Two nodes",
      },
      {
        input: { root: [1] },
        expected: 0,
        description: "Single node - no edges",
      },
    ],
  },
  // ==================== NEW HIGH-VALUE ADDITIONS ====================
  {
    id: "dsa-path-sum",
    title: "Path Sum",
    type: "dsa",
    pattern: "trees",
    difficulty: "easy",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Check if tree has root-to-leaf path with given sum",
    tags: ["binary-tree", "dfs", "recursion"],
    estimatedTime: 15,
    problemStatement: `Given the root of a binary tree and an integer targetSum, return true if the tree has a root-to-leaf path such that adding up all the values along the path equals targetSum.

A leaf is a node with no children.`,
    examples: [
      { input: "root = [5,4,8,11,null,13,4,7,2,null,null,null,1], targetSum = 22", output: "true", explanation: "Path 5 → 4 → 11 → 2 = 22" },
      { input: "root = [1,2,3], targetSum = 5", output: "false" },
      { input: "root = [], targetSum = 0", output: "false" },
    ],
    constraints: ["The number of nodes in the tree is in the range [0, 5000].", "-1000 <= Node.val <= 1000", "-1000 <= targetSum <= 1000"],
    hints: ["Use DFS, subtracting node value from targetSum", "At leaf, check if remaining sum equals node value", "Handle empty tree case"],
    starterCode: {
      javascript: `function hasPathSum(root, targetSum) {\n  // Write your solution here\n\n}`,
      typescript: `function hasPathSum(root: TreeNode | null, targetSum: number): boolean {\n  // Write your solution here\n\n}`,
      python: `def hasPathSum(root, targetSum):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(h)" },
    testCases: [
      { input: { root: [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1], targetSum: 22 }, expected: true, description: "Valid path exists" },
      { input: { root: [1, 2, 3], targetSum: 5 }, expected: false, description: "No valid path" },
      { input: { root: [], targetSum: 0 }, expected: false, description: "Empty tree" },
    ],
  },
  {
    id: "dsa-path-sum-ii",
    title: "Path Sum II",
    type: "dsa",
    pattern: "trees",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Find all root-to-leaf paths with given sum",
    tags: ["binary-tree", "dfs", "backtracking"],
    estimatedTime: 25,
    problemStatement: `Given the root of a binary tree and an integer targetSum, return all root-to-leaf paths where the sum of the node values in the path equals targetSum. Each path should be returned as a list of the node values, not node references.`,
    examples: [
      { input: "root = [5,4,8,11,null,13,4,7,2,null,null,5,1], targetSum = 22", output: "[[5,4,11,2],[5,8,4,5]]" },
      { input: "root = [1,2,3], targetSum = 5", output: "[]" },
    ],
    constraints: ["The number of nodes in the tree is in the range [0, 5000].", "-1000 <= Node.val <= 1000", "-1000 <= targetSum <= 1000"],
    hints: ["Use DFS with backtracking", "Track current path and remaining sum", "Add path to result when at leaf with sum = 0", "Remove last node when backtracking"],
    starterCode: {
      javascript: `function pathSum(root, targetSum) {\n  // Write your solution here\n\n}`,
      typescript: `function pathSum(root: TreeNode | null, targetSum: number): number[][] {\n  // Write your solution here\n\n}`,
      python: `def pathSum(root, targetSum):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n^2)", space: "O(n)" },
    testCases: [
      { input: { root: [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, 5, 1], targetSum: 22 }, expected: [[5, 4, 11, 2], [5, 8, 4, 5]], description: "Multiple paths" },
      { input: { root: [1, 2, 3], targetSum: 5 }, expected: [], description: "No valid paths" },
    ],
  },
  {
    id: "dsa-flatten-binary-tree",
    title: "Flatten Binary Tree to Linked List",
    type: "dsa",
    pattern: "trees",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Flatten binary tree to linked list in-place using preorder",
    tags: ["binary-tree", "dfs", "linked-list"],
    estimatedTime: 25,
    problemStatement: `Given the root of a binary tree, flatten the tree into a "linked list":

- The "linked list" should use the same TreeNode class where the right child pointer points to the next node in the list and the left child pointer is always null.
- The "linked list" should be in the same order as a pre-order traversal of the binary tree.`,
    examples: [
      { input: "root = [1,2,5,3,4,null,6]", output: "[1,null,2,null,3,null,4,null,5,null,6]" },
      { input: "root = []", output: "[]" },
      { input: "root = [0]", output: "[0]" },
    ],
    constraints: ["The number of nodes in the tree is in the range [0, 2000].", "-100 <= Node.val <= 100"],
    hints: [
      "Morris traversal for O(1) space",
      "Or reverse postorder (right, left, root) and link",
      "For each node, connect left subtree's rightmost to right subtree",
      "Move left to right, set left to null",
    ],
    starterCode: {
      javascript: `function flatten(root) {\n  // Write your solution here (modify in-place)\n\n}`,
      typescript: `function flatten(root: TreeNode | null): void {\n  // Write your solution here\n\n}`,
      python: `def flatten(root):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1) with Morris" },
    testCases: [
      { input: { root: [1, 2, 5, 3, 4, null, 6] }, expected: [1, null, 2, null, 3, null, 4, null, 5, null, 6], description: "Standard tree" },
      { input: { root: [] }, expected: [], description: "Empty tree" },
      { input: { root: [0] }, expected: [0], description: "Single node" },
    ],
  },
  {
    id: "dsa-sum-root-to-leaf",
    title: "Sum Root to Leaf Numbers",
    type: "dsa",
    pattern: "trees",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google"],
    description: "Sum all root-to-leaf numbers formed by paths",
    tags: ["binary-tree", "dfs"],
    estimatedTime: 20,
    problemStatement: `You are given the root of a binary tree containing digits from 0 to 9 only. Each root-to-leaf path in the tree represents a number.

Return the total sum of all root-to-leaf numbers.`,
    examples: [
      { input: "root = [1,2,3]", output: "25", explanation: "12 + 13 = 25" },
      { input: "root = [4,9,0,5,1]", output: "1026", explanation: "495 + 491 + 40 = 1026" },
    ],
    constraints: ["The number of nodes in the tree is in the range [1, 1000].", "0 <= Node.val <= 9", "The depth of the tree will not exceed 10."],
    hints: ["DFS passing current number formed so far", "At each node: num = num * 10 + node.val", "At leaf, add num to total"],
    starterCode: {
      javascript: `function sumNumbers(root) {\n  // Write your solution here\n\n}`,
      typescript: `function sumNumbers(root: TreeNode | null): number {\n  // Write your solution here\n\n}`,
      python: `def sumNumbers(root):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(h)" },
    testCases: [
      { input: { root: [1, 2, 3] }, expected: 25, description: "12 + 13" },
      { input: { root: [4, 9, 0, 5, 1] }, expected: 1026, description: "495 + 491 + 40" },
    ],
  },
  {
    id: "dsa-populating-next-right",
    title: "Populating Next Right Pointers in Each Node",
    type: "dsa",
    pattern: "trees",
    difficulty: "medium",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    description: "Connect nodes at same level using next pointers",
    tags: ["binary-tree", "bfs", "dfs"],
    estimatedTime: 25,
    problemStatement: `You are given a perfect binary tree where all leaves are on the same level, and every parent has two children.

Populate each next pointer to point to its next right node. If there is no next right node, the next pointer should be set to NULL.

Initially, all next pointers are set to NULL.`,
    examples: [
      { input: "root = [1,2,3,4,5,6,7]", output: "[1,#,2,3,#,4,5,6,7,#]", explanation: "# denotes null next pointers" },
      { input: "root = []", output: "[]" },
    ],
    constraints: ["The number of nodes in the tree is in the range [0, 2^12 - 1].", "-1000 <= Node.val <= 1000"],
    hints: [
      "BFS level by level, connect nodes in same level",
      "For O(1) space: use next pointers from previous level",
      "node.left.next = node.right",
      "node.right.next = node.next?.left",
    ],
    starterCode: {
      javascript: `function connect(root) {\n  // Write your solution here\n\n}`,
      typescript: `function connect(root: Node | null): Node | null {\n  // Write your solution here\n\n}`,
      python: `def connect(root):\n    # Write your solution here\n    pass`,
    },
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    testCases: [
      { input: { root: [1, 2, 3, 4, 5, 6, 7] }, expected: [1, "#", 2, 3, "#", 4, 5, 6, 7, "#"], description: "Perfect binary tree" },
      { input: { root: [] }, expected: [], description: "Empty tree" },
    ],
  },
]

export default treesScenarios
