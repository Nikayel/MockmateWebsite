import type { ProblemComplexityKnowledge } from "../../types"

export const bestTimeBuySellComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-best-time-buy-sell",
  leetcodeNumber: 121,
  slug: "best-time-to-buy-and-sell-stock",
  problemTitle: "Best Time to Buy and Sell Stock",
  sourceUrl: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",
  difficulty: "Easy",
  tags: ["Array", "Dynamic Programming"],
  approaches: [
    {
      name: "One Pass (Track Minimum)",
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      tradeOff: "Optimal - simple tracking approach",
      whenToUse: "Always - this is the standard approach",
      codePattern: "Track min price seen, calculate max profit at each point",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
    {
      name: "Brute Force",
      timeComplexity: "O(n^2)",
      spaceComplexity: "O(1)",
      tradeOff: "Simple but too slow",
      whenToUse: "Only for understanding",
      codePattern: "Check all buy-sell pairs",
      isOptimalTime: false,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Not understanding you must buy before selling",
    "Returning negative profit instead of 0",
    "Using max price instead of tracking min price",
  ],
  keyOperations: [
    { operation: "Update minimum", complexity: "O(1)" },
    { operation: "Calculate profit", complexity: "O(1)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
