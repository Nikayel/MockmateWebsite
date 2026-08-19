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
  problemStatement: `You're handed root, the top of a perfect binary tree: every internal node has both children, and all of the leaves sit together on the bottom level. Each node also carries an extra next pointer, and every next starts out as NULL.

Thread each level into a rightward chain: a node's next should reference whichever node stands immediately to its right on the same level. The last node of a level has nothing to its right, so its next keeps its NULL value. Return root once the wiring is done.`,
  examples: [
    {
      input: "root = [5,9,2,10,4,6,11]",
      output: "[5,#,9,2,#,10,4,6,11,#]",
      explanation: "Reading each level left to right via next, # marks where a next is null",
    },
    { input: "root = []", output: "[]" },
  ],
  constraints: [
    "The tree carries between 0 and 2^12 - 1 nodes.",
    "Values run from -1000 through 1000.",
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
