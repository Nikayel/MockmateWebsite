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
  problemStatement: `You're given an array height holding n non-negative integers, an elevation profile in which each value is a terrain bar exactly one unit wide. When rain falls, water settles into every basin that taller bars wall off on both sides.

Compute the total amount of water the profile retains.`,
  examples: [
    {
      input: "height = [0,2,0,3,1,0,1,4,2,0,3,1]",
      output: "13",
      explanation: "The basins between the taller bars hold 13 units of water in total.",
    },
    { input: "height = [3,1,0,4,2,5]", output: "7" },
  ],
  constraints: [
    "n equals height.length",
    "n falls between 1 and 2 * 10^4",
    "each height[i] sits between 0 and 10^5",
  ],
  hints: [
    "For each position, water = min(maxLeft, maxRight) - height",
    "Two pointers: track leftMax, rightMax, fill from lower side",
    "Stack: maintain decreasing monotonic stack, calculate water when popping",
    "DP: precompute leftMax[] and rightMax[] arrays",
  ],
  starterCode: {
    javascript: `function trap(height) {\n  // Write your solution here\n}`,
    typescript: `function trap(height: number[]): number {\n  // Write your solution here\n}`,
    python: `def trap(height: list[int]) -> int:\n    # Write your solution here\n    pass`,
    java: `class Solution {\n    public int trap(int[] height) {\n        // Write your solution here\n        return 0;\n    }\n}`,
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
