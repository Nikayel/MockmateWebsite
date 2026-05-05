import type { ProblemComplexityKnowledge } from "../../types"

export const linkedListCycleComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-linked-list-cycle",
  leetcodeNumber: 141,
  slug: "linked-list-cycle",
  problemTitle: "Linked List Cycle",
  sourceUrl: "https://leetcode.com/problems/linked-list-cycle/",
  difficulty: "Easy",
  tags: ["Hash Table", "Linked List", "Two Pointers"],
  approaches: [
    {
      name: "Floyd's Cycle Detection (Two Pointers)",
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      tradeOff: "Optimal in both time and space",
      whenToUse: "Always - this is the standard approach",
      codePattern: "Slow and fast pointers, cycle if they meet",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
    {
      name: "Hash Set",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      tradeOff: "Simple but uses extra space",
      whenToUse: "When Floyd's is confusing",
      codePattern: "Store visited nodes, check for revisit",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Not handling empty list or single node",
    "Wrong termination condition for fast pointer",
    "Checking fast.next before checking fast",
  ],
  keyOperations: [
    { operation: "Pointer advancement", complexity: "O(1)" },
    { operation: "Cycle detection", complexity: "O(n) iterations max" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
