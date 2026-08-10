import type { DSAScenario } from "../../types"

export const pathSumIiScenario: DSAScenario = {
  id: "dsa-path-sum-ii",
  title: "Path Sum II",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Find all root-to-leaf paths with given sum",
  tags: ["binary-tree", "dfs", "backtracking"],
  estimatedTime: 25,
  problemStatement: `Given the root of a binary tree and an integer targetSum, return all root-to-leaf paths where the sum of the node values in the path equals targetSum. Each path should be returned as a list of the node values, not node references.`,
  examples: [
    {
      input: "root = [5,4,8,11,null,13,4,7,2,null,null,5,1], targetSum = 22",
      output: "[[5,4,11,2],[5,8,4,5]]",
    },
    { input: "root = [1,2,3], targetSum = 5", output: "[]" },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [0, 5000].",
    "-1000 <= Node.val <= 1000",
    "-1000 <= targetSum <= 1000",
  ],
  hints: [
    "Use DFS with backtracking",
    "Track current path and remaining sum",
    "Add path to result when at leaf with sum = 0",
    "Remove last node when backtracking",
  ],
  starterCode: {
    javascript: `function pathSum(root, targetSum) {\n  // Write your solution here\n\n}`,
    typescript: `function pathSum(root: TreeNode | null, targetSum: number): number[][] {\n  // Write your solution here\n\n}`,
    python: `def pathSum(root, targetSum):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n^2)", space: "O(n)" },
  testCases: [
    {
      input: { root: [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, 5, 1], targetSum: 22 },
      expected: [
        [5, 4, 11, 2],
        [5, 8, 4, 5],
      ],
      description: "Multiple paths",
    },
    { input: { root: [1, 2, 3], targetSum: 5 }, expected: [], description: "No valid paths" },
    // Neither case had a partial sum that hits the target at an INTERNAL node, so a
    // solution that recorded a path at any matching node instead of requiring a leaf
    // passed. Here the root alone equals the target and would be collected as [[1]].
    {
      input: { root: [1, 2, 3], targetSum: 1 },
      expected: [],
      description: "Root alone matches, but a recorded path must end at a leaf",
    },
  ],
}
