import type { ProblemComplexityKnowledge } from "../../types"

export const longestSubstringComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-longest-substring",
  leetcodeNumber: 3,
  slug: "longest-substring-without-repeating-characters",
  problemTitle: "Longest Substring Without Repeating Characters",
  sourceUrl: "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
  difficulty: "Medium",
  tags: ["Hash Table", "String", "Sliding Window"],
  approaches: [
    {
      name: "Sliding Window with Hash Map",
      timeComplexity: "O(n)",
      spaceComplexity: "O(min(m, n))",
      tradeOff: "Optimal time, space bounded by charset size",
      whenToUse: "Standard approach for this type of problem",
      codePattern: "Expand right, shrink left when duplicate found",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
    {
      name: "Sliding Window with Array (ASCII)",
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      tradeOff: "Faster constant operations, fixed charset",
      whenToUse: "When input is only ASCII characters",
      codePattern: "Use 128-element array instead of hash map",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Not updating the left pointer correctly when duplicate found",
    "Using last occurrence index instead of current window tracking",
    "Forgetting m is charset size in space complexity",
  ],
  keyOperations: [
    { operation: "Hash map/set operations", complexity: "O(1)" },
    { operation: "Window expansion", complexity: "O(n) total" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
