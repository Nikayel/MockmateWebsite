import type { DSAPatternKnowledge } from "../../types"

export const treesKnowledge: DSAPatternKnowledge = {
  pattern: "trees",
  displayName: "Binary Trees",
  description:
    "Hierarchical data structure with recursive nature. Most tree problems use DFS (recursion) or BFS (level-order). Master both traversal patterns.",
  whenToUse: [
    "Any hierarchical data problem",
    "Path sum problems",
    "Tree traversal (inorder, preorder, postorder)",
    "Finding ancestors or descendants",
    "Validating tree properties (BST, balanced)",
  ],
  keyInsights: [
    "Most tree problems are naturally recursive",
    "Think about: what does each node need to return?",
    "DFS for depth-related problems, BFS for level-related",
    "Base case is usually null node",
  ],
  commonMistakes: [
    "Forgetting to handle null nodes",
    "Incorrect recursion base case",
    "Modifying tree during traversal incorrectly",
    "Confusing inorder/preorder/postorder",
  ],
  timeComplexity: {
    typical: "O(n) - visit each node once",
    best: "O(1) for leaf operations",
    worst: "O(n) for unbalanced trees",
  },
  spaceComplexity: {
    typical: "O(h) where h is height",
    notes: "O(log n) for balanced, O(n) for skewed trees",
  },
  relatedPatterns: ["graphs", "dp-1d", "bfs"],
  prerequisites: ["arrays-hashing", "stack"],
  codeTemplate: `def dfs(node):
  if not node:
      return base_case

  left = dfs(node.left)
  right = dfs(node.right)

  # Combine results
  return combine(node.val, left, right)`,
  examples: [
    "Maximum Depth of Binary Tree",
    "Invert Binary Tree",
    "Validate Binary Search Tree",
    "Lowest Common Ancestor",
  ],
  interviewTips: [
    "Ask about tree properties: BST? Balanced? Complete?",
    "Consider both recursive and iterative solutions",
    "Draw the tree and trace through your algorithm",
  ],
}
