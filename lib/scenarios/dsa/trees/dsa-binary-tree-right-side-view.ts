import type { DSAScenario } from "../../types"

export const binaryTreeRightSideViewScenario: DSAScenario = {
  id: "dsa-binary-tree-right-side-view",
  title: "Binary Tree Right Side View",
  type: "dsa",
  pattern: "trees",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Return the values of nodes visible from the right side.",
  tags: ["tree", "bfs", "dfs"],
  estimatedTime: 20,
  problemStatement: `Given the root of a binary tree, imagine yourself standing on the right side of it, return the values of the nodes you can see ordered from top to bottom.

Example:

\`\`\`
    1
   / \\
  2   3
   \\   \\
    5   4
\`\`\`

Standing on the right side you see [1, 3, 4].`,
  examples: [
    {
      input: "root = [1,2,3,null,5,null,4]",
      output: "[1,3,4]",
    },
    {
      input: "root = [1,null,3]",
      output: "[1,3]",
    },
    {
      input: "root = []",
      output: "[]",
    },
  ],
  constraints: [
    "The number of nodes in the tree is in the range [0, 100].",
    "-100 <= Node.val <= 100",
  ],
  hints: [
    "Use BFS, take last node of each level",
    "Or use DFS, visit right child first, track depth",
    "First node at each depth (going right first) is visible",
  ],
  starterCode: {
    javascript: `function rightSideView(root) {
// Return nodes visible from right side
}`,
    typescript: `function rightSideView(root: TreeNode | null): number[] {
// Return nodes visible from right side
}`,
    python: `def rightSideView(root: Optional[TreeNode]) -> list[int]:
  # Return nodes visible from right side
  pass`,
    java: `class Solution {
  public List<Integer> rightSideView(TreeNode root) {
      // Return nodes visible from right side
      return new ArrayList<>();
  }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(h) where h is height",
  },
  testCases: [
    {
      input: { root: [1, 2, 3, null, 5, null, 4] },
      expected: [1, 3, 4],
      description: "Standard tree",
    },
    {
      input: { root: [1, null, 3] },
      expected: [1, 3],
      description: "Right-skewed tree",
    },
    {
      input: { root: [] },
      expected: [],
      description: "Empty tree",
    },
    // In both trees above the right spine reaches every level, so just walking right
    // children (or preferring right, falling back to left) produced the whole answer. Here
    // the right subtree stops early and the deepest visible node is a LEFT child.
    {
      input: { root: [1, 2, 3, 4] },
      expected: [1, 3, 4],
      description: "Deepest visible node is a left child; the right spine ends early",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What if the tree is left-skewed? Would you still see all nodes from the right?",
    "How is this different from level order traversal?",
    "Could you solve this with DFS? Which order would you traverse?",
    "What's the space complexity of BFS vs DFS for this problem?",
  ],

  midCodingProbes: [
    {
      trigger: "BFS level processing",
      question: "How do you know which node is the last in each level?",
    },
    {
      trigger: "DFS approach",
      question: "If using DFS, why visit right child before left?",
    },
  ],
}
