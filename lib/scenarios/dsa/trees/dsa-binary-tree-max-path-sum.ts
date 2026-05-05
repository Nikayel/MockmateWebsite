import type { DSAScenario } from "../../types"

export const binaryTreeMaxPathSumScenario: DSAScenario = {
  id: "dsa-binary-tree-max-path-sum",
  title: "Binary Tree Maximum Path Sum",
  type: "dsa",
  pattern: "trees",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta"],
  description: "Find the maximum path sum in a binary tree.",
  tags: ["tree", "dfs", "recursion"],
  estimatedTime: 30,
  problemStatement: `A path in a binary tree is a sequence of nodes where each pair of adjacent nodes has an edge. A node can only appear once in the sequence. The path sum is the sum of the node values. Return the maximum path sum of any non-empty path.`,
  examples: [
    {
      input: "root = [1,2,3]",
      output: "6",
      explanation: "Path is 2->1->3",
    },
    {
      input: "root = [-10,9,20,null,null,15,7]",
      output: "42",
      explanation: "Path is 15->20->7",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [1, 3 * 10^4].",
    "-1000 <= Node.val <= 1000",
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
