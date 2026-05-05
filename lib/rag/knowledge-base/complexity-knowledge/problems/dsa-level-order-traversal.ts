import type { ProblemComplexityKnowledge } from "../../types"

export const levelOrderTraversalComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-level-order-traversal",
  leetcodeNumber: 102,
  slug: "binary-tree-level-order-traversal",
  problemTitle: "Binary Tree Level Order Traversal",
  sourceUrl: "https://leetcode.com/problems/binary-tree-level-order-traversal/",
  difficulty: "Medium",
  tags: ["Tree", "Breadth-First Search", "Binary Tree"],
  approaches: [
    {
      name: "BFS with Queue",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      tradeOff: "Standard BFS, space for widest level",
      whenToUse: "Classic approach for level order",
      codePattern: "Process level by level using queue size",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
    {
      name: "DFS with Level Tracking",
      timeComplexity: "O(n)",
      spaceComplexity: "O(h)",
      tradeOff: "Uses recursion stack instead of queue",
      whenToUse: "When you prefer DFS",
      codePattern: "Pass level index, add to correct list",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Not processing entire level before moving to next",
    "Using queue.length in loop condition (changes during loop)",
  ],
  keyOperations: [
    { operation: "Queue operations", complexity: "O(1)" },
    { operation: "Process all nodes", complexity: "O(n)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
