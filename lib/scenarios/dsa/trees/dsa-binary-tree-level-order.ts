import type { DSAScenario } from "../../types"

export const binaryTreeLevelOrderScenario: DSAScenario = {
  id: "dsa-binary-tree-level-order",
  title: "Binary Tree Level Order Traversal",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Return the level order traversal of a binary tree",
  tags: ["tree", "bfs", "queue"],
  estimatedTime: 20,
  problemStatement: `Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).

Example visualization:

      3           Level 0: [3]
     / \\
    9  20         Level 1: [9, 20]
       / \\
      15  7       Level 2: [15, 7]

  Output: [[3], [9, 20], [15, 7]]`,
  examples: [
    {
      input: "root = [3,9,20,null,null,15,7]",
      output: "[[3],[9,20],[15,7]]",
    },
    {
      input: "root = [1]",
      output: "[[1]]",
    },
    {
      input: "root = []",
      output: "[]",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [0, 2000].",
    "-1000 <= Node.val <= 1000",
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
