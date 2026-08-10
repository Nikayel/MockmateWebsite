import type { DSAScenario } from "../../types"

export const dsaInorderSuccessorBstScenario: DSAScenario = {
  id: "dsa-inorder-successor-bst",
  title: "Inorder Successor in BST",
  type: "dsa",
  pattern: "binary-search-tree",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Microsoft", "Google"],
  description: "Find the inorder successor of a node in BST",
  tags: ["tree", "bst", "binary-search"],
  estimatedTime: 20,
  problemStatement: `Given the root of a binary search tree and a node p in it, return the in-order successor of that node in the BST. If the given node has no in-order successor in the tree, return null.

The successor of a node p is the node with the smallest key greater than p.val.`,
  examples: [
    {
      input: "root = [2,1,3], p = 1",
      output: "2",
      explanation: "1's in-order successor node is 2.",
    },
    {
      input: "root = [5,3,6,2,4,null,null,1], p = 6",
      output: "null",
      explanation: "6 has no successor since it's the largest.",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in range [1, 10^4]",
    "-10^5 <= Node.val <= 10^5",
    "All values in the tree are unique",
    "p is a node in the given BST",
  ],
  hints: [
    "If p has a right subtree, successor is leftmost node in right subtree",
    "Otherwise, traverse from root: go left when possible while tracking last left turn",
    "Use BST property: if p.val < node.val, node could be successor",
  ],
  starterCode: {
    javascript: `function inorderSuccessor(root, p) {
  // Write your solution here

}`,
    typescript: `function inorderSuccessor(root: TreeNode | null, p: TreeNode | null): TreeNode | null {
  // Write your solution here

}`,
    python: `def inorderSuccessor(root, p):
    # Write your solution here
    pass`,
  },
  optimalComplexity: { time: "O(h)", space: "O(1)" },
  testCases: [
    { input: { root: [2, 1, 3], p: 1 }, expected: 2, description: "Successor exists" },
    {
      input: { root: [5, 3, 6, 2, 4, null, null, 1], p: 6 },
      expected: null,
      description: "No successor",
    },
    { input: { root: [5, 3, 6, 2, 4], p: 4 }, expected: 5, description: "Successor is ancestor" },
    {
      input: { root: [5, 3, 6, 2, 4], p: 3 },
      expected: 4,
      description: "Successor in right subtree",
    },
    // Every tree above holds consecutive integers, so simply answering p + 1 whenever that
    // value happens to be in the tree matched every case. Non-consecutive values separate
    // "the next value in sorted order" from "one more than p".
    {
      input: { root: [10, 5, 15], p: 5 },
      expected: 10,
      description: "Non-consecutive values: the successor is not p + 1",
    },
  ],
}
