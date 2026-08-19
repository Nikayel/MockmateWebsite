import type { DSAScenario } from "../../types"

export const dsaTrappingRainWaterTwoPointersScenario: DSAScenario = {
  id: "dsa-trapping-rain-water-two-pointers",
  title: "Trapping Rain Water (Two Pointers)",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "hard",
  companies: ["Google", "Meta", "Amazon", "Microsoft"],
  description: "Work out how much rainwater settles between the bars of a height profile",
  tags: ["array", "two-pointers", "dynamic-programming", "stack"],
  estimatedTime: 30,
  problemStatement: `You're given an array height of n non-negative integers. Read it as the cross-section of a terrain: bar i is height[i] units tall and exactly one unit wide. When rain falls, water settles wherever lower bars sit between taller ones.

Return the total number of water units the terrain retains.`,
  examples: [
    {
      input: "height = [2,0,3,1,0,2,1,4]",
      output: "10",
      explanation: "This terrain retains 10 units of water.",
    },
    {
      input: "height = [6,1,4,2,5]",
      output: "8",
    },
  ],
  constraints: [
    "n equals the length of height",
    "n lies between 1 and 2 * 10^4",
    "each bar height sits between 0 and 10^5",
  ],
  hints: [
    "For each position, water level is determined by min(max_left, max_right) - height[i]",
    "Use two pointers from both ends",
    "Track the maximum heights seen so far from left and right",
  ],
  starterCode: {
    javascript: `function trap(height) {
  // Write your solution here

}`,
    typescript: `function trap(height: number[]): number {
  // Write your solution here

}`,
    python: `def trap(height):
    # Write your solution here
    pass`,
    java: `class Solution {
    public int trap(int[] height) {
        // Write your solution here
        return 0;
    }
}`,
    cpp: `class Solution {
public:
    int trap(vector<int>& height) {
        // Write your solution here
        return 0;
    }
};`,
    csharp: `public class Solution {
    public int Trap(int[] height) {
        // Write your solution here
        return 0;
    }
}`,
    go: `func trap(height []int) int {
    // Write your solution here
    return 0
}`,
    rust: `impl Solution {
    pub fn trap(height: Vec<i32>) -> i32 {
        // Write your solution here
        0
    }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { height: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] },
      expected: 6,
      description: "Example 1: Complex elevation",
    },
    {
      input: { height: [4, 2, 0, 3, 2, 5] },
      expected: 9,
      description: "Example 2: Another pattern",
    },
    {
      input: { height: [4, 2, 3] },
      expected: 1,
      description: "Small array with single trap",
    },
    {
      input: { height: [5, 4, 3, 2, 1] },
      expected: 0,
      description: "Descending - no water trapped",
    },
    // Edge cases
    {
      input: { height: [0, 0, 0] },
      expected: 0,
      description: "Edge: All zeros",
    },
    {
      input: { height: [5] },
      expected: 0,
      description: "Edge: Single bar",
    },
    {
      input: { height: [1, 2, 3, 4, 5] },
      expected: 0,
      description: "Edge: Strictly increasing (no trap)",
    },
    {
      input: { height: [3, 3, 3] },
      expected: 0,
      description: "Edge: All same height (no trap)",
    },
  ],
}
