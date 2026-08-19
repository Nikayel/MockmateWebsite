import type { DSAScenario } from "../../types"

export const binaryTreeLevelOrderScenario: DSAScenario = {
  id: "dsa-binary-tree-level-order",
  title: "Binary Tree Level Order Traversal",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Palantir"],
  roles: ["intern", "new-grad", "junior", "swe"],
  description: "Gather a binary tree's values depth by depth into per-level arrays",
  tags: ["tree", "bfs", "queue"],
  estimatedTime: 20,
  problemStatement: `You're given the root of a binary tree. Gather its values one depth at a time, starting at the root's level and working downward, reading each level from left to right. That grouping is the tree's level order traversal.

Return it as an array of arrays, with one inner array per level.

\`\`\`
      4           level 0 -> [4]
     / \\
    7   15        level 1 -> [7, 15]
   / \\  /
  3   5 12        level 2 -> [3, 5, 12]
\`\`\`

Output: [[4], [7, 15], [3, 5, 12]]`,
  examples: [
    {
      input: "root = [4,7,15,3,5,12]",
      output: "[[4],[7,15],[3,5,12]]",
    },
    {
      input: "root = [8]",
      output: "[[8]]",
    },
    {
      input: "root = []",
      output: "[]",
    },
  ],
  constraints: [
    "Node count ranges from 0 through 2000.",
    "Every stored value falls between -1000 and 1000.",
  ],
  hints: [
    "Use BFS with a queue",
    "Process all nodes at current level before moving to next",
    "Track level size before processing to know when level ends",
  ],
  starterCode: {
    javascript: `function levelOrder(root) {
// Use BFS to traverse level by level
}`,
    typescript: `function levelOrder(root: TreeNode | null): number[][] {
// Use BFS to traverse level by level
}`,
    python: `def levelOrder(root: Optional[TreeNode]) -> list[list[int]]:
  # Use BFS to traverse level by level
  pass`,
    java: `class Solution {
  public List<List<Integer>> levelOrder(TreeNode root) {
      // Use BFS to traverse level by level
      return new ArrayList<>();
  }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(n)",
  },
  testCases: [
    {
      input: { root: [3, 9, 20, null, null, 15, 7] },
      expected: [[3], [9, 20], [15, 7]],
      description: "Standard tree",
    },
    {
      input: { root: [1] },
      expected: [[1]],
      description: "Single node",
    },
    {
      input: { root: [] },
      expected: [],
      description: "Empty tree",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "Why use BFS instead of DFS for level order?",
    "How do you know when one level ends and the next begins?",
    "Could you do this with DFS? What extra state would you need?",
    "What's the maximum size the queue could grow to?",
  ],

  midCodingProbes: [
    {
      trigger: "processing level",
      question: "Why capture the queue size before processing nodes?",
    },
    {
      trigger: "adding to result",
      question: "When do you add the current level array to the result?",
    },
  ],
}
