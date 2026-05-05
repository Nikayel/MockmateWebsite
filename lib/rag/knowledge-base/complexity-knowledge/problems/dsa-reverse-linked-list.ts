import type { ProblemComplexityKnowledge } from "../../types"

export const reverseLinkedListComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-reverse-linked-list",
  leetcodeNumber: 206,
  slug: "reverse-linked-list",
  problemTitle: "Reverse Linked List",
  sourceUrl: "https://leetcode.com/problems/reverse-linked-list/",
  difficulty: "Easy",
  tags: ["Linked List", "Recursion"],
  approaches: [
    {
      name: "Iterative",
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      tradeOff: "Optimal space, no call stack overhead",
      whenToUse: "Preferred approach for production code",
      codePattern: "Three pointers: prev, curr, next",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
    {
      name: "Recursive",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      tradeOff: "Elegant but uses call stack space",
      whenToUse: "When recursion is preferred for clarity",
      codePattern: "Recurse to end, reverse links on way back",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Losing reference to next node before updating link",
    "Not handling empty list or single node",
    "Forgetting to return new head",
  ],
  keyOperations: [
    { operation: "Pointer manipulation", complexity: "O(1)" },
    { operation: "List traversal", complexity: "O(n)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
