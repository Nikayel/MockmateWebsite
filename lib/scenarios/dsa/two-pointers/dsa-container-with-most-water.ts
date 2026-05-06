import type { DSAScenario } from "../../types"

export const dsaContainerWithMostWaterScenario: DSAScenario = {
  id: "dsa-container-with-most-water",
  title: "Container With Most Water",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description:
    "Find two lines that together with the x-axis form a container that holds the most water.",
  tags: ["array", "two-pointers", "greedy"],
  estimatedTime: 20,
  problemStatement: `Given n non-negative integers a1, a2, ..., an, where each represents a point at coordinate (i, ai). n vertical lines are drawn such that the two endpoints of the line i is at (i, ai) and (i, 0). Find two lines, which, together with the x-axis forms a container, such that the container contains the most water.

Notice that you may not slant the container.`,
  examples: [
    {
      input: "height = [1,8,6,2,5,4,8,3,7]",
      output: "49",
      explanation:
        "The maximum area is between index 1 and 8 (height 8 and 7), area = min(8,7) * (8-1) = 7 * 7 = 49",
    },
    {
      input: "height = [1,1]",
      output: "1",
      explanation: "Area = min(1,1) * (1-0) = 1",
    },
  ],
  constraints: ["n == height.length", "2 <= n <= 10^5", "0 <= height[i] <= 10^4"],
  hints: [
    "Use two pointers starting from both ends",
    "Move the pointer with smaller height inward",
    "Track maximum area seen so far",
  ],
  starterCode: {
    javascript: `function maxArea(height) {
  // Your code here
}`,
    python: `def maxArea(height):
    # Your code here
    pass`,
    typescript: `function maxArea(height: number[]): number {
  // Your code here
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { height: [1, 8, 6, 2, 5, 4, 8, 3, 7] },
      expected: 49,
      description: "Standard case with varying heights",
    },
    {
      input: { height: [1, 1] },
      expected: 1,
      description: "Minimum length array",
    },
    {
      input: { height: [4, 3, 2, 1, 4] },
      expected: 16,
      description: "First and last elements form max area",
    },
    {
      input: { height: [1, 2, 1] },
      expected: 2,
      description: "Small ascending then descending",
    },
    // Edge cases
    {
      input: { height: [5, 5, 5, 5] },
      expected: 15,
      description: "Edge: All same height (5 * 3 = 15)",
    },
    {
      input: { height: [1, 100, 1] },
      expected: 2,
      description: "Edge: Tall middle, short ends",
    },
  ],
}
