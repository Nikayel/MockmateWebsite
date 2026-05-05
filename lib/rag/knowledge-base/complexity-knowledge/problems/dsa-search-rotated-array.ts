import type { ProblemComplexityKnowledge } from "../../types"

export const searchRotatedArrayComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-search-rotated-array",
  leetcodeNumber: 33,
  slug: "search-in-rotated-sorted-array",
  problemTitle: "Search in Rotated Sorted Array",
  sourceUrl: "https://leetcode.com/problems/search-in-rotated-sorted-array/",
  difficulty: "Medium",
  tags: ["Array", "Binary Search"],
  approaches: [
    {
      name: "Modified Binary Search",
      timeComplexity: "O(log n)",
      spaceComplexity: "O(1)",
      tradeOff: "Optimal - one pass binary search",
      whenToUse: "Standard approach - determine which half is sorted",
      codePattern: "Check which half is sorted, then narrow search",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
    {
      name: "Find Pivot + Binary Search",
      timeComplexity: "O(log n)",
      spaceComplexity: "O(1)",
      tradeOff: "Two binary searches but easier to understand",
      whenToUse: "If single-pass approach is confusing",
      codePattern: "Find rotation point, then binary search correct half",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Not handling the case where array isn't rotated",
    "Wrong comparison to determine sorted half",
    "Off-by-one when target equals boundary",
  ],
  keyOperations: [
    { operation: "Determine sorted half", complexity: "O(1)" },
    { operation: "Binary search", complexity: "O(log n)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
