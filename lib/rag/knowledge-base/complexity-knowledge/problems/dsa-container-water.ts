import type { ProblemComplexityKnowledge } from "../../types"

export const containerWaterComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-container-water",
  leetcodeNumber: 11,
  slug: "container-with-most-water",
  problemTitle: "Container With Most Water",
  sourceUrl: "https://leetcode.com/problems/container-with-most-water/",
  difficulty: "Medium",
  tags: ["Array", "Two Pointers", "Greedy"],
  approaches: [
    {
      name: "Two Pointers",
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      tradeOff: "Optimal - greedy choice to move shorter line inward",
      whenToUse: "Always - this is the standard approach",
      codePattern: "Start at ends, move pointer with shorter line",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
    {
      name: "Brute Force",
      timeComplexity: "O(n^2)",
      spaceComplexity: "O(1)",
      tradeOff: "Simple but too slow for large inputs",
      whenToUse: "Only for understanding the problem",
      codePattern: "Check all pairs of lines",
      isOptimalTime: false,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Not understanding why moving shorter line is correct (greedy proof)",
    "Calculating area incorrectly (min height * width)",
  ],
  keyOperations: [
    { operation: "Area calculation", complexity: "O(1)" },
    { operation: "Pointer movement", complexity: "O(n) total" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
