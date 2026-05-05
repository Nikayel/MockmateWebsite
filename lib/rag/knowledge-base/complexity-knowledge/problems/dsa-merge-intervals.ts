import type { ProblemComplexityKnowledge } from "../../types"

export const mergeIntervalsComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-merge-intervals",
  leetcodeNumber: 56,
  slug: "merge-intervals",
  problemTitle: "Merge Intervals",
  sourceUrl: "https://leetcode.com/problems/merge-intervals/editorial/",
  difficulty: "Medium",
  tags: ["Array", "Sorting"],
  approaches: [
    {
      name: "Sorting",
      timeComplexity: "O(n log n)",
      spaceComplexity: "O(log n)",
      tradeOff: "Optimal - sorting dominates",
      whenToUse: "Standard approach for interval merging",
      codePattern: "Sort by start, merge overlapping intervals",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "leetcode-editorial",
    },
    {
      name: "Connected Components",
      timeComplexity: "O(n^2)",
      spaceComplexity: "O(n^2)",
      tradeOff: "Graph-based but slower",
      whenToUse: "Only for understanding",
      codePattern: "Build overlap graph, find connected components",
      isOptimalTime: false,
      isOptimalSpace: false,
      source: "leetcode-editorial",
    },
  ],
  commonMistakes: [
    "Not sorting first",
    "Wrong merge condition (should be end >= start, not >)",
    "Not updating end correctly (max of both ends)",
  ],
  keyOperations: [
    { operation: "Sorting", complexity: "O(n log n)" },
    { operation: "Merge pass", complexity: "O(n)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "leetcode-editorial",
}
