import type { ProblemComplexityKnowledge } from "../../types"

export const combinationSumComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-combination-sum",
  leetcodeNumber: 39,
  slug: "combination-sum",
  problemTitle: "Combination Sum",
  sourceUrl: "https://leetcode.com/problems/combination-sum/",
  difficulty: "Medium",
  tags: ["Array", "Backtracking"],
  approaches: [
    {
      name: "Backtracking",
      timeComplexity: "O(n^(target/min))",
      spaceComplexity: "O(target/min)",
      tradeOff: "Standard backtracking, depth depends on target",
      whenToUse: "Classic approach for this type of problem",
      codePattern: "Try each candidate, recurse with reduced target",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Generating duplicates by not using start index",
    "Not sorting candidates first (optional optimization)",
    "Wrong base case (target == 0 vs target < 0)",
  ],
  keyOperations: [
    { operation: "Backtracking recursion", complexity: "exponential in worst case" },
    { operation: "Path copy for result", complexity: "O(k) where k is path length" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
