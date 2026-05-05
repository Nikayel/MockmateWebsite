import type { ProblemComplexityKnowledge } from "../../types"

export const findMinRotatedComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-find-min-rotated",
  leetcodeNumber: 153,
  slug: "find-minimum-in-rotated-sorted-array",
  problemTitle: "Find Minimum in Rotated Sorted Array",
  sourceUrl: "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/",
  difficulty: "Medium",
  tags: ["Array", "Binary Search"],
  approaches: [
    {
      name: "Binary Search",
      timeComplexity: "O(log n)",
      spaceComplexity: "O(1)",
      tradeOff: "Optimal for this problem",
      whenToUse: "Standard approach - compare mid with right",
      codePattern: "If mid > right, min is in right half",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Comparing with wrong element (should compare mid with right, not left)",
    "Not handling non-rotated array case",
    "Wrong pointer update causing infinite loop",
  ],
  keyOperations: [{ operation: "Binary search", complexity: "O(log n)" }],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
