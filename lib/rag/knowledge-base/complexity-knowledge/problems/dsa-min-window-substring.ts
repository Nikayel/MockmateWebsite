import type { ProblemComplexityKnowledge } from "../../types"

export const minWindowSubstringComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-min-window-substring",
  leetcodeNumber: 76,
  slug: "minimum-window-substring",
  problemTitle: "Minimum Window Substring",
  sourceUrl: "https://leetcode.com/problems/minimum-window-substring/",
  difficulty: "Hard",
  tags: ["Hash Table", "String", "Sliding Window"],
  approaches: [
    {
      name: "Sliding Window with Hash Map",
      timeComplexity: "O(n + m)",
      spaceComplexity: "O(m)",
      tradeOff: "Optimal - each character visited at most twice",
      whenToUse: "Standard approach for minimum window problems",
      codePattern: "Expand to find valid window, shrink to minimize",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
    {
      name: "Optimized with Filtered String",
      timeComplexity: "O(n + m)",
      spaceComplexity: "O(m)",
      tradeOff: "Faster when s has many characters not in t",
      whenToUse: "When most characters in s aren't in t",
      codePattern: "Pre-filter s to only characters in t",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Not handling duplicate characters in t correctly",
    "Off-by-one in window boundaries",
    "Shrinking before finding first valid window",
  ],
  keyOperations: [
    { operation: "Character count check", complexity: "O(1)" },
    { operation: "Window expansion/shrinking", complexity: "O(n) total" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
