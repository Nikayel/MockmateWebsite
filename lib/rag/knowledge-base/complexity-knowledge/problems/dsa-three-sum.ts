import type { ProblemComplexityKnowledge } from "../../types"

export const threeSumComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-three-sum",
  leetcodeNumber: 15,
  slug: "3sum",
  problemTitle: "3Sum",
  sourceUrl: "https://leetcode.com/problems/3sum/",
  difficulty: "Medium",
  tags: ["Array", "Two Pointers", "Sorting"],
  approaches: [
    {
      name: "Sort + Two Pointers",
      timeComplexity: "O(n^2)",
      spaceComplexity: "O(1)",
      tradeOff: "Best known approach - can't do better than O(n^2)",
      whenToUse: "Standard approach - sort enables two-pointer technique",
      codePattern: "Fix one element, two-pointer search for other two",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
    {
      name: "Hash Set",
      timeComplexity: "O(n^2)",
      spaceComplexity: "O(n)",
      tradeOff: "Same time but uses more space, avoiding sort",
      whenToUse: "When you can't modify the input array",
      codePattern: "For each pair, check if complement exists in set",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Not handling duplicate triplets",
    "Forgetting to skip duplicate values when iterating",
    "Not sorting first (required for two-pointer technique)",
  ],
  keyOperations: [
    { operation: "Sorting", complexity: "O(n log n)" },
    { operation: "Two-pointer search", complexity: "O(n)" },
    { operation: "Overall", complexity: "O(n) * O(n) = O(n^2)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
