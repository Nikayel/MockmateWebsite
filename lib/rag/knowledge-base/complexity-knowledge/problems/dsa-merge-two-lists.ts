import type { ProblemComplexityKnowledge } from "../../types"

export const mergeTwoListsComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-merge-two-lists",
  leetcodeNumber: 21,
  slug: "merge-two-sorted-lists",
  problemTitle: "Merge Two Sorted Lists",
  sourceUrl: "https://leetcode.com/problems/merge-two-sorted-lists/",
  difficulty: "Easy",
  tags: ["Linked List", "Recursion"],
  approaches: [
    {
      name: "Iterative",
      timeComplexity: "O(n + m)",
      spaceComplexity: "O(1)",
      tradeOff: "Optimal space with dummy head technique",
      whenToUse: "Preferred for production - no stack overhead",
      codePattern: "Dummy head, append smaller node each step",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
    {
      name: "Recursive",
      timeComplexity: "O(n + m)",
      spaceComplexity: "O(n + m)",
      tradeOff: "Elegant but uses call stack",
      whenToUse: "When recursion is preferred for clarity",
      codePattern: "Return smaller node with recursive next",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Not handling when one list is empty",
    "Forgetting to advance pointer after appending",
    "Not using dummy head (makes code complex)",
  ],
  keyOperations: [
    { operation: "Comparison", complexity: "O(1)" },
    { operation: "Node append", complexity: "O(1)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
