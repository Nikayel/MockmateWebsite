import type { DSAPatternKnowledge } from "../../types"

export const dp1dKnowledge: DSAPatternKnowledge = {
  pattern: "dp-1d",
  displayName: "Dynamic Programming (1D)",
  description:
    "Break problem into overlapping subproblems. Store solutions to avoid recomputation. Start with recurrence relation, then optimize.",
  whenToUse: [
    "Counting ways to reach a goal",
    "Optimization problems (min/max)",
    "Problems with optimal substructure",
    "Fibonacci-like sequences",
    "String problems with substring dependencies",
  ],
  keyInsights: [
    "Define state clearly: what does dp[i] represent?",
    "Find recurrence relation: how does dp[i] relate to previous states?",
    "Identify base cases carefully",
    "Often can optimize from O(n) space to O(1)",
  ],
  commonMistakes: [
    "Wrong state definition",
    "Missing base cases",
    "Incorrect iteration order",
    "Off-by-one errors in array indices",
  ],
  timeComplexity: {
    typical: "O(n)",
    best: "O(1) with memoization for repeated queries",
    worst: "O(n²) for some variations",
  },
  spaceComplexity: {
    typical: "O(n), optimizable to O(1)",
    notes: "Space can often be reduced by only keeping needed states",
  },
  relatedPatterns: ["dp-2d", "arrays-hashing"],
  prerequisites: ["arrays-hashing"],
  codeTemplate: `def dp_solution(n):
  # Base cases
  dp = [0] * (n + 1)
  dp[0] = base_case_0
  dp[1] = base_case_1

  # Fill DP table
  for i in range(2, n + 1):
      dp[i] = recurrence(dp[i-1], dp[i-2], ...)

  return dp[n]`,
  examples: ["Climbing Stairs", "House Robber", "Coin Change", "Longest Increasing Subsequence"],
  interviewTips: [
    "Start with brute force recursion, then memoize",
    "Clearly explain your state definition",
    "Walk through small examples to verify recurrence",
  ],
}
