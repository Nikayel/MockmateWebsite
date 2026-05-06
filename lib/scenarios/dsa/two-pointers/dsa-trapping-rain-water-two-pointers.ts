import type { DSAScenario } from "../../types"

export const dsaTrappingRainWaterTwoPointersScenario: DSAScenario = {
  id: "dsa-trapping-rain-water-two-pointers",
  title: "Trapping Rain Water (Two Pointers)",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "hard",
  companies: ["Google", "Meta", "Amazon", "Microsoft"],
  description: "Calculate how much water can be trapped after raining given an elevation map",
  tags: ["array", "two-pointers", "dynamic-programming", "stack"],
  estimatedTime: 30,
  problemStatement: `Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.`,
  examples: [
    {
      input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
      output: "6",
      explanation: "The elevation map traps 6 units of rain water.",
    },
    {
      input: "height = [4,2,0,3,2,5]",
      output: "9",
    },
  ],
  constraints: ["n == height.length", "1 <= n <= 2 * 10^4", "0 <= height[i] <= 10^5"],
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
