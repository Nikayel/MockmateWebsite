import type { DSAScenario } from "../../types"

export const dsaContainerWithMostWaterScenario: DSAScenario = {
  id: "dsa-container-with-most-water",
  title: "Container With Most Water",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta"],
  description: "Choose two heights that hold the biggest possible area of water between them.",
  tags: ["array", "two-pointers", "greedy"],
  estimatedTime: 20,
  problemStatement: `You're given an integer array height with n non-negative entries. Each entry describes a vertical wall rising from the point (i, 0) up to (i, height[i]). Pick the pair of walls that, along with the x-axis between them, would enclose the biggest possible pool of water, and return how much water that pool holds.

The walls stay upright: tilting the container is not allowed.`,
  examples: [
    {
      input: "height = [2,6,4,9,3,7,1,5]",
      output: "30",
      explanation:
        "The best pair sits at index 1 and index 7 (heights 6 and 5), area = min(6,5) * (7-1) = 5 * 6 = 30",
    },
    {
      input: "height = [3,4]",
      output: "3",
      explanation: "Area = min(3,4) * (1-0) = 3",
    },
  ],
  constraints: [
    "n equals the length of height",
    "height holds between 2 and 10^5 entries",
    "each height[i] lies between 0 and 10^4",
  ],
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
