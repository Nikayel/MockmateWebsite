import type { DSAPatternKnowledge } from "../../types"

export const dp2dKnowledge: DSAPatternKnowledge = {
  pattern: "dp-2d",
  displayName: "Dynamic Programming (2D)",
  description:
    "DP with two dimensions, typically for string/grid problems. State depends on two variables. Common for edit distance, LCS, and grid paths.",
  whenToUse: [
    "Comparing two strings",
    "Grid-based problems",
    "Knapsack-style problems",
    "Longest common subsequence",
    "Edit distance calculations",
  ],
  keyInsights: [
    "State usually represents (i, j) position or (length1, length2)",
    "Draw the DP table to visualize relationships",
    "Often can be optimized to 1D by processing row by row",
    "Consider diagonal, row, or column dependencies",
  ],
  commonMistakes: [
    "Incorrect table dimensions",
    "Wrong initialization of first row/column",
    "Confusing rows and columns",
    "Forgetting to handle empty string/array cases",
  ],
  timeComplexity: {
    typical: "O(m × n)",
    best: "O(m × n)",
    worst: "O(m × n)",
  },
  spaceComplexity: {
    typical: "O(m × n), often optimizable to O(min(m, n))",
    notes: "Can often use rolling array technique",
  },
  relatedPatterns: ["dp-1d", "string"],
  prerequisites: ["dp-1d"],
  codeTemplate: `def dp_2d(s1, s2):
  m, n = len(s1), len(s2)
  dp = [[0] * (n + 1) for _ in range(m + 1)]

  # Base cases
  for i in range(m + 1):
      dp[i][0] = base_case_col
  for j in range(n + 1):
      dp[0][j] = base_case_row

  # Fill table
  for i in range(1, m + 1):
      for j in range(1, n + 1):
          dp[i][j] = recurrence(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])

  return dp[m][n]`,
  examples: ["Longest Common Subsequence", "Edit Distance", "Unique Paths", "Interleaving String"],
  interviewTips: [
    "Draw the DP table and fill in by hand first",
    "Explain what each cell represents",
    "Discuss space optimization if relevant",
  ],
}
