import type { ProblemComplexityKnowledge } from "../../types"

export const romanToIntegerComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-roman-to-integer",
  leetcodeNumber: 13,
  slug: "roman-to-integer",
  problemTitle: "Roman to Integer",
  sourceUrl: "https://leetcode.com/problems/roman-to-integer/",
  difficulty: "Easy",
  tags: ["Hash Table", "Math", "String"],
  approaches: [
    {
      name: "Left-to-Right with Lookahead",
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      tradeOff: "Simple iteration comparing current with next character",
      whenToUse: "Standard approach - compare current vs next to decide add/subtract",
      codePattern: "If current < next, subtract; otherwise add",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "leetcode-editorial",
    },
    {
      name: "Right-to-Left Scan",
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      tradeOff: "Process from end, simpler logic for some",
      whenToUse: "Alternative approach - some find this more intuitive",
      codePattern: "Track previous value, add or subtract based on comparison",
      isOptimalTime: true,
      isOptimalSpace: true,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Claiming O(n) when max input length is 15 (technically O(1) bounded)",
    "Not handling all six subtraction cases (IV, IX, XL, XC, CD, CM)",
    "Using excessive space for the symbol mapping (should be O(1) fixed 7 elements)",
  ],
  keyOperations: [
    { operation: "Hash map lookup", complexity: "O(1)", note: "Fixed 7 Roman numerals" },
    { operation: "String iteration", complexity: "O(n)", note: "Max 15 chars, so O(1) bounded" },
    { operation: "Comparison", complexity: "O(1)" },
  ],
  verified: true,
  verifiedAt: "2026-01-14",
  verificationSource: "leetcode-editorial",
}
