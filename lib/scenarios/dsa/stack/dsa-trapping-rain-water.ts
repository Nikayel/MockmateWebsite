import type { DSAScenario } from "../../types"

export const dsaTrappingRainWaterScenario: DSAScenario = {
  id: "dsa-trapping-rain-water",
  title: "Trapping Rain Water",
  type: "dsa",
  pattern: "stack",
  difficulty: "hard",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple", "Goldman Sachs", "Bloomberg"],
  description: "Calculate how much water can be trapped after rain",
  tags: ["stack", "two-pointers", "dynamic-programming", "monotonic-stack"],
  estimatedTime: 30,
  problemStatement: `Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.`,
  examples: [
    {
      input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
      output: "6",
      explanation: "The elevation map traps 6 units of rain water.",
    },
    { input: "height = [4,2,0,3,2,5]", output: "9" },
  ],
  constraints: ["n == height.length", "1 <= n <= 2 * 10^4", "0 <= height[i] <= 10^5"],
  hints: [
    "For each position, water = min(maxLeft, maxRight) - height",
    "Two pointers: track leftMax, rightMax, fill from lower side",
    "Stack: maintain decreasing monotonic stack, calculate water when popping",
    "DP: precompute leftMax[] and rightMax[] arrays",
  ],
  starterCode: {
    javascript: `function trap(height) {\n  // Use two pointers or stack\n}`,
    typescript: `function trap(height: number[]): number {\n  // Use two pointers or stack\n}`,
    python: `def trap(height: list[int]) -> int:\n    # Use two pointers or stack\n    pass`,
    java: `class Solution {\n    public int trap(int[] height) {\n        // Use two pointers or stack\n        return 0;\n    }\n}`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1) with two pointers" },
  testCases: [
    {
      input: { height: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] },
      expected: 6,
      description: "Standard case",
    },
    { input: { height: [4, 2, 0, 3, 2, 5] }, expected: 9, description: "Valley in middle" },
    { input: { height: [1, 2, 3, 4, 5] }, expected: 0, description: "Ascending - no water" },
  ],
}
