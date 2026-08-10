import type { DSAScenario } from "../../types"

export const dsaLowestCommonAncestorBstScenario: DSAScenario = {
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

According to the definition of LCA: "The lowest common ancestor is defined between two nodes p and q as the lowest node in T that has both p and q as descendants (where we allow a node to be a descendant of itself)."

Example:

\`\`\`
          6
         / \\
        2   8
       / \\  / \\
      0   4 7   9
         / \\
        3   5
\`\`\`

The LCA of 2 and 8 is 6. The LCA of 2 and 4 is 2, because a node counts as a descendant of itself.`,
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
}
