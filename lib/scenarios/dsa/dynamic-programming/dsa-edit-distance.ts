import type { DSAScenario } from "../../types"

export const editDistanceScenario: DSAScenario = {
  id: "dsa-edit-distance",
  title: "Edit Distance",
  type: "dsa",
  pattern: "dp-2d",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta", "Microsoft"],
  description: "Find minimum edit distance to convert one string to another.",
  tags: ["string", "dynamic-programming"],
  estimatedTime: 35,
  problemStatement: `You're given two strings, word1 and word2, and the goal is to transform word1 until it reads exactly like word2. One operation is a single edit: insert a character anywhere, delete one character, or replace one character with a different one.

Return the smallest number of operations that gets word1 all the way to word2.`,
  examples: [
    {
      input: "word1 = plane, word2 = lanes",
      output: "2",
      explanation: "plane -> lane -> lanes",
    },
    {
      input: "word1 = ocean, word2 = canoe",
      output: "4",
    },
  ],
  constraints: [
    "word1.length and word2.length each run from 0 to 500",
    "both word1 and word2 use lowercase English letters only",
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
