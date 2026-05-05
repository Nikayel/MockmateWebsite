import type { ProblemComplexityKnowledge } from "../../types"

export const binaryTreeMaxPathComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-binary-tree-max-path",
  leetcodeNumber: 124,
  slug: "binary-tree-maximum-path-sum",
  problemTitle: "Binary Tree Maximum Path Sum",
  sourceUrl: "https://leetcode.com/problems/binary-tree-maximum-path-sum/",
  difficulty: "Hard",
  tags: ["Dynamic Programming", "Tree", "Depth-First Search", "Binary Tree"],
  approaches: [
    {
      name: "Recursive DFS",
      timeComplexity: "O(n)",
      spaceComplexity: "O(h)",
      tradeOff: "Track max path through each node",
      whenToUse: "Standard approach for this problem",
      codePattern: "At each node, consider path through it vs extending up",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Not handling negative values correctly",
    "Confusing 'path through node' with 'path extending from node'",
    "Not initializing max to negative infinity",
  ],
  keyOperations: [
    { operation: "Postorder traversal", complexity: "O(n)" },
    { operation: "Max calculation at node", complexity: "O(1)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
