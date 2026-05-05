import type { ProblemComplexityKnowledge } from "../../types"

export const invertBinaryTreeComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-invert-binary-tree",
  leetcodeNumber: 226,
  slug: "invert-binary-tree",
  problemTitle: "Invert Binary Tree",
  sourceUrl: "https://leetcode.com/problems/invert-binary-tree/",
  difficulty: "Easy",
  tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
  approaches: [
    {
      name: "Recursive DFS",
      timeComplexity: "O(n)",
      spaceComplexity: "O(h)",
      tradeOff: "Simple and elegant, stack space for recursion",
      whenToUse: "Preferred for clean code",
      codePattern: "Swap children, recurse on both",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
    {
      name: "Iterative BFS",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      tradeOff: "Uses queue, space for widest level",
      whenToUse: "When you want to avoid recursion",
      codePattern: "Queue-based level order, swap each node's children",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: ["Not handling null nodes", "Swapping references wrong (need temp variable)"],
  keyOperations: [
    { operation: "Node swap", complexity: "O(1)" },
    { operation: "Tree traversal", complexity: "O(n)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
