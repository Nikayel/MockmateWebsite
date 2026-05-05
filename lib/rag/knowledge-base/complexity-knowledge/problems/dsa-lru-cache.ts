import type { ProblemComplexityKnowledge } from "../../types"

export const lruCacheComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-lru-cache",
  leetcodeNumber: 146,
  slug: "lru-cache",
  problemTitle: "LRU Cache",
  sourceUrl: "https://leetcode.com/problems/lru-cache/",
  difficulty: "Medium",
  tags: ["Hash Table", "Linked List", "Design", "Doubly-Linked List"],
  approaches: [
    {
      name: "Hash Map + Doubly Linked List",
      timeComplexity: "O(1)",
      spaceComplexity: "O(capacity)",
      tradeOff: "Optimal O(1) for both get and put",
      whenToUse: "Standard approach - required for O(1) operations",
      codePattern: "Map for lookup, DLL for order tracking",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Using singly linked list (can't remove in O(1))",
    "Not updating order on get (only on put)",
    "Off-by-one in capacity checking",
  ],
  keyOperations: [
    { operation: "Get", complexity: "O(1)" },
    { operation: "Put", complexity: "O(1)" },
    { operation: "Move to front", complexity: "O(1)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
