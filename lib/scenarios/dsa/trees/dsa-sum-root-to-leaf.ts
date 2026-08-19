import type { DSAScenario } from "../../types"

export const sumRootToLeafScenario: DSAScenario = {
  id: "dsa-sum-root-to-leaf",
  title: "Sum Root to Leaf Numbers",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google"],
  description: "Add up the numbers each root-to-leaf path spells out",
  tags: ["binary-tree", "dfs"],
  estimatedTime: 20,
  problemStatement: `You're given a binary tree through root, and every node in it stores a single digit, 0 through 9. Reading the digits along any path from the top down to a leaf (a node with no children) spells a decimal number: passing 4, then 0, then 8 produces 408.

Spell out that number for every root-to-leaf path in the tree, then return the sum of all of them.`,
  examples: [
    { input: "root = [3,6,8]", output: "74", explanation: "36 + 38 = 74" },
    { input: "root = [6,2,5,9,3]", output: "1317", explanation: "629 + 623 + 65 = 1317" },
  ],
  constraints: [
    "Between 1 and 1000 nodes are present.",
    "Every value is a single digit, 0 to 9.",
    "No path goes deeper than 10 levels.",
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
