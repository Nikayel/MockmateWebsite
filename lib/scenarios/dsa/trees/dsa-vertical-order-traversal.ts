import type { DSAScenario } from "../../types"

export const verticalOrderTraversalScenario: DSAScenario = {
  id: "dsa-vertical-order-traversal",
  title: "Vertical Order Traversal of a Binary Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "hard",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "Bloomberg"],
  description: "Return vertical order traversal with special ordering rules",
  tags: ["binary-tree", "bfs", "dfs", "sorting", "hash-table"],
  estimatedTime: 35,
  problemStatement: `Given the root of a binary tree, calculate the vertical order traversal of the binary tree.

For each node at position (row, col), its left and right children will be at positions (row + 1, col - 1) and (row + 1, col + 1) respectively. The root is at (0, 0).

The vertical order traversal of a binary tree is a list of top-to-bottom orderings for each column index starting from the leftmost column and ending on the rightmost column. If two nodes are in the same row and column, order them by their values.`,
  examples: [
    { input: "root = [3,9,20,null,null,15,7]", output: "[[9],[3,15],[20],[7]]" },
    { input: "root = [1,2,3,4,5,6,7]", output: "[[4],[2],[1,5,6],[3],[7]]" },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [1, 1000].",
    "0 <= Node.val <= 1000",
  ],
  hints: [
    "Track (col, row, val) for each node",
    "Use BFS or DFS to traverse",
    "Sort by col, then row, then val",
    "Group by column for final result",
  ],
  starterCode: {
    javascript: `function verticalTraversal(root) {\n  // Track col, row, val and sort\n}`,
    typescript: `function verticalTraversal(root: TreeNode | null): number[][] {\n  // Track col, row, val and sort\n}`,
    python: `def verticalTraversal(root: Optional[TreeNode]) -> list[list[int]]:\n    # Track col, row, val and sort\n    pass`,
    java: `class Solution {\n    public List<List<Integer>> verticalTraversal(TreeNode root) {\n        // Track col, row, val and sort\n        return new ArrayList<>();\n    }\n}`,
  },
  optimalComplexity: { time: "O(n log n)", space: "O(n)" },
  testCases: [
    {
      input: { root: [3, 9, 20, null, null, 15, 7] },
      expected: [[9], [3, 15], [20], [7]],
      description: "Standard vertical traversal",
    },
    {
      input: { root: [1, 2, 3, 4, 5, 6, 7] },
      expected: [[4], [2], [1, 5, 6], [3], [7]],
      description: "Same position nodes sorted by value",
    },
  ],
}
