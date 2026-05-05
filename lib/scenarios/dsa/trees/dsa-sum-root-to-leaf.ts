import type { DSAScenario } from "../../types"

export const sumRootToLeafScenario: DSAScenario = {
  id: "dsa-sum-root-to-leaf",
  title: "Sum Root to Leaf Numbers",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google"],
  description: "Sum all root-to-leaf numbers formed by paths",
  tags: ["binary-tree", "dfs"],
  estimatedTime: 20,
  problemStatement: `You are given the root of a binary tree containing digits from 0 to 9 only. Each root-to-leaf path in the tree represents a number.

Return the total sum of all root-to-leaf numbers.`,
  examples: [
    { input: "root = [1,2,3]", output: "25", explanation: "12 + 13 = 25" },
    { input: "root = [4,9,0,5,1]", output: "1026", explanation: "495 + 491 + 40 = 1026" },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [1, 1000].",
    "0 <= Node.val <= 9",
    "The depth of the tree will not exceed 10.",
  ],
  hints: [
    "DFS passing current number formed so far",
    "At each node: num = num * 10 + node.val",
    "At leaf, add num to total",
  ],
  starterCode: {
    javascript: `function sumNumbers(root) {\n  // Write your solution here\n\n}`,
    typescript: `function sumNumbers(root: TreeNode | null): number {\n  // Write your solution here\n\n}`,
    python: `def sumNumbers(root):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(h)" },
  testCases: [
    { input: { root: [1, 2, 3] }, expected: 25, description: "12 + 13" },
    { input: { root: [4, 9, 0, 5, 1] }, expected: 1026, description: "495 + 491 + 40" },
  ],
}
