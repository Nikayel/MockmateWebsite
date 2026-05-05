import type { ProblemComplexityKnowledge } from "../../types"

export const groupAnagramsComplexity: ProblemComplexityKnowledge = {
  problemId: "dsa-group-anagrams",
  leetcodeNumber: 49,
  slug: "group-anagrams",
  problemTitle: "Group Anagrams",
  sourceUrl: "https://leetcode.com/problems/group-anagrams/",
  difficulty: "Medium",
  tags: ["Array", "Hash Table", "String", "Sorting"],
  approaches: [
    {
      name: "Sorted String as Key",
      timeComplexity: "O(n * k log k)",
      spaceComplexity: "O(n * k)",
      tradeOff: "Simple to implement, sorting each string",
      whenToUse: "When strings are short or code clarity is priority",
      codePattern: "Use sorted string as hash map key",
      isOptimalTime: false,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
    {
      name: "Character Count as Key",
      timeComplexity: "O(n * k)",
      spaceComplexity: "O(n * k)",
      tradeOff: "Faster but more complex key generation",
      whenToUse: "When strings are long - avoids k log k sorting",
      codePattern: "Use character count tuple/string as hash key",
      isOptimalTime: true,
      isOptimalSpace: false,
      source: "algorithm-textbook",
    },
  ],
  commonMistakes: [
    "Forgetting the k factor - k is average string length",
    "Not accounting for the space to store all strings in result",
  ],
  keyOperations: [
    { operation: "Sort string of length k", complexity: "O(k log k)" },
    { operation: "Character count of string", complexity: "O(k)" },
    { operation: "Hash map operations", complexity: "O(1) average" },
  ],
  verified: true,
  verifiedAt: "2026-01-13",
  verificationSource: "algorithm-textbook",
}
