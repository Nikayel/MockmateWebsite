import type { ProblemComplexityKnowledge } from "../../types"

export const longestRepeatingReplacementComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-longest-repeating-replacement",
  leetcodeNumber: 424,
  slug: "longest-repeating-character-replacement",
  problemTitle: "Longest Repeating Character Replacement",
  sourceUrl: "https://leetcode.com/problems/longest-repeating-character-replacement/",
  difficulty: "Medium",
  tags: ["Hash Table", "String", "Sliding Window"],
  approaches: [
    {
      name: "Sliding Window",
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      tradeOff: "Optimal - 26 letters means O(1) space",
      whenToUse: "Standard approach for this problem",
      codePattern: "Window valid when length - maxCount <= k",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Recalculating max frequency from scratch (not needed)",
    "Not understanding the window validity condition",
    "Shrinking window unnecessarily - maxCount only needs to increase",
  ],
  keyOperations: [
    { operation: "Character count update", complexity: "O(1)" },
    { operation: "Window expansion", complexity: "O(n) total" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
