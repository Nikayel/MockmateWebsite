import type { DSAScenario } from "../../types"

export const flattenBinaryTreeScenario: DSAScenario = {
  id: "dsa-flatten-binary-tree",
  title: "Flatten Binary Tree to Linked List",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Restructure a binary tree in place into a preorder right-pointer chain",
  tags: ["binary-tree", "dfs", "linked-list"],
  estimatedTime: 25,
  problemStatement: `You're given the root of a binary tree. Rework it, in place, into a single right-leaning chain that stands in for a linked list:

- Keep the existing TreeNode objects. In the finished chain, each node's right pointer leads to the node that follows it, and every left pointer ends up null.
- The chain must present the nodes in the tree's preorder sequence, where each node comes before its left subtree, which comes before its right subtree.`,
  examples: [
    { input: "root = [8,3,10,2,6,null,12]", output: "[8,null,3,null,2,null,6,null,10,null,12]" },
    { input: "root = []", output: "[]" },
    { input: "root = [5]", output: "[5]" },
  ],
  constraints: ["The tree contains 0 to 2000 nodes.", "Stored values range across -100 to 100."],
  hints: [
    "Morris traversal for O(1) space",
    "Or reverse postorder (right, left, root) and link",
    "For each node, connect left subtree's rightmost to right subtree",
    "Move left to right, set left to null",
  ],
  starterCode: {
    javascript: `function flatten(root) {\n  // Write your solution here (modify in-place)\n\n}`,
    typescript: `function flatten(root: TreeNode | null): void {\n  // Write your solution here\n\n}`,
    python: `def flatten(root):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1) with Morris" },
  testCases: [
    {
      input: { root: [1, 2, 5, 3, 4, null, 6] },
      expected: [1, null, 2, null, 3, null, 4, null, 5, null, 6],
      description: "Standard tree",
    },
    { input: { root: [] }, expected: [], description: "Empty tree" },
    { input: { root: [0] }, expected: [0], description: "Single node" },
  ],
}
