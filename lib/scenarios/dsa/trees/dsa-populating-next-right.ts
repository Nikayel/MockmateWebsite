import type { DSAScenario } from "../../types"

export const populatingNextRightScenario: DSAScenario = {
  id: "dsa-populating-next-right",
  title: "Populating Next Right Pointers in Each Node",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Connect nodes at same level using next pointers",
  tags: ["binary-tree", "bfs", "dfs"],
  estimatedTime: 25,
  problemStatement: `You are given a perfect binary tree where all leaves are on the same level, and every parent has two children.

Populate each next pointer to point to its next right node. If there is no next right node, the next pointer should be set to NULL.

Initially, all next pointers are set to NULL.`,
  examples: [
    {
      input: "root = [1,2,3,4,5,6,7]",
      output: "[1,#,2,3,#,4,5,6,7,#]",
      explanation: "# denotes null next pointers",
    },
    { input: "root = []", output: "[]" },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [0, 2^12 - 1].",
    "-1000 <= Node.val <= 1000",
  ],
  hints: [
    "BFS level by level, connect nodes in same level",
    "For O(1) space: use next pointers from previous level",
    "node.left.next = node.right",
    "node.right.next = node.next?.left",
  ],
  starterCode: {
    javascript: `function connect(root) {\n  // Write your solution here\n\n}`,
    typescript: `function connect(root: Node | null): Node | null {\n  // Write your solution here\n\n}`,
    python: `def connect(root):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    {
      input: { root: [1, 2, 3, 4, 5, 6, 7] },
      expected: [1, "#", 2, 3, "#", 4, 5, 6, 7, "#"],
      description: "Perfect binary tree",
    },
    { input: { root: [] }, expected: [], description: "Empty tree" },
  ],
}
