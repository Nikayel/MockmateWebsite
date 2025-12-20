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
  }
]

export default treesScenarios
