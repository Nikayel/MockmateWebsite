import type { ProblemComplexityKnowledge } from "../../types"

export const houseRobberComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-house-robber",
  leetcodeNumber: 198,
  slug: "house-robber",
  problemTitle: "House Robber",
  sourceUrl: "https://leetcode.com/problems/house-robber/",
  difficulty: "Medium",
  tags: ["Array", "Dynamic Programming"],
  approaches: [
    {
      name: "DP with Space Optimization",
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      tradeOff: "Optimal - only track two previous values",
      whenToUse: "Preferred approach",
      codePattern: "dp[i] = max(dp[i-2] + nums[i], dp[i-1])",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
    {
      name: "DP with Array",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      tradeOff: "Easier to understand but uses more space",
      whenToUse: "When explaining the recurrence",
      codePattern: "Full DP array storing max at each house",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Not handling base cases (0, 1, 2 houses)",
    "Wrong recurrence - must skip adjacent",
  ],
  keyOperations: [
    { operation: "State transition", complexity: "O(1)" },
    { operation: "Array iteration", complexity: "O(n)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
