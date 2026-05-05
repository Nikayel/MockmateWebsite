import type { DSAScenario } from "../../types"

export const triangleScenario: DSAScenario = {
  id: "dsa-triangle",
  title: "Triangle",
  type: "dsa",
  pattern: "dp-2d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Microsoft"],
  description: "Find minimum path sum from top to bottom of triangle",
  tags: ["dynamic-programming", "array"],
  estimatedTime: 25,
  problemStatement: `Given a triangle array, return the minimum path sum from top to bottom.

For each step, you may move to an adjacent number of the row below. More formally, if you are on index i on the current row, you may move to either index i or index i + 1 on the next row.`,
  examples: [
    {
      input: "triangle = [[2],[3,4],[6,5,7],[4,1,8,3]]",
      output: "11",
      explanation: "The minimum path sum from top to bottom is 2 + 3 + 5 + 1 = 11.",
    },
    {
      input: "triangle = [[-10]]",
      output: "-10",
    },
  ],
  constraints: [
    "1 <= triangle.length <= 200",
    "triangle[0].length == 1",
    "triangle[i].length == triangle[i - 1].length + 1",
    "-10^4 <= triangle[i][j] <= 10^4",
  ],
  hints: [
    "Work bottom-up: start from second-to-last row",
    "dp[i] = min path sum from row to bottom",
    "dp[i] = triangle[row][i] + min(dp[i], dp[i+1])",
    "O(n) space by reusing bottom row",
  ],
  starterCode: {
    javascript: `function minimumTotal(triangle) {
// Write your solution here

}`,
    typescript: `function minimumTotal(triangle: number[][]): number {
// Write your solution here

}`,
    python: `def minimumTotal(triangle):
  # Write your solution here
  pass`,
  },
  optimalComplexity: { time: "O(n^2)", space: "O(n)" },
  testCases: [
    {
      input: { triangle: [[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]] },
      expected: 11,
      description: "Standard triangle",
    },
    { input: { triangle: [[-10]] }, expected: -10, description: "Single element" },
    { input: { triangle: [[2], [3, 4]] }, expected: 5, description: "Two rows" },
  ],
}
