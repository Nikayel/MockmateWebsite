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
  problemStatement: `You're given root, the entry point of a binary search tree, together with two of its nodes, p and q. Return their lowest common ancestor (LCA): the deepest node that has both p and q somewhere among its descendants.

For this purpose a node counts as a descendant of itself, so whenever p is an ancestor of q, the LCA is p.

\`\`\`
          14
         /  \\
        6    20
       / \\   / \\
      2  10 17  25
        /  \\
       8   12
\`\`\`

Here the LCA of 6 and 20 is 14, while the LCA of 6 and 10 is 6 itself.`,
  examples: [
    {
      input: "root = [14,6,20,2,10,17,25,null,null,8,12], p = 6, q = 20",
      output: "14",
      explanation: "6 and 20 sit on opposite sides of 14, and no deeper node covers both.",
    },
    {
      input: "root = [14,6,20,2,10,17,25,null,null,8,12], p = 6, q = 10",
      output: "6",
      explanation: "10 lies inside 6's subtree, and 6 descends from itself, so 6 is the answer.",
    },
  ],
  constraints: [
    "Expect between 2 and 10^5 nodes",
    "Values span -10^9 <= Node.val <= 10^9",
    "No two nodes carry the same value",
    "p and q are two different nodes",
    "Both p and q are always present in the tree",
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
