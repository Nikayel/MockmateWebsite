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
  problemStatement: `You're given the root of a binary tree. Report whether it upholds the binary search tree invariant.

The invariant is strict and reaches whole subtrees, not just direct children: every key stored anywhere in a node's left subtree must be smaller than the node's own key, every key anywhere in its right subtree must be larger, and each subtree must satisfy the same rule internally. Equal keys never qualify, so a repeated value anywhere makes the tree invalid.

\`\`\`
Valid                  Invalid
     8                      8
    / \\                    / \\
   4  11                  4   7
  / \\   \\                / \\
 2   6   14              2   9
\`\`\`

The right-hand tree breaks the rule twice: 7 sits to the right of 8 despite being smaller, and 9 lives inside the left subtree of 8 despite being larger.`,
  examples: [
    {
      input: "root = [7,4,9]",
      output: "true",
    },
    {
      input: "root = [10,3,8,null,null,6,12]",
      output: "false",
      explanation:
        "The root holds 10, yet its right child holds 8, which is too small for that side.",
    },
  ],
  constraints: [
    "The tree holds between 1 and 10^4 nodes",
    "Every value fits -2^31 <= Node.val <= 2^31 - 1",
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
