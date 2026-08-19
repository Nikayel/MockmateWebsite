import type { DSAScenario } from "../../types"

export const pathSumScenario: DSAScenario = {
  id: "dsa-path-sum",
  title: "Path Sum",
  type: "dsa",
  pattern: "trees",
  difficulty: "easy",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Decide whether any root-to-leaf path hits a target total",
  tags: ["binary-tree", "dfs", "recursion"],
  estimatedTime: 15,
  problemStatement: `You're given the root of a binary tree and an integer targetSum. Consider every route that begins at root, follows child pointers downward, and finishes at a leaf, a node with no children. Total the values met along the way.

Return true if at least one root-to-leaf route totals exactly targetSum, and false when none does. The finish line matters here: an internal node whose running total happens to match doesn't count, and an empty tree contains no routes at all, so its answer is false.`,
  examples: [
    {
      input: "root = [8,5,11,2,null,16,6,4,7,null,null,null,3], targetSum = 19",
      output: "true",
      explanation: "The route 8 -> 5 -> 2 -> 4 totals 19",
    },
    { input: "root = [4,6,2], targetSum = 3", output: "false" },
    { input: "root = [], targetSum = 5", output: "false" },
  ],
  constraints: [
    "The node count ranges from 0 up to 5000.",
    "Each value lies within -1000 to 1000.",
    "targetSum stays inside -1000 to 1000 as well.",
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
    // No case had a partial sum that hits the target at an INTERNAL node, so a solution
    // that stopped at any matching node instead of requiring a leaf passed. Here the root
    // alone equals the target, but 1->2 and 1->3 are the only root-to-leaf paths.
    {
      input: { root: [1, 2, 3], targetSum: 1 },
      expected: false,
      description: "Root alone matches, but the path must end at a leaf",
    },
  ],
}
