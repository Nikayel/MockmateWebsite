import type { ProblemComplexityKnowledge } from "../../types"

export const medianTwoArraysComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-median-two-arrays",
  leetcodeNumber: 4,
  slug: "median-of-two-sorted-arrays",
  problemTitle: "Median of Two Sorted Arrays",
  sourceUrl: "https://leetcode.com/problems/median-of-two-sorted-arrays/editorial/",
  difficulty: "Hard",
  tags: ["Array", "Binary Search", "Divide and Conquer"],
  approaches: [
    {
      name: "Merge Sort",
      timeComplexity: "O(m + n)",
      spaceComplexity: "O(1)",
      tradeOff: "Simple but doesn't meet O(log) requirement",
      whenToUse: "When O(m+n) time is acceptable",
      codePattern: "Two pointers merging until median position",
      isOptimalTime: false,
      isOptimalSpace: true,
      source: "leetcode-editorial",
    },
    {
      name: "Binary Search on Partition",
      timeComplexity: "O(log(min(m, n)))",
      spaceComplexity: "O(1)",
      tradeOff: "Optimal - meets the O(log) requirement",
      whenToUse: "When you need O(log) time complexity",
      codePattern: "Binary search partition point in smaller array",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "leetcode-editorial",
    },
  ],
  commonMistakes: [
    "Not binary searching on the smaller array",
    "Handling edge cases when partition is at extremes",
    "Off-by-one in median calculation for even/odd total length",
  ],
  keyOperations: [
    { operation: "Partition validation", complexity: "O(1)" },
    { operation: "Binary search iterations", complexity: "O(log min(m,n))" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "leetcode-editorial",
}
