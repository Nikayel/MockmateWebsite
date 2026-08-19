import type { DSAScenario } from "../../types"

export const verticalOrderTraversalScenario: DSAScenario = {
  id: "dsa-vertical-order-traversal",
  title: "Vertical Order Traversal of a Binary Tree",
  type: "dsa",
  pattern: "trees",
  difficulty: "hard",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "Bloomberg"],
  description: "Read a binary tree column by column under strict tie rules",
  tags: ["binary-tree", "bfs", "dfs", "sorting", "hash-table"],
  estimatedTime: 35,
  problemStatement: `You're given the root of a binary tree and need to report its nodes in vertical slices. Coordinates come from the walk down: root occupies row 0, column 0, and a node standing at (row, col) places its left child at (row + 1, col - 1) and its right child at (row + 1, col + 1).

A slice gathers every node that shares one column. Emit the slices from the leftmost column through the rightmost. Within a single slice, a node in a higher row (closer to root) comes before a node in a lower row, and whenever two nodes collide on the exact same row and column, the smaller value is listed first.

Return the slices as a list of lists.`,
  examples: [
    { input: "root = [6,10,14,null,null,12,8]", output: "[[10],[6,12],[14],[8]]" },
    {
      input: "root = [2,6,3,9,4,1,8]",
      output: "[[9],[6],[2,1,4],[3],[8]]",
      explanation: "4 and 1 collide at row 2, column 0, so the smaller value 1 comes first",
    },
  ],
  constraints: ["Node count runs from 1 to 1000.", "Values are non-negative, from 0 up to 1000."],
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
    // In both cases above the column's values already arrive in the right order, so dropping
    // the value tie-break (BFS order) and dropping the row ordering (sorting the whole
    // column) each still passed. Here column 0 holds 5 at the top and 1, 2 two rows below:
    // BFS reaches 2 first, and a full sort would put 1 and 2 ahead of the root.
    {
      input: { root: [5, 3, 4, null, 2, 1, null] },
      expected: [[3], [5, 1, 2], [4]],
      description: "Column 0 needs row order first, then value order within a row",
    },
  ],
}
