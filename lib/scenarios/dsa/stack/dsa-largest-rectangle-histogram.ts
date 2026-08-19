import type { DSAScenario } from "../../types"

export const dsaLargestRectangleHistogramScenario: DSAScenario = {
  id: "dsa-largest-rectangle-histogram",
  title: "Largest Rectangle in Histogram",
  type: "dsa",
  pattern: "stack",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
  description: "Find the largest rectangular area in a histogram",
  tags: ["stack", "array", "monotonic-stack"],
  estimatedTime: 35,
  problemStatement: `You're looking at a histogram described by the integer array heights: heights[i] is how tall the ith bar stands, every bar is exactly 1 unit wide, and the bars sit side by side on a common baseline.

Work out the area of the biggest rectangle that can be drawn entirely within the histogram's bars, and return it.`,
  examples: [
    {
      input: "heights = [3,1,4,5,4,2]",
      output: "12",
      explanation:
        "A rectangle of height 4 stretches across the three middle bars (4, 5, 4), giving area 12.",
    },
    {
      input: "heights = [5,3]",
      output: "6",
    },
  ],
  constraints: [
    "heights contains from 1 to 10^5 bars",
    "each bar's height lies between 0 and 10^4",
  ],
  hints: [
    "Use a monotonic increasing stack",
    "When you encounter a smaller bar, calculate areas for bars that can't extend further",
    "Track the width using indices on the stack",
  ],
  starterCode: {
    javascript: `function largestRectangleArea(heights) {
  // Write your solution here

}`,
    typescript: `function largestRectangleArea(heights: number[]): number {
  // Write your solution here

}`,
    python: `def largest_rectangle_area(heights):
    # Write your solution here
    pass`,
    java: `class Solution {
    public int largestRectangleArea(int[] heights) {
        // Write your solution here
        return 0;
    }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(n)",
  },
  testCases: [
    { input: { heights: [2, 1, 5, 6, 2, 3] }, expected: 10, description: "Standard histogram" },
    { input: { heights: [2, 4] }, expected: 4, description: "Two bars" },
    { input: { heights: [1] }, expected: 1, description: "Single bar" },
    // Edge cases
    { input: { heights: [0, 0, 0] }, expected: 0, description: "Edge: All zeros" },
    { input: { heights: [5, 5, 5, 5] }, expected: 20, description: "Edge: All same height" },
    {
      input: { heights: [1, 2, 3, 4, 5] },
      expected: 9,
      description: "Edge: Strictly increasing",
    },
    {
      input: { heights: [5, 4, 3, 2, 1] },
      expected: 9,
      description: "Edge: Strictly decreasing",
    },
  ],
}
