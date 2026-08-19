import type { DSAScenario } from "../../types"

export const binaryTreeZigzagScenario: DSAScenario = {
  id: "dsa-binary-tree-zigzag",
  title: "Binary Tree Zigzag Level Order Traversal",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "Apple", "Bloomberg"],
  description: "Traverse a binary tree by levels while the reading direction flips each depth",
  tags: ["binary-tree", "deque", "bfs"],
  estimatedTime: 25,
  problemStatement: `You're given the root of a binary tree. Produce its zigzag level order traversal: read the top level left to right, read the level beneath it right to left, and keep flipping direction on every level after that.

Return one array of values per level, top level first.

\`\`\`
      6
     / \\
    2   14
        / \\
       9   17
\`\`\`

Output: [[6], [14, 2], [9, 17]]`,
  examples: [
    { input: "root = [6,2,14,null,null,9,17]", output: "[[6],[14,2],[9,17]]" },
    { input: "root = [4]", output: "[[4]]" },
    { input: "root = []", output: "[]" },
  ],
  constraints: [
    "The node count sits anywhere in 0 to 2000.",
    "Node values are confined to -100 through 100.",
  ],
  hints: [
    "Use BFS with level tracking",
    "Alternate direction each level",
    "Can reverse every other level, or use deque to add from different ends",
    "Track even/odd levels",
  ],
  starterCode: {
    javascript: `function zigzagLevelOrder(root) {\n  // Write your solution here\n}`,
    typescript: `function zigzagLevelOrder(root: TreeNode | null): number[][] {\n  // Write your solution here\n}`,
    python: `def zigzagLevelOrder(root: Optional[TreeNode]) -> list[list[int]]:\n    # Write your solution here\n    pass`,
    java: `class Solution {\n    public List<List<Integer>> zigzagLevelOrder(TreeNode root) {\n        // Write your solution here\n        return new ArrayList<>();\n    }\n}`,
  },
  optimalComplexity: { time: "O(n)", space: "O(n)" },
  testCases: [
    {
      input: { root: [3, 9, 20, null, null, 15, 7] },
      expected: [[3], [20, 9], [15, 7]],
      description: "Standard zigzag",
    },
    { input: { root: [1] }, expected: [[1]], description: "Single node" },
    { input: { root: [] }, expected: [], description: "Empty tree" },
    // The standard tree has only one node with children on its second level, so reversing
    // the order children are ENQUEUED looks the same as reversing the level's values. On a
    // full three-level tree the two come apart: that approach yields [6,7,4,5] here.
    {
      input: { root: [1, 2, 3, 4, 5, 6, 7] },
      expected: [[1], [3, 2], [4, 5, 6, 7]],
      description: "Full tree: reversing child order is not the same as reversing the level",
    },
  ],
}
