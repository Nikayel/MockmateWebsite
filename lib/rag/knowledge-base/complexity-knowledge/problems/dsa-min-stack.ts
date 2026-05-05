import type { ProblemComplexityKnowledge } from "../../types"

export const minStackComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-min-stack",
  leetcodeNumber: 155,
  slug: "min-stack",
  problemTitle: "Min Stack",
  sourceUrl: "https://leetcode.com/problems/min-stack/",
  difficulty: "Medium",
  tags: ["Stack", "Design"],
  approaches: [
    {
      name: "Two Stacks",
      timeComplexity: "O(1)",
      spaceComplexity: "O(n)",
      tradeOff: "O(1) for all operations including getMin",
      whenToUse: "Standard approach - separate stack for minimums",
      codePattern: "Second stack tracks minimum at each level",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
    {
      name: "Single Stack with Pairs",
      timeComplexity: "O(1)",
      spaceComplexity: "O(n)",
      tradeOff: "Same complexity, stores (value, min) pairs",
      whenToUse: "Alternative if you prefer tuples",
      codePattern: "Each element stores value and current min",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Updating min stack only when new min (wrong - need for each push)",
    "Not handling equal values in min stack correctly",
  ],
  keyOperations: [{ operation: "All operations", complexity: "O(1)" }],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
