import type { ProblemComplexityKnowledge } from "../../types"

export const productExceptSelfComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-product-except-self",
  leetcodeNumber: 238,
  slug: "product-of-array-except-self",
  problemTitle: "Product of Array Except Self",
  sourceUrl: "https://leetcode.com/problems/product-of-array-except-self/",
  difficulty: "Medium",
  tags: ["Array", "Prefix Sum"],
  approaches: [
    {
      name: "Left and Right Arrays",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      tradeOff: "Clear to understand but uses extra arrays",
      whenToUse: "When code clarity is priority",
      codePattern: "Build prefix and suffix product arrays separately",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
    {
      name: "Space Optimized (Output Array)",
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      tradeOff: "Uses output array for left products, single var for right",
      whenToUse: "When space optimization is needed (output doesn't count)",
      codePattern: "Two passes: left products in output, then multiply right",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Using division (problem explicitly forbids it)",
    "Forgetting to handle zeros in the array",
    "Not realizing output array doesn't count toward space complexity",
  ],
  keyOperations: [
    { operation: "Prefix product calculation", complexity: "O(n)" },
    { operation: "Suffix product calculation", complexity: "O(n)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
