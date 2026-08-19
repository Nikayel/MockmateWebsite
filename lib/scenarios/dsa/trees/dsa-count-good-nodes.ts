import type { DSAScenario } from "../../types"

export const countGoodNodesScenario: DSAScenario = {
  id: "dsa-count-good-nodes",
  title: "Count Good Nodes in Binary Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Microsoft"],
  description: "Count nodes at least as large as everything above them on their root path.",
  tags: ["tree", "dfs", "recursion"],
  estimatedTime: 20,
  problemStatement: `You're given the root of a binary tree. Call a node good when no node on the walk from the root down to it carries a value strictly greater than its own; matching an ancestor's value is fine.

Count how many good nodes the tree contains and return that number.`,
  examples: [
    {
      input: "root = [6,2,7,6,null,8,9]",
      output: "5",
      explanation:
        "Good: the root, the deeper 6 (a tie still counts), 7, 8, and 9; node 2 sits below a bigger ancestor",
    },
    {
      input: "root = [5,5,null,7,1]",
      output: "3",
      explanation: "The root, the second 5, and 7 qualify",
    },
    {
      input: "root = [8]",
      output: "1",
      explanation: "A lone root has nothing above it, so it always counts",
    },
  ],
  constraints: [
    "The tree size runs from 1 to 10^5 nodes.",
    "Values may be anywhere from -10^4 to 10^4.",
  ],
  hints: [
    "DFS while tracking max value seen so far",
    "If current node >= max, it is good, update max",
    "Pass max to children",
  ],
  starterCode: {
    javascript: `function goodNodes(root) {
// Write your solution here
}`,
    typescript: `function goodNodes(root: TreeNode): number {
// Write your solution here
}`,
    python: `def goodNodes(root: TreeNode) -> int:
  # Write your solution here
  pass`,
    java: `class Solution {
  public int goodNodes(TreeNode root) {
      // Write your solution here
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
