import type { DSAScenario } from "../../types"

export const pathSumIiScenario: DSAScenario = {
  id: "dsa-path-sum-ii",
  title: "Path Sum II",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Collect every root-to-leaf path that adds up to a target",
  tags: ["binary-tree", "dfs", "backtracking"],
  estimatedTime: 25,
  problemStatement: `You're given the root of a binary tree along with an integer targetSum. A root-to-leaf path starts at root, follows child links downward, and stops at a leaf, meaning a node with no children.

Collect every root-to-leaf path whose values total exactly targetSum. Report each qualifying path as the list of values along it, ordered from root to leaf, and return all of those lists together. The result holds plain values, never the nodes themselves.`,
  examples: [
    {
      input: "root = [7,3,10,6,null,12,5,4,9,null,null,3,8], targetSum = 25",
      output: "[[7,3,6,9],[7,10,5,3]]",
    },
    { input: "root = [2,4,6], targetSum = 9", output: "[]" },
  ],
  constraints: [
    "Expect anywhere from 0 to 5000 nodes.",
    "Node values span -1000 to 1000.",
    "targetSum also falls between -1000 and 1000.",
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
