import type { DSAScenario } from "../../types"

export const invertBinaryTreeScenario: DSAScenario = {
  id: "dsa-invert-binary-tree",
  title: "Invert Binary Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "easy",
  companies: ["Google", "Amazon", "Meta", "Apple", "Microsoft"],
  description: "Mirror a binary tree by swapping every node's pair of children.",
  tags: ["tree", "dfs", "bfs", "recursion"],
  estimatedTime: 10,
  problemStatement: `You're given the root of a binary tree. Invert it: every node in the tree trades its left child for its right child, all the way down, leaving a mirror image of the original. Return root once the swapping is done.

\`\`\`
Before                After
     10                  10
    /  \\                /  \\
   5    14             14    5
  / \\   / \\           / \\   / \\
 2   8 12  20        20  12 8   2
\`\`\``,
  examples: [
    {
      input: "root = [10,5,14,2,8,12,20]",
      output: "[10,14,5,20,12,8,2]",
      explanation: "Every left-right pair has traded places.",
    },
    {
      input: "root = [6,4,9]",
      output: "[6,9,4]",
    },
    {
      input: "root = []",
      output: "[]",
    },
  ],
  constraints: [
    "You'll see at most 100 nodes, possibly 0.",
    "Any value from -100 to 100 can appear.",
  ],
  hints: [
    "Recursively swap left and right children",
    "Base case: if node is null, return null",
    "Can also solve iteratively with BFS or stack",
  ],
  starterCode: {
    javascript: `function invertTree(root) {
// Write your solution here
}`,
    typescript: `function invertTree(root: TreeNode | null): TreeNode | null {
// Write your solution here
}`,
    python: `def invertTree(root: Optional[TreeNode]) -> Optional[TreeNode]:
  # Write your solution here
  pass`,
    java: `class Solution {
  public TreeNode invertTree(TreeNode root) {
      // Write your solution here
      return null;
  }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(h) where h is height",
  },
  testCases: [
    {
      input: { root: [4, 2, 7, 1, 3, 6, 9] },
      expected: [4, 7, 2, 9, 6, 3, 1],
      description: "Standard tree inversion",
    },
    {
      input: { root: [2, 1, 3] },
      expected: [2, 3, 1],
      description: "Small tree",
    },
    {
      input: { root: [] },
      expected: [],
      description: "Empty tree",
    },
    // Both trees above are perfect, where reversing each level's VALUES in place happens to
    // produce the same array as mirroring the structure. On an asymmetric tree the two come
    // apart: that approach leaves node 4 hanging off the left branch.
    {
      input: { root: [1, 2, 3, 4] },
      expected: [1, 3, 2, null, null, null, 4],
      description: "Asymmetric tree: swapping children is not reversing level values",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What if the tree is empty or has only one node?",
    "Can you do this iteratively instead of recursively?",
    "What's the space complexity of your recursive solution?",
    "Does the order of swapping matter - left first or right first?",
  ],

  midCodingProbes: [
    {
      trigger: "swapping children",
      question: "After swapping at a node, what do you need to do with the children?",
    },
    {
      trigger: "base case",
      question: "What's your base case for the recursion?",
    },
  ],
}
