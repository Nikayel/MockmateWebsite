import type { ProblemComplexityKnowledge } from "../../types"

export const validAnagramComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-valid-anagram",
  leetcodeNumber: 242,
  slug: "valid-anagram",
  problemTitle: "Valid Anagram",
  sourceUrl: "https://leetcode.com/problems/valid-anagram/",
  difficulty: "Easy",
  tags: ["Hash Table", "String", "Sorting"],
  approaches: [
    {
      name: "Character Count (Hash Map)",
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      tradeOff: "Fast and bounded space (26 letters)",
      whenToUse: "Preferred approach - O(1) space for lowercase letters only",
      codePattern: "Count chars in first string, decrement for second",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
    {
      name: "Sorting",
      timeComplexity: "O(n log n)",
      spaceComplexity: "O(n)",
      tradeOff: "Simple but slower due to sorting",
      whenToUse: "When code simplicity matters more than performance",
      codePattern: "Sort both strings, compare",
      isOptimalTime: false,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Saying O(n) space for hash map when only 26 letters possible (it's O(1))",
    "Not considering Unicode - changes space from O(1) to O(k) where k is charset size",
  ],
  keyOperations: [
    { operation: "Character count array access", complexity: "O(1)" },
    { operation: "String iteration", complexity: "O(n)" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
