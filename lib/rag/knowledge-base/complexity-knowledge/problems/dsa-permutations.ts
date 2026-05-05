import type { ProblemComplexityKnowledge } from "../../types"

export const permutationsComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-permutations",
  leetcodeNumber: 46,
  slug: "permutations",
  problemTitle: "Permutations",
  sourceUrl: "https://leetcode.com/problems/permutations/",
  difficulty: "Medium",
  tags: ["Array", "Backtracking"],
  approaches: [
    {
      name: "Backtracking with Visited Set",
      timeComplexity: "O(n * n!)",
      spaceComplexity: "O(n)",
      tradeOff: "Standard approach using visited tracking",
      whenToUse: "Clear and easy to understand",
      codePattern: "Try each unused element at each position",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
    {
      name: "Backtracking with Swap",
      timeComplexity: "O(n * n!)",
      spaceComplexity: "O(n)",
      tradeOff: "In-place but harder to understand",
      whenToUse: "When minimizing space usage",
      codePattern: "Swap elements into position, recurse, swap back",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Not backtracking (forgetting to undo changes)",
    "Using wrong termination condition",
    "Not understanding n! permutations exist",
  ],
  keyOperations: [
    { operation: "Generate each permutation", complexity: "O(n)" },
    { operation: "Total permutations", complexity: "O(n!)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
