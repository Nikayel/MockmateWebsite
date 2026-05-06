import type { DSAScenario } from "../../types"

export const dsaDeleteNodeBstScenario: DSAScenario = {
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
2. If the node is found, delete the node.

Example visualization (delete 3):

    Before:              After:
        5                   5
       / \\                 / \\
     [3]  6      →        4   6
     / \\                 /
    2   4               2

    Three cases:
    1. Leaf node → just remove
    2. One child → replace with child
    3. Two children → replace with inorder successor`,
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
}
