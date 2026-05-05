import type { DSAScenario } from "../../types"

export const validateBstScenario: DSAScenario = {
  id: "dsa-validate-bst",
  title: "Validate Binary Search Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "Apple", "Bloomberg"],
  description: "Determine if a binary tree is a valid BST",
  tags: ["binary-search-tree", "dfs", "recursion"],
  estimatedTime: 20,
  problemStatement: `Given the root of a binary tree, determine if it is a valid binary search tree (BST).

A valid BST is defined as follows:
- The left subtree of a node contains only nodes with keys less than the node's key.
- The right subtree of a node contains only nodes with keys greater than the node's key.
- Both the left and right subtrees must also be binary search trees.`,
  examples: [
    { input: "root = [2,1,3]", output: "true" },
    {
      input: "root = [5,1,4,null,null,3,6]",
      output: "false",
      explanation: "The root node's value is 5 but its right child's value is 4.",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [1, 10^4].",
    "-2^31 <= Node.val <= 2^31 - 1",
  ],
  hints: [
    "Pass min/max bounds down the tree",
    "Left child must be < current, right child must be > current",
    "Or use inorder traversal - should be strictly increasing",
    "Watch out for duplicate values (not allowed in BST)",
  ],
  starterCode: {
    javascript: `function isValidBST(root) {\n  // Validate BST using bounds or inorder\n}`,
    typescript: `function isValidBST(root: TreeNode | null): boolean {\n  // Validate BST using bounds or inorder\n}`,
    python: `def isValidBST(root: Optional[TreeNode]) -> bool:\n    # Validate BST using bounds or inorder\n    pass`,
    java: `class Solution {\n    public boolean isValidBST(TreeNode root) {\n        // Validate BST\n        return false;\n    }\n}`,
  },
  optimalComplexity: { time: "O(n)", space: "O(h)" },
  testCases: [
    { input: { root: [2, 1, 3] }, expected: true, description: "Valid BST" },
    {
      input: { root: [5, 1, 4, null, null, 3, 6] },
      expected: false,
      description: "Invalid - right subtree violation",
    },
    {
      input: { root: [5, 4, 6, null, null, 3, 7] },
      expected: false,
      description: "Invalid - 3 < 5 but in right subtree",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "Why can't you just check if left < root < right at each node?",
    "What bounds do you pass to the left child? The right child?",
    "Could you solve this with inorder traversal? How?",
    "What if there are duplicate values?",
  ],

  midCodingProbes: [
    {
      trigger: "passing bounds",
      question: "What initial bounds do you use for the root?",
    },
    {
      trigger: "inorder approach",
      question: "What property should the inorder traversal have for a valid BST?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Only checking immediate parent-child relationship",
      codeSignals: ["left.val < root.val", "only parent comparison"],
      intervention:
        "That checks immediate children, but what about grandchildren? A node in the right subtree must be greater than ALL ancestors on the path.",
    },
  ],
}
