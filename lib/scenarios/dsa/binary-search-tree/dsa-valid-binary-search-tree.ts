import type { DSAScenario } from "../../types"

export const dsaValidBinarySearchTreeScenario: DSAScenario = {
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
- Both the left and right subtrees must also be binary search trees.

Example:

\`\`\`
Valid                  Invalid
     5                      5
    / \\                    / \\
   3   7                  3   4
  / \\   \\                / \\
 1   4   8              1   6
\`\`\`

The second tree fails twice: 4 sits to the right of 5 but is smaller, and 6 sits in the left subtree of 5 but is larger.`,
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
}
