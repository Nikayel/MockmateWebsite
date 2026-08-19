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
  problemStatement: `You're given the root of a binary search tree and p, a node that lives somewhere inside it. Locate p's in-order successor and return that node, or return null when p has none.

The in-order successor is the node whose key is the smallest one strictly greater than p.val. Equivalently, if you wrote out every key in ascending order, the successor is the node that would appear immediately after p.`,
  examples: [
    {
      input: "root = [7,4,9], p = 4",
      output: "7",
      explanation: "The smallest key greater than 4 is 7.",
    },
    {
      input: "root = [12,8,15,5,10,null,null,3], p = 15",
      output: "null",
      explanation: "15 is the largest key in the tree, so nothing follows it.",
    },
  ],
  constraints: [
    "Node count sits between 1 and 10^4",
    "Every key obeys -10^5 <= Node.val <= 10^5",
    "Keys never repeat within the tree",
    "p always refers to a node present in the given BST",
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
