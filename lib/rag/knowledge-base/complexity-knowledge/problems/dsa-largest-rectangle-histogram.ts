import type { ProblemComplexityKnowledge } from "../../types"

export const largestRectangleHistogramComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-largest-rectangle-histogram",
  leetcodeNumber: 84,
  slug: "largest-rectangle-in-histogram",
  problemTitle: "Largest Rectangle in Histogram",
  sourceUrl: "https://leetcode.com/problems/largest-rectangle-in-histogram/",
  difficulty: "Hard",
  tags: ["Array", "Stack", "Monotonic Stack"],
  approaches: [
    {
      name: "Monotonic Stack",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      tradeOff: "Optimal - each bar pushed and popped once",
      whenToUse: "Standard approach for this problem",
      codePattern: "Maintain increasing stack, compute area when popping",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
    {
      name: "Divide and Conquer",
      timeComplexity: "O(n log n)",
      spaceComplexity: "O(n)",
      tradeOff: "Alternative approach, worse average but intuitive",
      whenToUse: "If monotonic stack is confusing",
      codePattern: "Find min bar, recurse on left and right",
      isOptimalTime: false,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Not adding sentinel values (0) at ends",
    "Computing width incorrectly when popping",
    "Not handling equal heights correctly",
  ],
  keyOperations: [
    { operation: "Stack operations", complexity: "O(1)" },
    { operation: "Area calculation", complexity: "O(1)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
