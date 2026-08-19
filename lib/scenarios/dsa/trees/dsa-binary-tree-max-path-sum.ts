import type { DSAScenario } from "../../types"

export const binaryTreeMaxPathSumScenario: DSAScenario = {
  id: "dsa-binary-tree-max-path-sum",
  title: "Binary Tree Maximum Path Sum",
  type: "dsa",
  pattern: "trees",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta"],
  description: "Find the best achievable sum along any node-to-node path in a binary tree.",
  tags: ["tree", "dfs", "recursion"],
  estimatedTime: 30,
  problemStatement: `You're given a binary tree via its root. A path here is a chain of distinct nodes in which every consecutive pair is joined by an edge of the tree. A path may begin and end anywhere, and it is free to skip the root entirely. Its sum is the total of the values on its nodes.

Across every non-empty path the tree offers, return the largest sum you can achieve.`,
  examples: [
    {
      input: "root = [4,5,6]",
      output: "15",
      explanation: "The winning path is 5 -> 4 -> 6",
    },
    {
      input: "root = [-8,12,16,null,null,9,10]",
      output: "35",
      explanation: "The path 9 -> 16 -> 10 avoids the negative root",
    },
  ],
  constraints: [
    "Expect at least 1 node and up to 3 * 10^4 of them.",
    "Individual values range from -1000 to 1000.",
  ],
  hints: [
    "For each node, calculate max path through that node",
    "Max path = node.val + max(left_path, 0) + max(right_path, 0)",
    "Return max single path to parent: node.val + max(left, right, 0)",
  ],
  starterCode: {
    javascript: `function binary_tree_max_path_sum() {
// Your code here
}`,
    python: `def binary_tree_max_path_sum():
  # Your code here
  pass`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(n)",
  },
  testCases: [
    {
      input: { root: [1, 2, 3] },
      expected: 6,
      description: "Path 2->1->3 = 6",
    },
    {
      input: { root: [-10, 9, 20, null, null, 15, 7] },
      expected: 42,
      description: "Path 15->20->7 = 42",
    },
    {
      input: { root: [1] },
      expected: 1,
      description: "Single node",
    },
    {
      input: { root: [-3] },
      expected: -3,
      description: "Single negative node",
    },
    {
      input: { root: [2, -1] },
      expected: 2,
      description: "Best path is just root",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "Can the path go through the root? Does it have to?",
    "What if all node values are negative?",
    "Why might you NOT include a subtree in the max path?",
    "What's the difference between the path through a node vs the path returned to parent?",
  ],

  midCodingProbes: [
    {
      trigger: "handling negative values",
      question: "If a subtree sum is negative, should you include it in your path?",
    },
    {
      trigger: "global max vs return value",
      question: "Why do you return something different than what you update the max with?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Returning path through node instead of single branch",
      codeSignals: ["return left + right + node", "return both branches"],
      intervention:
        "A path can't fork when going to a parent. You can only return one branch plus the current node to the parent.",
    },
  ],
}
