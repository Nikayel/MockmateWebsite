import type { ProblemComplexityKnowledge } from "../../types"

export const validPalindromeComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-valid-palindrome",
  leetcodeNumber: 125,
  slug: "valid-palindrome",
  problemTitle: "Valid Palindrome",
  sourceUrl: "https://leetcode.com/problems/valid-palindrome/",
  difficulty: "Easy",
  tags: ["Two Pointers", "String"],
  approaches: [
    {
      name: "Two Pointers",
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      tradeOff: "Optimal in every way for this problem",
      whenToUse: "Always - this is the standard approach",
      codePattern: "Left and right pointers moving toward center",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
    {
      name: "Reverse and Compare",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      tradeOff: "Simple but uses extra space for reversed string",
      whenToUse: "When code simplicity matters more than space",
      codePattern: "Filter alphanumeric, compare with reverse",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Forgetting to skip non-alphanumeric characters",
    "Not handling case insensitivity",
    "Creating new string instead of using pointers (wastes O(n) space)",
  ],
  keyOperations: [
    { operation: "Character comparison", complexity: "O(1)" },
    { operation: "Pointer movement", complexity: "O(n) total" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
