import type { ProblemComplexityKnowledge } from "../../types"

export const longestIncreasingSubseqComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-longest-increasing-subseq",
  leetcodeNumber: 300,
  slug: "longest-increasing-subsequence",
  problemTitle: "Longest Increasing Subsequence",
  sourceUrl: "https://leetcode.com/problems/longest-increasing-subsequence/",
  difficulty: "Medium",
  tags: ["Array", "Binary Search", "Dynamic Programming"],
  approaches: [
    {
      name: "DP",
      timeComplexity: "O(n^2)",
      spaceComplexity: "O(n)",
      tradeOff: "Simple to understand and implement",
      whenToUse: "When O(n^2) is acceptable",
      codePattern: "dp[i] = max LIS ending at index i",
      isOptimalTime: false,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
    {
      name: "Binary Search (Patience Sorting)",
      timeComplexity: "O(n log n)",
      spaceComplexity: "O(n)",
      tradeOff: "Optimal time but trickier to understand",
      whenToUse: "When O(n log n) is required",
      codePattern: "Maintain sorted array, binary search for position",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Binary search approach doesn't give actual LIS, just length",
    "Wrong comparison (strictly increasing)",
    "Not initializing DP array to 1",
  ],
  keyOperations: [
    { operation: "DP inner loop", complexity: "O(n)" },
    { operation: "Binary search", complexity: "O(log n)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
