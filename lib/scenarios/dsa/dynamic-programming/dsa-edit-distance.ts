import type { DSAScenario } from "../../types"

export const editDistanceScenario: DSAScenario = {
  id: "dsa-edit-distance",
  title: "Edit Distance",
  type: "dsa",
  pattern: "dp-2d",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Find minimum edit distance to convert one string to another.",
  tags: ["dynamic-programming", "string"],
  estimatedTime: 35,
  problemStatement: `Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2. You can insert, delete, or replace any character.`,
  examples: [
    {
      input: "word1 = horse, word2 = ros",
      output: "3",
      explanation: "horse -> rorse -> rose -> ros",
    },
    {
      input: "word1 = intention, word2 = execution",
      output: "5",
    },
  ],
  constraints: [
    "0 <= word1.length, word2.length <= 500",
    "word1 and word2 consist of lowercase English letters.",
  ],
  hints: [
    "2D DP: dp[i][j] = min operations to convert word1[0..i] to word2[0..j]",
    "If chars match: dp[i][j] = dp[i-1][j-1]",
    "Else: min of insert, delete, replace operations",
  ],
  starterCode: {
    javascript: `function minDistance(word1, word2) {
// Write your solution here

}`,
    python: `def minDistance(word1: str, word2: str) -> int:
  # Write your solution here
  pass`,
  },
  optimalComplexity: {
    time: "O(m * n)",
    space: "O(m * n)",
  },
  testCases: [
    {
      input: { word1: "horse", word2: "ros" },
      expected: 3,
      description: "horse -> rorse -> rose -> ros",
    },
    {
      input: { word1: "intention", word2: "execution" },
      expected: 5,
      description: "Classic example",
    },
    {
      input: { word1: "", word2: "" },
      expected: 0,
      description: "Both empty strings",
    },
    {
      input: { word1: "abc", word2: "abc" },
      expected: 0,
      description: "Identical strings",
    },
    {
      input: { word1: "abc", word2: "" },
      expected: 3,
      description: "Delete all characters",
    },
  ],
}
