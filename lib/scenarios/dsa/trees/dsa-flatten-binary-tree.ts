import type { DSAScenario } from "../../types"

export const flattenBinaryTreeScenario: DSAScenario = {
  id: "dsa-flatten-binary-tree",
  title: "Flatten Binary Tree to Linked List",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Flatten binary tree to linked list in-place using preorder",
  tags: ["binary-tree", "dfs", "linked-list"],
  estimatedTime: 25,
  problemStatement: `Given the root of a binary tree, flatten the tree into a "linked list":

- The "linked list" should use the same TreeNode class where the right child pointer points to the next node in the list and the left child pointer is always null.
- The "linked list" should be in the same order as a pre-order traversal of the binary tree.`,
  examples: [
    { input: "root = [1,2,5,3,4,null,6]", output: "[1,null,2,null,3,null,4,null,5,null,6]" },
    { input: "root = []", output: "[]" },
    { input: "root = [0]", output: "[0]" },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [0, 2000].",
    "-100 <= Node.val <= 100",
  ],
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
