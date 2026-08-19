import type { DSAScenario } from "../../types"

export const validateBstScenario: DSAScenario = {
  id: "dsa-validate-bst",
  title: "Validate Binary Search Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "Apple", "Bloomberg"],
  description: "Decide whether a binary tree obeys BST ordering everywhere",
  tags: ["binary-search-tree", "dfs", "recursion"],
  estimatedTime: 20,
  problemStatement: `You're given the root of a binary tree and must decide whether it qualifies as a binary search tree. The BST property says: every value anywhere in a node's left subtree is strictly smaller than that node's value, and every value anywhere in its right subtree is strictly larger. Note the word anywhere; the requirement reaches past immediate children to every descendant, and it applies at every node of the tree, not just at root.

Strictness matters too: equal values are never allowed on either side.

Return true if root satisfies all of this, false otherwise.`,
  examples: [
    { input: "root = [4,2,9]", output: "true" },
    {
      input: "root = [7,2,6,null,null,5,8]",
      output: "false",
      explanation: "6 sits in 7's right subtree, yet 6 is smaller than 7.",
    },
  ],
  constraints: [
    "The tree holds between 1 and 10^4 nodes.",
    "Values may span the full -2^31 to 2^31 - 1 range.",
  ],
  hints: [
    "Pass min/max bounds down the tree",
    "Left child must be < current, right child must be > current",
    "Or use inorder traversal - should be strictly increasing",
    "Watch out for duplicate values (not allowed in BST)",
  ],
  starterCode: {
    javascript: `function isValidBST(root) {\n  // Write your solution here\n}`,
    typescript: `function isValidBST(root: TreeNode | null): boolean {\n  // Write your solution here\n}`,
    python: `def isValidBST(root: Optional[TreeNode]) -> bool:\n    # Write your solution here\n    pass`,
    java: `class Solution {\n    public boolean isValidBST(TreeNode root) {\n        // Write your solution here\n        return false;\n    }\n}`,
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
    // Every value above is distinct, so an inorder walk checking `<=` instead of `<` passed.
    // A BST requires strictly less on the left, so a duplicate is invalid.
    {
      input: { root: [2, 2, 3] },
      expected: false,
      description: "Duplicate value: the left child must be strictly less",
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
