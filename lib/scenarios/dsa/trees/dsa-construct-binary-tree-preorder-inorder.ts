import type { DSAScenario } from "../../types"

export const constructBinaryTreePreorderInorderScenario: DSAScenario = {
  id: "dsa-construct-binary-tree-preorder-inorder",
  title: "Construct Binary Tree from Preorder and Inorder Traversal",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Rebuild the unique binary tree encoded by its preorder and inorder sequences.",
  tags: ["tree", "hash-table", "recursion", "divide-and-conquer"],
  estimatedTime: 30,
  problemStatement: `You're given two integer arrays, preorder and inorder, that record two walks over the same binary tree. In preorder, each node appears before everything in its left subtree, which appears before everything in its right subtree. In inorder, everything in a node's left subtree appears first, then the node itself, then everything in its right subtree.

Exactly one binary tree produces both sequences. Rebuild it and return its root.

\`\`\`
preorder = [7, 4, 12, 9, 15]
inorder  = [4, 7, 9, 12, 15]

The tree they describe:

      7
     / \\
    4   12
        / \\
       9   15
\`\`\``,
  examples: [
    {
      input: "preorder = [7,4,12,9,15], inorder = [4,7,9,12,15]",
      output: "[7,4,12,null,null,9,15]",
    },
    {
      input: "preorder = [-6], inorder = [-6]",
      output: "[-6]",
    },
  ],
  constraints: [
    "preorder holds between 1 and 3000 values.",
    "inorder has exactly the same length as preorder.",
    "Entries of both arrays lie between -3000 and 3000.",
    "All traversal values are distinct.",
    "Every value found in inorder also shows up in preorder.",
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
