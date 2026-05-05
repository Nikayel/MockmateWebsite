import type { DSAScenario } from "../../types"

export const pathSumScenario: DSAScenario = {
  id: "dsa-path-sum",
  title: "Path Sum",
  type: "dsa",
  pattern: "trees",
  difficulty: "easy",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Check if tree has root-to-leaf path with given sum",
  tags: ["binary-tree", "dfs", "recursion"],
  estimatedTime: 15,
  problemStatement: `Given the root of a binary tree and an integer targetSum, return true if the tree has a root-to-leaf path such that adding up all the values along the path equals targetSum.

A leaf is a node with no children.`,
  examples: [
    {
      input: "root = [5,4,8,11,null,13,4,7,2,null,null,null,1], targetSum = 22",
      output: "true",
      explanation: "Path 5 → 4 → 11 → 2 = 22",
    },
    { input: "root = [1,2,3], targetSum = 5", output: "false" },
    { input: "root = [], targetSum = 0", output: "false" },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [0, 5000].",
    "-1000 <= Node.val <= 1000",
    "-1000 <= targetSum <= 1000",
  ],
  hints: [
    "Use DFS, subtracting node value from targetSum",
    "At leaf, check if remaining sum equals node value",
    "Handle empty tree case",
  ],
  starterCode: {
    javascript: `function hasPathSum(root, targetSum) {\n  // Write your solution here\n\n}`,
    typescript: `function hasPathSum(root: TreeNode | null, targetSum: number): boolean {\n  // Write your solution here\n\n}`,
    python: `def hasPathSum(root, targetSum):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(h)" },
  testCases: [
    {
      input: { root: [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1], targetSum: 22 },
      expected: true,
      description: "Valid path exists",
    },
    { input: { root: [1, 2, 3], targetSum: 5 }, expected: false, description: "No valid path" },
    { input: { root: [], targetSum: 0 }, expected: false, description: "Empty tree" },
  ],
}
