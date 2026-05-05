import type { ProblemComplexityKnowledge } from "../../types"

export const insertIntervalComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-insert-interval",
  leetcodeNumber: 57,
  slug: "insert-interval",
  problemTitle: "Insert Interval",
  sourceUrl: "https://leetcode.com/problems/insert-interval/",
  difficulty: "Medium",
  tags: ["Array"],
  approaches: [
    {
      name: "Linear Scan",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      tradeOff: "Optimal - single pass through intervals",
      whenToUse: "Standard approach",
      codePattern: "Add non-overlapping before, merge overlapping, add rest",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
    {
      name: "Binary Search + Insert",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      tradeOff: "Faster to find position but still O(n) for result",
      whenToUse: "When showing binary search skills",
      codePattern: "Binary search for insert position, then merge",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Merging when intervals only touch (depends on problem definition)",
    "Not handling empty input correctly",
    "Wrong merge logic",
  ],
  keyOperations: [
    { operation: "Interval comparison", complexity: "O(1)" },
    { operation: "Single pass", complexity: "O(n)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
