import type { DSAScenario } from "../../types"

export const maximalSquareScenario: DSAScenario = {
  id: "dsa-maximal-square",
  title: "Maximal Square",
  type: "dsa",
  pattern: "dp-2d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Apple"],
  description: "Find the largest square containing only 1's",
  tags: ["dynamic-programming", "matrix"],
  estimatedTime: 25,
  problemStatement: `Given an m x n binary matrix filled with 0's and 1's, find the largest square containing only 1's and return its area.`,
  examples: [
    {
      input:
        'matrix = [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]',
      output: "4",
      explanation: "The largest square has side length 2.",
    },
    {
      input: 'matrix = [["0","1"],["1","0"]]',
      output: "1",
    },
    {
      input: 'matrix = [["0"]]',
      output: "0",
    },
  ],
  constraints: [
    "m == matrix.length",
    "n == matrix[i].length",
    "1 <= m, n <= 300",
    "matrix[i][j] is '0' or '1'.",
  ],
  hints: [
    "dp[i][j] = side length of largest square with bottom-right corner at (i,j)",
    "If matrix[i][j] == '1': dp[i][j] = min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1",
    "Track maximum side length seen",
    "Return maxSide^2",
  ],
  starterCode: {
    javascript: `function maximalSquare(matrix) {
// Write your solution here

}`,
    typescript: `function maximalSquare(matrix: string[][]): number {
// Write your solution here

}`,
    python: `def maximalSquare(matrix):
  # Write your solution here
  pass`,
  },
  optimalComplexity: { time: "O(m * n)", space: "O(n)" },
  testCases: [
    {
      input: {
        matrix: [
          ["1", "0", "1", "0", "0"],
          ["1", "0", "1", "1", "1"],
          ["1", "1", "1", "1", "1"],
          ["1", "0", "0", "1", "0"],
        ],
      },
      expected: 4,
      description: "2x2 square",
    },
    {
      input: {
        matrix: [
          ["0", "1"],
          ["1", "0"],
        ],
      },
      expected: 1,
      description: "1x1 squares only",
    },
    { input: { matrix: [["0"]] }, expected: 0, description: "No 1's" },
    { input: { matrix: [["1"]] }, expected: 1, description: "Single 1" },
  ],
}
