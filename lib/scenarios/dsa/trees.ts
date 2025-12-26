/**
 * Trees DSA Scenarios
 * Pattern: trees
 */

import type { DSAScenario } from '../types'

export const treesScenarios: DSAScenario[] = [
  {
    id: 'dsa-binary-tree-inorder',
    title: 'Binary Tree Inorder Traversal',
    type: 'dsa',
    pattern: 'trees',
    difficulty: 'easy',
    companies: ["Amazon", "Google", "Meta"],
    description: "Return the inorder traversal of a binary tree's nodes' values.",
    tags: ["tree", "dfs", "stack", "recursion"],
    estimatedTime: 15,
    problemStatement: `Given the root of a binary tree, return the inorder traversal of its nodes' values.`,
    examples: [
    {
      input: 'root = [1,null,2,3]',
      output: '[1,3,2]'
    },
    {
      input: 'root = []',
      output: '[]'
    },
    {
      input: 'root = [1]',
      output: '[1]'
    }
  ],
    constraints: [
    'The number of nodes in the tree is in the range [0, 100].',
    '-100 <= Node.val <= 100'
  ],
    hints: [
    'Inorder: left -> root -> right',
    'Can solve recursively or iteratively with stack',
    'Morris traversal for O(1) space'
  ],
    starterCode: {
      javascript: `function binary_tree_inorder() {
  // Your code here
}`,
      python: `def binary_tree_inorder():
    # Your code here
    pass`
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(n) recursive, O(1) Morris'
    },
    testCases: []
  },

  {
    id: 'dsa-serialize-deserialize-tree',
    title: 'Serialize and Deserialize Binary Tree',
    type: 'dsa',
    pattern: 'trees',
    difficulty: 'hard',
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    description: 'Design an algorithm to serialize and deserialize a binary tree.',
    tags: ["tree", "dfs", "bfs", "design"],
    estimatedTime: 35,
    problemStatement: `Design an algorithm to serialize and deserialize a binary tree. Serialization is converting a tree to a string. Deserialization is converting the string back to the original tree structure.`,
    examples: [
    {
      input: 'root = [1,2,3,null,null,4,5]',
      output: '[1,2,3,null,null,4,5]'
    }
  ],
    constraints: [
    'The number of nodes in the tree is in the range [0, 10^4].',
    '-1000 <= Node.val <= 1000'
  ],
    hints: [
    'Use preorder traversal with null markers',
    'Serialize: visit node, left, right (record nulls)',
    'Deserialize: recursively build tree from serialized string'
  ],
    starterCode: {
      javascript: `function serialize_deserialize_tree() {
  // Your code here
}`,
      python: `def serialize_deserialize_tree():
    # Your code here
    pass`
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(n)'
    },
    testCases: []
  },

  {
    id: 'dsa-binary-tree-max-path-sum',
    title: 'Binary Tree Maximum Path Sum',
    type: 'dsa',
    pattern: 'trees',
    difficulty: 'hard',
    companies: ["Amazon", "Google", "Meta"],
    description: 'Find the maximum path sum in a binary tree.',
    tags: ["tree", "dfs", "recursion"],
    estimatedTime: 30,
    problemStatement: `A path in a binary tree is a sequence of nodes where each pair of adjacent nodes has an edge. A node can only appear once in the sequence. The path sum is the sum of the node values. Return the maximum path sum of any non-empty path.`,
    examples: [
    {
      input: 'root = [1,2,3]',
      output: '6',
      explanation: 'Path is 2->1->3'
    },
    {
      input: 'root = [-10,9,20,null,null,15,7]',
      output: '42',
      explanation: 'Path is 15->20->7'
    }
  ],
    constraints: [
    'The number of nodes in the tree is in the range [1, 3 * 10^4].',
    '-1000 <= Node.val <= 1000'
  ],
    hints: [
    'For each node, calculate max path through that node',
    'Max path = node.val + max(left_path, 0) + max(right_path, 0)',
    'Return max single path to parent: node.val + max(left, right, 0)'
  ],
    starterCode: {
      javascript: `function binary_tree_max_path_sum() {
  // Your code here
}`,
      python: `def binary_tree_max_path_sum():
    # Your code here
    pass`
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(n)'
    },
    testCases: []
  },

  {
    id: 'dsa-lowest-common-ancestor',
    title: 'Lowest Common Ancestor of a Binary Tree',
    type: 'dsa',
    pattern: 'trees',
    difficulty: 'medium',
    companies: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Apple'],
    description: 'Find the lowest common ancestor of two nodes in a binary tree',
    tags: ['tree', 'dfs', 'recursion'],
    estimatedTime: 25,
    problemStatement: `Given a binary tree, find the lowest common ancestor (LCA) of two given nodes in the tree.

According to the definition of LCA on Wikipedia: "The lowest common ancestor is defined between two nodes p and q as the lowest node in T that has both p and q as descendants (where we allow a node to be a descendant of itself)."`,
    examples: [
      {
        input: 'root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1',
        output: '3',
        explanation: 'The LCA of nodes 5 and 1 is 3.',
      },
      {
        input: 'root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 4',
        output: '5',
        explanation: 'The LCA of nodes 5 and 4 is 5, since a node can be a descendant of itself.',
      },
    ],
    constraints: [
      'The number of nodes in the tree is in the range [2, 10^5].',
      '-10^9 <= Node.val <= 10^9',
      'All Node.val are unique.',
      'p != q',
      'p and q will exist in the tree.',
    ],
    hints: [
      'Recursively search left and right subtrees for p and q',
      'If both left and right return non-null, current node is LCA',
      'If one side returns null, LCA is on the other side',
      'Base case: if current node is p or q, return it',
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
      time: 'O(n)',
      space: 'O(h) where h is height',
    },
    testCases: [
      {
        input: { root: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 5, q: 1 },
        expected: 3,
        description: 'LCA is root',
      },
      {
        input: { root: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 5, q: 4 },
        expected: 5,
        description: 'LCA is one of the nodes',
      },
      {
        input: { root: [1, 2], p: 1, q: 2 },
        expected: 1,
        description: 'Two node tree',
      },
    ],
  },

  {
    id: 'dsa-binary-tree-level-order',
    title: 'Binary Tree Level Order Traversal',
    type: 'dsa',
    pattern: 'trees',
    difficulty: 'medium',
    companies: ['Amazon', 'Google', 'Meta', 'Microsoft'],
    description: 'Return the level order traversal of a binary tree',
    tags: ['tree', 'bfs', 'queue'],
    estimatedTime: 20,
    problemStatement: `Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).`,
    examples: [
      {
        input: 'root = [3,9,20,null,null,15,7]',
        output: '[[3],[9,20],[15,7]]',
      },
      {
        input: 'root = [1]',
        output: '[[1]]',
      },
      {
        input: 'root = []',
        output: '[]',
      },
    ],
    constraints: [
      'The number of nodes in the tree is in the range [0, 2000].',
      '-1000 <= Node.val <= 1000',
    ],
    hints: [
      'Use BFS with a queue',
      'Process all nodes at current level before moving to next',
      'Track level size before processing to know when level ends',
    ],
    starterCode: {
      javascript: `function levelOrder(root) {
  // Use BFS to traverse level by level
}`,
      typescript: `function levelOrder(root: TreeNode | null): number[][] {
  // Use BFS to traverse level by level
}`,
      python: `def levelOrder(root: Optional[TreeNode]) -> List[List[int]]:
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
      time: 'O(n)',
      space: 'O(n)',
    },
    testCases: [
      {
        input: { root: [3, 9, 20, null, null, 15, 7] },
        expected: [[3], [9, 20], [15, 7]],
        description: 'Standard tree',
      },
      {
        input: { root: [1] },
        expected: [[1]],
        description: 'Single node',
      },
      {
        input: { root: [] },
        expected: [],
        description: 'Empty tree',
      },
    ],
  },

  {
    id: 'dsa-diameter-of-binary-tree',
    title: 'Diameter of Binary Tree',
    type: 'dsa',
    pattern: 'trees',
    difficulty: 'easy',
    companies: ['Amazon', 'Google', 'Meta', 'Apple'],
    description: 'Find the diameter (longest path) of a binary tree',
    tags: ['tree', 'dfs', 'recursion'],
    estimatedTime: 20,
    problemStatement: `Given the root of a binary tree, return the length of the diameter of the tree.

The diameter of a binary tree is the length of the longest path between any two nodes in a tree. This path may or may not pass through the root.

The length of a path between two nodes is represented by the number of edges between them.`,
    examples: [
      {
        input: 'root = [1,2,3,4,5]',
        output: '3',
        explanation: 'The longest path is [4,2,1,3] or [5,2,1,3] with 3 edges.',
      },
      {
        input: 'root = [1,2]',
        output: '1',
      },
    ],
    constraints: [
      'The number of nodes in the tree is in the range [1, 10^4].',
      '-100 <= Node.val <= 100',
    ],
    hints: [
      'Diameter through a node = left_height + right_height',
      'Use DFS to compute height and update max diameter',
      'Height of a node = 1 + max(left_height, right_height)',
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
      time: 'O(n)',
      space: 'O(h) where h is height',
    },
    testCases: [
      {
        input: { root: [1, 2, 3, 4, 5] },
        expected: 3,
        description: 'Diameter through root',
      },
      {
        input: { root: [1, 2] },
        expected: 1,
        description: 'Two nodes',
      },
      {
        input: { root: [1] },
        expected: 0,
        description: 'Single node - no edges',
      },
    ],
  },
]

export default treesScenarios
