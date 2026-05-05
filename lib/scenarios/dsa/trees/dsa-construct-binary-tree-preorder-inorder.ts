import type { DSAScenario } from "../../types"

export const constructBinaryTreePreorderInorderScenario: DSAScenario = {
  id: "dsa-construct-binary-tree-preorder-inorder",
  title: "Construct Binary Tree from Preorder and Inorder Traversal",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Build a binary tree from preorder and inorder traversals.",
  tags: ["tree", "recursion", "divide-and-conquer", "hash-table"],
  estimatedTime: 30,
  problemStatement: `Given two integer arrays preorder and inorder where preorder is the preorder traversal of a binary tree and inorder is the inorder traversal of the same tree, construct and return the binary tree.

Example visualization:

  preorder = [3, 9, 20, 15, 7]   (Root, Left, Right)
  inorder  = [9, 3, 15, 20, 7]   (Left, Root, Right)

  Step 1: 3 is root (first in preorder)
  Step 2: In inorder, left of 3 is [9], right is [15,20,7]

  Reconstructed tree:
        3
       / \\
      9  20
         / \\
        15  7`,
  examples: [
    {
      input: "preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]",
      output: "[3,9,20,null,null,15,7]",
    },
    {
      input: "preorder = [-1], inorder = [-1]",
      output: "[-1]",
    },
  ],
  constraints: [
    "1 <= preorder.length <= 3000",
    "inorder.length == preorder.length",
    "-3000 <= preorder[i], inorder[i] <= 3000",
    "preorder and inorder consist of unique values.",
    "Each value of inorder also appears in preorder.",
  ],
  hints: [
    "First element of preorder is root",
    "Find root in inorder to split left/right subtrees",
    "Use hashmap for O(1) index lookup in inorder",
    "Recursively build left and right subtrees",
  ],
  starterCode: {
    javascript: `function buildTree(preorder, inorder) {
// Build tree from traversals
}`,
    typescript: `function buildTree(preorder: number[], inorder: number[]): TreeNode | null {
// Build tree from traversals
}`,
    python: `def buildTree(preorder: list[int], inorder: list[int]) -> Optional[TreeNode]:
  # Build tree from traversals
  pass`,
    java: `class Solution {
  public TreeNode buildTree(int[] preorder, int[] inorder) {
      // Build tree from traversals
      return null;
  }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(n)",
  },
  testCases: [
    {
      input: { preorder: [3, 9, 20, 15, 7], inorder: [9, 3, 15, 20, 7] },
      expected: [3, 9, 20, null, null, 15, 7],
      description: "Standard tree construction",
    },
    {
      input: { preorder: [-1], inorder: [-1] },
      expected: [-1],
      description: "Single node",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "Why can't you reconstruct from just preorder or just inorder alone?",
    "What if there were duplicate values in the tree?",
    "How does inorder help you split left and right subtrees?",
    "What optimization can you do to find the root index in inorder quickly?",
  ],

  midCodingProbes: [
    {
      trigger: "finding root in inorder",
      question: "How do you efficiently find where the root is in the inorder array?",
    },
    {
      trigger: "slicing arrays",
      question:
        "After finding root, how do you determine the boundaries for left and right subtrees?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Linear search for root in inorder each time",
      codeSignals: ["indexOf", "index()", "for loop to find"],
      intervention:
        "That's O(n) per recursive call. Could you precompute the indices with a hashmap?",
    },
  ],
}
