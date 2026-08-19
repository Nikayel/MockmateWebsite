import type { DSAScenario } from "../../types"

export const maximalSquareScenario: DSAScenario = {
  id: "dsa-maximal-square",
  title: "Maximal Square",
  type: "dsa",
  pattern: "dp-2d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Apple"],
  description: "Measure the largest all-1's square block hiding in a binary grid",
  tags: ["matrix", "dynamic-programming"],
  estimatedTime: 25,
  problemStatement: `You're given an m x n matrix of characters where every cell is either '1' or '0'. Somewhere inside it hides the biggest square block built entirely from '1' cells, and your job is to size that block.

Return its area rather than its side length: a lone '1' counts as a square of area 1, and a grid with no '1' anywhere yields 0.`,
  examples: [
    {
      input:
        'matrix = [["1","1","1","0","1"],["1","1","1","1","0"],["1","1","1","0","1"],["0","1","1","0","0"]]',
      output: "9",
      explanation: "A 3 x 3 block of 1's sits in the top-left corner, so the area is 9.",
    },
    {
      input: 'matrix = [["0","1","0"],["1","0","1"]]',
      output: "1",
    },
    {
      input: 'matrix = [["0","0"],["0","0"]]',
      output: "0",
    },
  ],
  constraints: [
    "matrix is an m x n grid of characters.",
    "m and n each fall in the range 1 to 300.",
    "Each cell is the character '0' or the character '1'.",
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
