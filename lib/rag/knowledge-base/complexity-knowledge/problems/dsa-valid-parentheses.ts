import type { ProblemComplexityKnowledge } from "../../types"

export const validParenthesesComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-valid-parentheses",
  leetcodeNumber: 20,
  slug: "valid-parentheses",
  problemTitle: "Valid Parentheses",
  sourceUrl: "https://leetcode.com/problems/valid-parentheses/",
  difficulty: "Easy",
  tags: ["String", "Stack"],
  approaches: [
    {
      name: "Stack",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      tradeOff: "Optimal for this type of problem",
      whenToUse: "Always - classic stack application",
      codePattern: "Push opening brackets, pop and match closing",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Not checking if stack is empty before popping",
    "Forgetting to check stack is empty at end (unmatched opens)",
    "Using wrong mapping for bracket pairs",
  ],
  keyOperations: [
    { operation: "Stack push/pop", complexity: "O(1)" },
    { operation: "String traversal", complexity: "O(n)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
