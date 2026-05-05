import type { ProblemComplexityKnowledge } from "../../types"

export const dailyTemperaturesComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-daily-temperatures",
  leetcodeNumber: 739,
  slug: "daily-temperatures",
  problemTitle: "Daily Temperatures",
  sourceUrl: "https://leetcode.com/problems/daily-temperatures/",
  difficulty: "Medium",
  tags: ["Array", "Stack", "Monotonic Stack"],
  approaches: [
    {
      name: "Monotonic Stack",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      tradeOff: "Each element pushed and popped at most once",
      whenToUse: "Classic next greater element pattern",
      codePattern: "Maintain decreasing stack of indices",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
    {
      name: "Brute Force",
      timeComplexity: "O(n^2)",
      spaceComplexity: "O(1)",
      tradeOff: "Simple but slow",
      whenToUse: "Only for understanding",
      codePattern: "For each day, search forward for warmer day",
      isOptimalTime: false,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Not understanding monotonic stack invariant",
    "Storing values instead of indices in stack",
    "Not computing days difference correctly",
  ],
  keyOperations: [
    { operation: "Stack push/pop", complexity: "O(1)" },
    { operation: "Each element processed once", complexity: "O(n) total" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
