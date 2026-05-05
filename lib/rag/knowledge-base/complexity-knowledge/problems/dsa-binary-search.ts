import type { ProblemComplexityKnowledge } from "../../types"

export const binarySearchComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-binary-search",
  leetcodeNumber: 704,
  slug: "binary-search",
  problemTitle: "Binary Search",
  sourceUrl: "https://leetcode.com/problems/binary-search/editorial/",
  difficulty: "Easy",
  tags: ["Array", "Binary Search"],
  approaches: [
    {
      name: "Standard Binary Search",
      timeComplexity: "O(log n)",
      spaceComplexity: "O(1)",
      tradeOff: "Optimal for sorted array search",
      whenToUse: "When array is sorted and you need to find exact value",
      codePattern: "while left <= right, narrow based on mid comparison",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "leetcode-editorial",
    },
    {
      name: "Lower/Upper Bound Variants",
      timeComplexity: "O(log n)",
      spaceComplexity: "O(1)",
      tradeOff: "Same complexity, finds boundary positions",
      whenToUse: "When finding insertion point or range boundaries",
      codePattern: "while left < right with asymmetric narrowing",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "leetcode-editorial",
    },
  ],
  commonMistakes: [
    "Off-by-one in loop condition (< vs <=)",
    "Integer overflow in mid calculation (use left + (right - left) / 2)",
    "Infinite loop from wrong pointer update",
  ],
  keyOperations: [
    { operation: "Comparison", complexity: "O(1)" },
    { operation: "Search space halved", complexity: "log n iterations" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "leetcode-editorial",
}
