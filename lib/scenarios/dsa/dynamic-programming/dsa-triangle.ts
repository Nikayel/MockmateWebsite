import type { DSAScenario } from "../../types"

export const triangleScenario: DSAScenario = {
  id: "dsa-triangle",
  title: "Triangle",
  type: "dsa",
  pattern: "dp-2d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Microsoft"],
  description: "Descend a triangle of numbers along adjacent cells for the cheapest total",
  tags: ["dynamic-programming", "array"],
  estimatedTime: 25,
  problemStatement: `You're given a triangle array: the top row holds a single number, and each row after it holds one number more than the row above. Starting at the apex you descend one row per step. From index i of the current row, the only legal landings are index i or index i + 1 of the row below.

\`\`\`
   3
  5 1
 7 2 6
4 9 1 5
\`\`\`

Here the cheapest descent picks up 3, 1, 2, then 1 for a total of 7. Return the smallest total any legal descent through triangle can reach.`,
  examples: [
    {
      input: "triangle = [[3],[5,1],[7,2,6],[4,9,1,5]]",
      output: "7",
      explanation: "The route 3 → 1 → 2 → 1 hugs the cheap side and totals 7.",
    },
    {
      input: "triangle = [[-7]]",
      output: "-7",
    },
  ],
  constraints: [
    "triangle has between 1 and 200 rows.",
    "Row 0 holds exactly 1 value.",
    "Each later row holds 1 more value than the one above it, so row i holds i + 1 values.",
    "Values range from -10^4 to 10^4.",
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
    // Above, each row's smallest value happened to sit on the best path, so summing the row
    // minima matched, and stepping to the cheaper neighbour each time did too. Here the
    // cheap 2 leads into a wall of 9s while the expensive 9 opens onto the 1.
    {
      input: {
        triangle: [[1], [2, 9], [9, 9, 1]],
      },
      expected: 11,
      description: "Cheaper next step leads to the worse total",
    },
  ],
}
