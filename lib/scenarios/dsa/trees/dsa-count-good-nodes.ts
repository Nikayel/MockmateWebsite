import type { DSAScenario } from "../../types"

export const countGoodNodesScenario: DSAScenario = {
  id: "dsa-count-good-nodes",
  title: "Count Good Nodes in Binary Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Microsoft"],
  description: "Count nodes where the path from root has no greater value.",
  tags: ["tree", "dfs", "recursion"],
  estimatedTime: 20,
  problemStatement: `Given a binary tree root, a node X in the tree is named good if in the path from root to X there are no nodes with a value greater than X.

Return the number of good nodes in the binary tree.`,
  examples: [
    {
      input: "root = [3,1,4,3,null,1,5]",
      output: "4",
      explanation: "Root 3, node 4 (3<4), node 3 (3>=3), node 5 (3<4<5)",
    },
    {
      input: "root = [3,3,null,4,2]",
      output: "3",
      explanation: "Root 3, node 3, node 4",
    },
    {
      input: "root = [1]",
      output: "1",
      explanation: "Root is always good",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [1, 10^5].",
    "-10^4 <= Node.val <= 10^4",
  ],
  hints: [
    "DFS while tracking max value seen so far",
    "If current node >= max, it is good, update max",
    "Pass max to children",
  ],
  starterCode: {
    javascript: `function goodNodes(root) {
// Count good nodes using DFS
}`,
    typescript: `function goodNodes(root: TreeNode): number {
// Count good nodes using DFS
}`,
    python: `def goodNodes(root: TreeNode) -> int:
  # Count good nodes using DFS
  pass`,
    java: `class Solution {
  public int goodNodes(TreeNode root) {
      // Count good nodes using DFS
      return 0;
  }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(h) where h is height",
  },
  testCases: [
    {
      input: { root: [3, 1, 4, 3, null, 1, 5] },
      expected: 4,
      description: "Multiple good nodes",
    },
    {
      input: { root: [3, 3, null, 4, 2] },
      expected: 3,
      description: "Left-heavy tree",
    },
    {
      input: { root: [1] },
      expected: 1,
      description: "Single node",
    },
    // In the trees above no value ever dips below an ancestor and then climbs back, so
    // comparing each node with its PARENT instead of the maximum along the whole path gave
    // the same count. Here node 2 beats its parent 1 but not its grandparent 3.
    {
      input: { root: [3, 1, null, 2] },
      expected: 1,
      description: "Value rises above its parent but stays under an earlier ancestor",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "Is the root always a good node? Why?",
    "What if all nodes have the same value?",
    "What if all values are negative?",
    "What state do you need to pass down the recursion?",
  ],

  midCodingProbes: [
    {
      trigger: "tracking max value",
      question: "What initial value should max start with at the root?",
    },
    {
      trigger: "counting",
      question: "Do you count before or after updating the max?",
    },
  ],
}
