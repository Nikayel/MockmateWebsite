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
  problemStatement: `You're maintaining a binary search tree handed to you as root, and you receive an integer key. If some node stores key, remove that node; either way, return the root of the resulting tree. Whatever remains must still be a valid BST, and whenever several rearrangements satisfy that, any one of them is accepted.

One accepted way to remove 6:

\`\`\`
Before                  After
     9                     9
    / \\                   / \\
   6   11                7   11
  / \\    \\              /     \\
 4   7    14            4      14
\`\`\``,
  examples: [
    {
      input: "root = [9,6,11,4,7,null,14], key = 6",
      output: "[9,7,11,4,null,null,14]",
      explanation: "One accepted result; other valid BSTs over the remaining values pass too.",
    },
    {
      input: "root = [9,6,11,4,7,null,14], key = 2",
      output: "[9,6,11,4,7,null,14]",
      explanation: "No node stores 2, so the tree comes back unchanged.",
    },
  ],
  constraints: [
    "Anywhere from 0 to 10^4 nodes may be present",
    "Values fall within -10^5 <= Node.val <= 10^5",
    "No value appears on two different nodes",
    "The tree you receive is a valid binary search tree",
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
