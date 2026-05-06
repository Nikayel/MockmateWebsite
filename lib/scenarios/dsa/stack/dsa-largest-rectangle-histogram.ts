import type { DSAScenario } from "../../types"

export const dsaLargestRectangleHistogramScenario: DSAScenario = {
  id: "dsa-largest-rectangle-histogram",
  title: "Largest Rectangle in Histogram",
  type: "dsa",
  pattern: "stack",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
  description: "Find the largest rectangular area in a histogram",
  tags: ["stack", "monotonic-stack", "array"],
  estimatedTime: 35,
  problemStatement: `Given an array of integers heights representing the histogram's bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.`,
  examples: [
    {
      input: "heights = [2,1,5,6,2,3]",
      output: "10",
      explanation: "The largest rectangle has area = 10 (bars at index 2 and 3 with height 5).",
    },
    {
      input: "heights = [2,4]",
      output: "4",
    },
  ],
  constraints: ["1 <= heights.length <= 10^5", "0 <= heights[i] <= 10^4"],
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
